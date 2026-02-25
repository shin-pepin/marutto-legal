import {
  BlockStack,
  Card,
  Text,
  Button,
  Box,
  InlineStack,
} from "@shopify/polaris";

interface Step3Props {
  previewHtml: string;
  onPublish: () => void;
  isPublishing: boolean;
  isUpdate: boolean;
}

export function Step3PreviewPublish({
  previewHtml,
  onPublish,
  isPublishing,
  isUpdate,
}: Step3Props) {
  return (
    <BlockStack gap="400">
      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">
            プレビュー
          </Text>
          <Box
            borderWidth="025"
            borderColor="border"
            borderRadius="200"
            padding="400"
            background="bg-surface"
          >
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </Box>
        </BlockStack>
      </Card>

      <InlineStack align="end">
        <Button
          variant="primary"
          onClick={onPublish}
          loading={isPublishing}
          size="large"
        >
          {isUpdate ? "ページを更新する" : "ページを作成する"}
        </Button>
      </InlineStack>
    </BlockStack>
  );
}
