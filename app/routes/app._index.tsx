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
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { ensureStore } from "../lib/db/store.server";
import { getLegalPages, markDeletedOnShopify } from "../lib/db/legalPage.server";
import { PageCard } from "../components/dashboard/PageCard";
import { withRetry } from "../lib/shopify/retry.server";

// Phase 2以降で privacy, terms, return のウィザードを追加予定
const PAGE_TYPE_LABELS: Record<string, string> = {
  tokushoho: "特定商取引法に基づく表記",
  privacy: "プライバシーポリシー",
  terms: "利用規約",
  return: "返品・交換ポリシー",
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  await ensureStore(shop);
  const pages = await getLegalPages(shop);

  // T1-4: Check if published pages still exist on Shopify
  const pagesWithShopifyId = pages.filter(
    (p) => p.shopifyPageId && p.status === "published",
  );

  if (pagesWithShopifyId.length > 0) {
    try {
      // Bulk check using nodes query (single request for all pages)
      const ids = pagesWithShopifyId.map((p) => p.shopifyPageId!);
      const response = await withRetry(() =>
        admin.graphql(
          `#graphql
          query checkPages($ids: [ID!]!) {
            nodes(ids: $ids) {
              ... on Page {
                id
              }
            }
          }`,
          { variables: { ids } },
        ),
      );

      const result = await response.json();
      const existingIds = new Set(
        (result.data?.nodes ?? [])
          .filter((n: { id?: string } | null) => n?.id)
          .map((n: { id: string }) => n.id),
      );

      // Mark pages that no longer exist on Shopify
      const deletedPages = pagesWithShopifyId.filter(
        (p) => !existingIds.has(p.shopifyPageId!),
      );

      await Promise.all(
        deletedPages.map((p) => markDeletedOnShopify(p.id)),
      );

      // Update local data to reflect changes
      for (const dp of deletedPages) {
        const idx = pages.findIndex((p) => p.id === dp.id);
        if (idx !== -1) {
          pages[idx] = {
            ...pages[idx],
            status: "deleted_on_shopify",
            shopifyPageId: null,
          };
        }
      }
    } catch {
      // Non-critical: if the check fails, we still show the dashboard
    }
  }

  return json({ pages, shop });
};

export default function DashboardPage() {
  const { pages } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const hasPages = pages.length > 0;

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
                heading="特商法ページを作成しましょう"
                action={{
                  content: "特商法ページを作成する",
                  onAction: () => navigate("/app/wizard"),
                }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>
                  フォームに入力するだけで、特定商取引法に基づく表記ページを自動生成できます。
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
                    onEdit={() => navigate("/app/wizard")}
                  />
                ))}

                {/* Show prompt for pages not yet created */}
                {!pages.find((p) => p.pageType === "tokushoho") && (
                  <Banner
                    tone="warning"
                    title="特定商取引法に基づく表記がまだ作成されていません"
                    action={{
                      content: "作成する",
                      onAction: () => navigate("/app/wizard"),
                    }}
                  />
                )}
              </BlockStack>
            )}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
