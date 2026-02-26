import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
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
import { getLegalPages, markDeletedOnShopify } from "../lib/db/legalPage.server";
import { PageCard } from "../components/dashboard/PageCard";
import { withRetry, hasRetryableGraphQLError } from "../lib/shopify/retry.server";
import { checkPlanAccess } from "../lib/requirePlan.server";

const PAGE_TYPE_LABELS: Record<string, string> = {
  tokushoho: "特定商取引法に基づく表記",
  privacy: "プライバシーポリシー",
  terms: "利用規約",
  return: "返品・交換ポリシー",
};

// Page types available for creation
const AVAILABLE_PAGE_TYPES = [
  { type: "tokushoho", label: "特定商取引法に基づく表記", description: "ECサイトに必須の法的表記ページ" },
  { type: "privacy", label: "プライバシーポリシー", description: "個人情報の取り扱いに関するポリシーページ" },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, billing, session } = await authenticate.admin(request);
  const shop = session.shop;

  await ensureStore(shop);

  // Check if user has Basic plan
  const hasPaidPlan = await checkPlanAccess(billing, "basic");
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

  return json({ pages, shop, hasPaidPlan });
};

export default function DashboardPage() {
  const { pages, hasPaidPlan } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const hasPages = pages.length > 0;
  const existingPageTypes = new Set(pages.map((p) => p.pageType));
  const uncreatedPageTypes = AVAILABLE_PAGE_TYPES.filter(
    (pt) => !existingPageTypes.has(pt.type),
  );

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
                {pages.map((page) => (
                  <PageCard
                    key={page.id}
                    pageType={page.pageType}
                    pageTypeLabel={
                      PAGE_TYPE_LABELS[page.pageType] || page.pageType
                    }
                    status={page.status}
                    updatedAt={page.updatedAt}
                    shopifyPageId={page.shopifyPageId}
                    onEdit={() => navigate(`/app/wizard/${page.pageType}`)}
                  />
                ))}

                {/* Suggest uncreated page types */}
                {uncreatedPageTypes.length > 0 && (
                  <Card>
                    <BlockStack gap="300">
                      <Text as="h3" variant="headingMd">
                        他のページも作成しませんか？
                      </Text>
                      {uncreatedPageTypes.map((pt) => {
                        const isPaid = pt.type !== "tokushoho";
                        return (
                          <InlineStack key={pt.type} align="space-between" blockAlign="center">
                            <BlockStack gap="100">
                              <InlineStack gap="200" blockAlign="center">
                                <Text as="p" variant="bodyMd" fontWeight="semibold">
                                  {pt.label}
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
              </BlockStack>
            )}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
