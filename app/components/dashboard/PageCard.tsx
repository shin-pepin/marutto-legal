import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Badge,
  Collapsible,
  List,
} from "@shopify/polaris";
import { useState, useCallback } from "react";
import type { VersionHistoryEntry } from "../../lib/pageTypes/registry";

interface PageCardProps {
  pageTypeLabel: string;
  status: string;
  updatedAt: string;
  shopifyPageId: string | null;
  onEdit: () => void;
  hasTemplateUpdate?: boolean;
  pendingUpdates?: VersionHistoryEntry[];
  onApplyUpdate?: () => void;
  isApplying?: boolean;
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
  hasTemplateUpdate,
  pendingUpdates,
  onApplyUpdate,
  isApplying,
}: PageCardProps) {
  const statusInfo = STATUS_MAP[status] || {
    label: status,
    tone: "attention" as const,
  };

  const [changelogOpen, setChangelogOpen] = useState(false);
  const toggleChangelog = useCallback(() => setChangelogOpen((o) => !o), []);

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
          <InlineStack gap="200" blockAlign="center">
            <Text as="h3" variant="headingMd">
              {pageTypeLabel}
            </Text>
            {hasTemplateUpdate && (
              <Badge tone="warning">更新あり</Badge>
            )}
          </InlineStack>
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

        {hasTemplateUpdate && pendingUpdates && pendingUpdates.length > 0 && (
          <BlockStack gap="200">
            <Button onClick={toggleChangelog} variant="plain" size="slim">
              {changelogOpen ? "変更履歴を閉じる" : "変更履歴を表示"}
            </Button>
            <Collapsible open={changelogOpen} id="changelog">
              <List>
                {pendingUpdates.map((entry) => (
                  <List.Item key={entry.version}>
                    v{entry.version} ({entry.date}): {entry.summary}
                  </List.Item>
                ))}
              </List>
            </Collapsible>
          </BlockStack>
        )}

        <InlineStack gap="200">
          {hasTemplateUpdate && onApplyUpdate && status === "published" && (
            <Button
              variant="primary"
              onClick={onApplyUpdate}
              loading={isApplying}
            >
              更新を適用
            </Button>
          )}
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
