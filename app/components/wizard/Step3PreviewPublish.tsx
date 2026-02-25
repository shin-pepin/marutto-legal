import { useState } from "react";
import {
  BlockStack,
  Card,
  Text,
  Button,
  Box,
  InlineStack,
  Checkbox,
  Select,
} from "@shopify/polaris";

interface MenuOption {
  id: string;
  title: string;
  handle: string;
}

interface Step3Props {
  previewHtml: string;
  onPublish: (options?: { addToMenu?: boolean; menuId?: string }) => void;
  isPublishing: boolean;
  isUpdate: boolean;
  menus?: MenuOption[];
}

export function Step3PreviewPublish({
  previewHtml,
  onPublish,
  isPublishing,
  isUpdate,
  menus = [],
}: Step3Props) {
  const [addToMenu, setAddToMenu] = useState(false);
  const footerMenu = menus.find((m) => m.handle === "footer");
  const [selectedMenuId, setSelectedMenuId] = useState(
    footerMenu?.id ?? menus[0]?.id ?? "",
  );

  const menuOptions = menus.map((m) => ({
    label: m.title,
    value: m.id,
  }));

  const handlePublish = () => {
    onPublish({
      addToMenu: addToMenu && !!selectedMenuId,
      menuId: selectedMenuId,
    });
  };

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

      {menus.length > 0 && (
        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">
              メニューに追加
            </Text>
            <Checkbox
              label="フッターメニューにリンクを追加する"
              checked={addToMenu}
              onChange={setAddToMenu}
            />
            {addToMenu && (
              <Select
                label="メニューを選択"
                options={menuOptions}
                value={selectedMenuId}
                onChange={setSelectedMenuId}
              />
            )}
          </BlockStack>
        </Card>
      )}

      <InlineStack align="end">
        <Button
          variant="primary"
          onClick={handlePublish}
          loading={isPublishing}
          size="large"
        >
          {isUpdate ? "ページを更新する" : "ページを作成する"}
        </Button>
      </InlineStack>
    </BlockStack>
  );
}
