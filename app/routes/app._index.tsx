import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate, useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  BlockStack,
  EmptyState,
  Banner,
  Text,
  Card,
  InlineStack,
  Button,
  Badge,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate, BASIC_PLAN } from "../shopify.server";
import { ensureStore } from "../lib/db/store.server";
import { getLegalPages, getLegalPage, markDeletedOnShopify, updateLegalPageVersion } from "../lib/db/legalPage.server";
import { PageCard } from "../components/dashboard/PageCard";
import { withRetry, hasRetryableGraphQLError } from "../lib/shopify/retry.server";
import { checkPlanAccess, IS_TEST_BILLING } from "../lib/requirePlan.server";
import type { BillingCheckContext } from "../lib/requirePlan.server";
import { getAllPageTypes, getPageTypeConfig, getTemplateUpdates } from "../lib/pageTypes/registry";
import type { VersionHistoryEntry } from "../lib/pageTypes/registry";
import { updatePage, getPage, createPage } from "../lib/shopify/pages.server";
import { OptimisticLockError } from "../lib/db/legalPage.server";
import "../lib/pageTypes";
import type { PageType } from "../types/wizard";

// H-2/H-8: Only send UI-needed fields to client (no formData/contentHtml/version)
interface PageForClient {
  id: string;
  pageType: string;
  status: string;
  shopifyPageId: string | null;
  updatedAt: string;
  formSchemaVersion: number;
  hasTemplateUpdate: boolean;
  pendingUpdates: VersionHistoryEntry[];
}

