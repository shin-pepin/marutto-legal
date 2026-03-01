import { useNavigate } from "@remix-run/react";
import {
  BlockStack,
  Card,
  Text,
  Button,
  InlineStack,
  Icon,
  Box,
  Banner,
} from "@shopify/polaris";
import { CheckCircleIcon } from "@shopify/polaris-icons";

interface CompletionScreenProps {
  isUpdate: boolean;
  shopifyPageId?: string;
  pageHandle?: string;
  shop: string;
  pageTypeTitle?: string;
}

export function CompletionScreen({
  isUpdate,
  shopifyPageId,
  pageHandle,
  shop,
  pageTypeTitle = "特定商取引法に基づく表記",
}: CompletionScreenProps) {
  const navigate = useNavigate();

  const shopifyAdminPageId = shopifyPageId?.replace(
    "gid://shopify/Page/",
    "",
  );

  return (
    <Card>
      <BlockStack gap="400" inlineAlign="center">
        <Box paddingBlockStart="400">
          <InlineStack align="center" gap="200">
            <Icon source={CheckCircleIcon} tone="success" />
            <Text as="h2" variant="headingLg">
              {isUpdate ? "ページが更新されました！" : "ページが作成されました！"}
            </Text>
          </InlineStack>
        </Box>

        <Text as="p" alignment="center">
          {pageTypeTitle}ページが正常に
          {isUpdate ? "更新" : "作成"}されました。
        </Text>

        {!isUpdate && (
          <Banner tone="info">
            <p>
              ページは非公開で作成されています。
              Shopify管理画面でページを開き、「公開」ステータスに変更してください。
            </p>
          </Banner>
        )}

        <InlineStack align="center" gap="300">
          {shopifyAdminPageId && (
            <Button
              url={`https://${shop}/admin/pages/${shopifyAdminPageId}`}
              target="_blank"
            >
              Shopify管理画面で確認
            </Button>
          )}
          {isUpdate && pageHandle && (
            <Button
              url={`https://${shop}/pages/${pageHandle}`}
              target="_blank"
              variant="plain"
            >
              ストアで表示
            </Button>
          )}
        </InlineStack>

        <Box
          borderBlockStartWidth="025"
          borderColor="border"
          paddingBlockStart="400"
        >
          <InlineStack gap="200">
            <Button variant="primary" onClick={() => navigate("/app")}>
              ダッシュボードに戻る
            </Button>
          </InlineStack>
        </Box>
      </BlockStack>
    </Card>
  );
}
