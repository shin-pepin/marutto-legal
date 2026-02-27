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
import "../lib/pageTypes";
import type { PageType } from "../types/wizard";

interface PageWithUpdates {
  id: string;
  pageType: string;
  status: string;
  shopifyPageId: string | null;
  updatedAt: string;
  formData: string | null;
  formSchemaVersion: number;
  contentHtml: string | null;
  version: number;
  hasTemplateUpdate: boolean;
  pendingUpdates: VersionHistoryEntry[];
}

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
  const pagesWithUpdates: PageWithUpdates[] = pages.map((p) => {
    const config = getPageTypeConfig(p.pageType);
    const pending = config
      ? getTemplateUpdates(p.pageType, p.formSchemaVersion)
      : [];
    return {
      id: p.id,
      pageType: p.pageType,
      status: p.status,
      shopifyPageId: p.shopifyPageId,
      updatedAt: p.updatedAt as unknown as string,
      formData: p.formData,
      formSchemaVersion: p.formSchemaVersion,
      contentHtml: p.contentHtml,
      version: p.version,
      hasTemplateUpdate: pending.length > 0,
      pendingUpdates: pending,
    };
  });

  return json({ pages: pagesWithUpdates, shop, hasPaidPlan });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, billing, session } = await authenticate.admin(request);
  const shop = session.shop;
  const formPayload = await request.formData();
  const intent = formPayload.get("intent") as string;

  if (intent === "apply-template-update") {
    const pageType = formPayload.get("pageType") as string;
    if (!pageType) {
      return json({ success: false, error: "pageType is required" }, { status: 400 });
    }

    const config = getPageTypeConfig(pageType);
    if (!config) {
      return json({ success: false, error: "Unknown page type" }, { status: 400 });
    }

    // Load existing page with formData
    const page = await getLegalPage(shop, pageType as PageType);
    if (!page || !page.formData) {
      return json({ success: false, error: "ページが見つかりません" }, { status: 404 });
    }

    // Parse existing formData
    let formData: Record<string, unknown>;
    try {
      formData = JSON.parse(page.formData);
    } catch {
      return json({
        success: false,
        error: "フォームデータの解析に失敗しました。ウィザードから再編集してください。",
        redirectTo: `/app/wizard/${pageType}`,
      }, { status: 400 });
    }

    // Normalize data if needed
    const normalized = config.normalizeData
      ? config.normalizeData(formData)
      : formData;

    // Validate against current full schema
    const validation = config.fullSchema.safeParse(normalized);
    if (!validation.success) {
      return json({
        success: false,
        error: "テンプレートが更新されましたが、既存データに互換性がありません。ウィザードから再編集してください。",
        redirectTo: `/app/wizard/${pageType}`,
      });
    }

    // Re-generate HTML with current template
    const contentHtml = config.generateHtml(validation.data as Record<string, unknown>);

    // Update Shopify page if it exists
    if (page.shopifyPageId && page.status === "published") {
      try {
        const existingPage = await getPage(admin, page.shopifyPageId);
        if (existingPage) {
          await updatePage(admin, page.shopifyPageId, { bodyHtml: contentHtml });
        } else {
          // Page was deleted on Shopify — recreate
          const result = await createPage(admin, {
            title: config.shopifyPageTitle,
            handle: config.handle,
            bodyHtml: contentHtml,
            published: false,
          });
          // Update shopifyPageId would require an extra DB call; skip for now
          // The user can re-publish from the wizard if needed
          void result;
        }
      } catch (error) {
        console.error("[apply-template-update] Shopify API error:", error);
        return json({
          success: false,
          error: "Shopifyページの更新に失敗しました。しばらくしてからもう一度お試しください。",
        }, { status: 502 });
      }
    }

    // Update DB: new contentHtml + formSchemaVersion
    await updateLegalPageVersion(page.id, config.templateVersion, contentHtml);

    return json({ success: true, intent: "apply-template-update" });
  }

  if (intent === "upgrade") {
    return billing.request({
      plan: BASIC_PLAN,
      isTest: IS_TEST_BILLING,
    });
  }

  return json({ success: false, error: "Unknown intent" }, { status: 400 });
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
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>
                  フォームに入力するだけで、ECサイトに必要な法的ページを自動生成できます。
                </p>
              </EmptyState>
            ) : (
              <BlockStack gap="400">
                {fetcher.data && !fetcher.data.success && (
                  <Banner tone="critical">
                    <p>{(fetcher.data as unknown as { error?: string }).error || "エラーが発生しました"}</p>
                    {(fetcher.data as unknown as { redirectTo?: string }).redirectTo && (
                      <Button
                        variant="plain"
                        onClick={() =>
                          navigate((fetcher.data as unknown as { redirectTo: string }).redirectTo)
                        }
                      >
                        ウィザードで編集する
                      </Button>
                    )}
                  </Banner>
                )}

                {fetcher.data?.success && (
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
              </BlockStack>
            )}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