// H-3: Discriminated union for action responses
type ActionResponse =
  | { success: true; intent: string }
  | { success: false; error: string; redirectTo?: string };

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, billing, session } = await authenticate.admin(request);
  const shop = session.shop;

  await ensureStore(shop);

  // Check if user has Basic plan
  const hasPaidPlan = await checkPlanAccess(billing as BillingCheckContext, "basic");
  let pages = await getLegalPages(shop);

  // T1-4: Check if published pages still exist on Shopify
  const pagesWithShopifyId = pages.filter(
    (p) => p.shopifyPageId && p.status === "published",
  );

  if (pagesWithShopifyId.length > 0) {
    try {
      const ids = pagesWithShopifyId.map((p) => p.shopifyPageId!);
      const result = await withRetry(async () => {
        const response = await admin.graphql(
          `#graphql
          query checkPages($ids: [ID!]!) {
            nodes(ids: $ids) {
              ... on Page {
                id
              }
            }
          }`,
          { variables: { ids } },
        );
        const json = await response.json();
        if (hasRetryableGraphQLError(json)) {
          throw new Error("Throttled: GraphQL API rate limited");
        }
        return json;
      });
      const existingIds = new Set(
        (result.data?.nodes ?? [])
          .filter((n: { id?: string } | null) => n?.id)
          .map((n: { id: string }) => n.id),
      );

      const deletedPages = pagesWithShopifyId.filter(
        (p) => !existingIds.has(p.shopifyPageId!),
      );

      await Promise.all(
        deletedPages.map((p) => markDeletedOnShopify(p.id)),
      );

      const deletedIds = new Set(deletedPages.map((p) => p.id));
      pages = pages.map((p) =>
        deletedIds.has(p.id)
          ? { ...p, status: "deleted_on_shopify" as const, shopifyPageId: null }
          : p,
      );
    } catch {
      // Non-critical: if the check fails, we still show the dashboard
    }
  }

  // T4-A: Compare formSchemaVersion with config.templateVersion for each page
  // H-2/H-8: Strip sensitive fields (formData, contentHtml) from client response
  const pagesForClient: PageForClient[] = pages.map((p) => {
    const config = getPageTypeConfig(p.pageType);
    const pending = config
      ? getTemplateUpdates(p.pageType, p.formSchemaVersion)
      : [];
    return {
      id: p.id,
      pageType: p.pageType,
      status: p.status,
      shopifyPageId: p.shopifyPageId,
      updatedAt: p.updatedAt.toISOString(),
      formSchemaVersion: p.formSchemaVersion,
      hasTemplateUpdate: pending.length > 0,
      pendingUpdates: pending,
    };
  });

  return json({ pages: pagesForClient, shop, hasPaidPlan });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, billing, session } = await authenticate.admin(request);
  const shop = session.shop;
  const formPayload = await request.formData();
  const intent = formPayload.get("intent") as string;

  if (intent === "apply-template-update") {
    const pageType = formPayload.get("pageType") as string;
    if (!pageType) {
      return json<ActionResponse>({ success: false, error: "pageType is required" }, { status: 400 });
    }

    const config = getPageTypeConfig(pageType);
    if (!config) {
      return json<ActionResponse>({ success: false, error: "Unknown page type" }, { status: 400 });
    }

    // H-9: Billing check for paid page types
    const requiredPlan = config.requiredPlan || "free";
    if (requiredPlan !== "free") {
      const hasAccess = await checkPlanAccess(billing as BillingCheckContext, requiredPlan);
      if (!hasAccess) {
        return json<ActionResponse>(
          { success: false, error: "このページタイプにはBasicプランが必要です。" },
          { status: 403 },
        );
      }
    }

    // Load existing page with formData (server-side only, never sent to client)
    const page = await getLegalPage(shop, pageType as PageType);
    if (!page || !page.formData) {
      return json<ActionResponse>({ success: false, error: "ページが見つかりません" }, { status: 404 });
    }

    // Parse existing formData
    let formData: Record<string, unknown>;
    try {
      formData = JSON.parse(page.formData);
    } catch {
      return json<ActionResponse>({
        success: false,
        error: "フォームデータの解析に失敗しました。ウィザードから再編集してください。",
        redirectTo: `/app/wizard/${pageType}`,
      }, { status: 400 });
    }

    // Validate against current full schema (validate first, then normalize — same as wizard)
    const validation = config.fullSchema.safeParse(formData);
    if (!validation.success) {
      return json<ActionResponse>({
        success: false,
        error: "テンプレートが更新されましたが、既存データに互換性がありません。ウィザードから再編集してください。",
        redirectTo: `/app/wizard/${pageType}`,
      });
    }

    // Normalize data if needed (after validation to avoid crashes on incomplete data)
    const normalized = config.normalizeData
      ? config.normalizeData(validation.data as Record<string, unknown>)
      : validation.data;

    // Re-generate HTML with current template
    const contentHtml = config.generateHtml(normalized as Record<string, unknown>);

    // C-1: Track new shopifyPageId if page is recreated
    let newShopifyPageId: string | undefined;

    // Update Shopify page if it exists
    if (page.shopifyPageId && page.status === "published") {
      try {
        const existingPage = await getPage(admin, page.shopifyPageId);
        if (existingPage) {
          await updatePage(admin, page.shopifyPageId, { bodyHtml: contentHtml });
        } else {
          // C-1: Page was deleted on Shopify — recreate and persist new ID
          const result = await createPage(admin, {
            title: config.shopifyPageTitle,
            handle: config.handle,
            bodyHtml: contentHtml,
            published: false,
          });
          newShopifyPageId = result.pageId;
        }
      } catch (error) {
        console.error("[apply-template-update] Shopify API error:", error);
        return json<ActionResponse>({
          success: false,
          error: "Shopifyページの更新に失敗しました。しばらくしてからもう一度お試しください。",
        }, { status: 502 });
      }
    }

    // Update DB: new contentHtml + formSchemaVersion + optional new shopifyPageId
    // H-1: Use optimistic locking via expectedVersion
    try {
      await updateLegalPageVersion(page.id, config.templateVersion, contentHtml, {
        shopifyPageId: newShopifyPageId,
        expectedVersion: page.version,
      });
    } catch (error) {
      if (error instanceof OptimisticLockError) {
        return json<ActionResponse>({
          success: false,
          error: "このページは別のセッションで更新されています。ページを再読み込みしてください。",
        }, { status: 409 });
      }
      throw error;
    }

    return json<ActionResponse>({ success: true, intent: "apply-template-update" });
  }

  if (intent === "upgrade") {
    return billing.request({
      plan: BASIC_PLAN,
      isTest: IS_TEST_BILLING,
    });
  }

  return json<ActionResponse>({ success: false, error: "Unknown intent" }, { status: 400 });
};

