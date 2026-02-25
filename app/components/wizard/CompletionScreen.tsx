import { useNavigate } from "@remix-run/react";
import {
  BlockStack,
  Card,
  Text,
  Button,
  InlineStack,
  Icon,
  Banner,
  Box,
} from "@shopify/polaris";
import { CheckCircleIcon } from "@shopify/polaris-icons";

interface MenuOption {
  id: string;
  title: string;
  handle: string;
}

interface CompletionScreenProps {
  isUpdate: boolean;
  shopifyPageId?: string;
  pageHandle?: string;
  menuAdded?: boolean;
  menus: MenuOption[];
  shop: string;
}

export function CompletionScreen({
  isUpdate,
  shopifyPageId,
  pageHandle,
  menuAdded,
  shop,
}: CompletionScreenProps) {
  const navigate = useNavigate();

  const shopifyAdminPageId = shopifyPageId?.replace(
    "gid://shopify/Page/",
    "",
  );

  return (
    <Card>
      <BlockStack gap="400" align="center">
        <Box paddingBlockStart="400">
          <InlineStack align="center" gap="200">
            <Icon source={CheckCircleIcon} tone="success" />
            <Text as="h2" variant="headingLg">
              {isUpdate ? "ページが更新されました！" : "ページが作成されました！"}
            </Text>
          </InlineStack>
        </Box>

        <Text as="p" alignment="center">
          特定商取引法に基づく表記ページが正常に
          {isUpdate ? "更新" : "作成"}されました。
          {!isUpdate &&
            "ページは非公開で作成されています。Shopify管理画面から公開設定を行ってください。"}
        </Text>

        {menuAdded && (
          <Banner tone="success">
            <p>フッターメニューにリンクが追加されました。</p>
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
          {pageHandle && (
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
          <BlockStack gap="300">
            <Text as="h3" variant="headingMd">
              次のステップ
            </Text>
            <Text as="p" tone="subdued">
              プライバシーポリシーの作成もお忘れなく。近日対応予定です。
            </Text>
            <InlineStack gap="200">
              <Button variant="primary" onClick={() => navigate("/app")}>
                ダッシュボードに戻る
              </Button>
            </InlineStack>
          </BlockStack>
        </Box>
      </BlockStack>
    </Card>
  );
}
