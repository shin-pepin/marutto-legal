import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Badge,
} from "@shopify/polaris";

interface PageCardProps {
  pageType: string;
  pageTypeLabel: string;
  status: string;
  updatedAt: string;
  shopifyPageId: string | null;
  onEdit: () => void;
}

const STATUS_MAP: Record<string, { label: string; tone: "success" | "attention" | "critical" }> = {
  published: { label: "公開中", tone: "success" },
  draft: { label: "下書き", tone: "attention" },
  deleted_on_shopify: { label: "Shopify側で削除済み", tone: "critical" },
};

export function PageCard({
  pageTypeLabel,
  status,
  updatedAt,
  shopifyPageId,
  onEdit,
}: PageCardProps) {
  const statusInfo = STATUS_MAP[status] || {
    label: status,
    tone: "attention" as const,
  };

  const formattedDate = new Date(updatedAt).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Card>
      <BlockStack gap="300">
        <InlineStack align="space-between">
          <Text as="h3" variant="headingMd">
            {pageTypeLabel}
          </Text>
          <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
        </InlineStack>

        <Text as="p" variant="bodySm" tone="subdued">
          最終更新: {formattedDate}
        </Text>

        {status === "deleted_on_shopify" && (
          <Text as="p" tone="critical" variant="bodySm">
            Shopify管理画面でページが削除されました。「編集」から再作成できます。
          </Text>
        )}

        <InlineStack gap="200">
          <Button onClick={onEdit}>
            {status === "deleted_on_shopify" ? "再作成" : "編集"}
          </Button>
          {shopifyPageId && status === "published" && (
            <Button
              url={`shopify:admin/pages/${shopifyPageId.replace("gid://shopify/Page/", "")}`}
              target="_blank"
              variant="plain"
            >
              ストアで表示
            </Button>
          )}
        </InlineStack>
      </BlockStack>
    </Card>
  );
}