export default function DashboardPage() {
  const { pages, hasPaidPlan } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const fetcher = useFetcher<typeof action>();

  const allPageTypes = getAllPageTypes();
  const hasPages = pages.length > 0;
  const existingPageTypes = new Set(pages.map((p) => p.pageType));
  const uncreatedPageTypes = allPageTypes.filter(
    (pt) => !existingPageTypes.has(pt.type),
  );

  const applyingPageType =
    fetcher.state !== "idle"
      ? (fetcher.formData?.get("pageType") as string | null)
      : null;

  // H-3: Type-safe access to fetcher data
  const fetcherError =
    fetcher.data && !fetcher.data.success
      ? (fetcher.data as { success: false; error: string; redirectTo?: string })
      : null;
  const fetcherSuccess =
    fetcher.data?.success && "intent" in fetcher.data && fetcher.data.intent === "apply-template-update";

  return (
    <Page>
      <TitleBar title="まるっと法務作成" />
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            <Banner tone="warning">
              <p>
                本アプリは法的助言を提供するものではありません。生成されたページの内容については、必要に応じて専門家にご確認ください。
              </p>
            </Banner>

            {!hasPages ? (
              <EmptyState
                heading="法的ページを作成しましょう"
                action={{
                  content: "特商法ページを作成する",
                  onAction: () => navigate("/app/wizard/tokushoho"),
                }}
                secondaryAction={{
                  content: "プライバシーポリシーを作成する",
                  onAction: () => navigate("/app/wizard/privacy"),
                }}
                image="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'/%3E"
              >
                <p>
                  フォームに入力するだけで、ECサイトに必要な法的ページを自動生成できます。
                </p>
              </EmptyState>
            ) : (
              <BlockStack gap="400">
                {fetcherError && (
                  <Banner tone="critical">
                    <p>{fetcherError.error}</p>
                    {fetcherError.redirectTo && (
                      <Button
                        variant="plain"
                        onClick={() => navigate(fetcherError.redirectTo!)}
                      >
                        ウィザードで編集する
                      </Button>
                    )}
                  </Banner>
                )}

                {fetcherSuccess && (
                  <Banner tone="success">
                    <p>テンプレートの更新を適用しました。</p>
                  </Banner>
                )}

                {pages.map((page) => {
                  const ptConfig = allPageTypes.find((pt) => pt.type === page.pageType);
                  return (
                  <PageCard
                    key={page.id}
                    pageTypeLabel={
                      ptConfig?.shopifyPageTitle || page.pageType
                    }
                    status={page.status}
                    updatedAt={page.updatedAt}
                    shopifyPageId={page.shopifyPageId}
                    onEdit={() => navigate(`/app/wizard/${page.pageType}`)}
                    hasTemplateUpdate={page.hasTemplateUpdate}
                    pendingUpdates={page.pendingUpdates}
                    isApplying={applyingPageType === page.pageType}
                    onApplyUpdate={() => {
                      const fd = new FormData();
                      fd.append("intent", "apply-template-update");
                      fd.append("pageType", page.pageType);
                      fetcher.submit(fd, { method: "POST" });
                    }}
                  />
                  );
                })}

                {/* Suggest uncreated page types */}
                {uncreatedPageTypes.length > 0 && (
                  <Card>
                    <BlockStack gap="300">
                      <Text as="h3" variant="headingMd">
                        他のページも作成しませんか？
                      </Text>
                      {uncreatedPageTypes.map((pt) => {
                        const isPaid = pt.requiredPlan !== undefined && pt.requiredPlan !== "free";
                        return (
                          <InlineStack key={pt.type} align="space-between" blockAlign="center">
                            <BlockStack gap="100">
                              <InlineStack gap="200" blockAlign="center">
                                <Text as="p" variant="bodyMd" fontWeight="semibold">
                                  {pt.shopifyPageTitle}
                                </Text>
                                {isPaid && !hasPaidPlan && (
                                  <Badge tone="info">有料プラン</Badge>
                                )}
                              </InlineStack>
                              <Text as="p" variant="bodySm" tone="subdued">
                                {pt.description}
                              </Text>
                            </BlockStack>
                            <Button onClick={() => navigate(`/app/wizard/${pt.type}`)}>
                              {isPaid && !hasPaidPlan ? "アップグレード" : "作成する"}
                            </Button>
                          </InlineStack>
                        );
                      })}
                    </BlockStack>
                  </Card>
                )}

                {/* T4-B1: Final confirmation screen promotion */}
                {hasPaidPlan && (
                  <Card>
                    <BlockStack gap="300">
                      <InlineStack gap="200" blockAlign="center">
                        <Text as="h3" variant="headingMd">
                          最終確認画面設定
                        </Text>
                        <Badge tone="info">2022年改正特商法対応</Badge>
                      </InlineStack>
                      <Text as="p" variant="bodySm" tone="subdued">
                        カートページに法定6項目（分量・販売価格・支払方法・引渡時期・解除事項・申込期間）を表示し、改正特商法に対応します。
                      </Text>
                      <Button onClick={() => navigate("/app/confirmation")}>
                        設定する
                      </Button>
                    </BlockStack>
                  </Card>
                )}
              </BlockStack>
            )}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
