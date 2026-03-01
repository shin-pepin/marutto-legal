import { useState } from "react";
import {
  reactExtension,
  useAppMetafields,
  useSettings,
  useTranslate,
  BlockStack,
  Disclosure,
  Pressable,
  InlineStack,
  View,
  Text,
  TextBlock,
  Divider,
  Icon,
} from "@shopify/ui-extensions-react/checkout";
import { buildMetafieldMap, collectLegalItems } from "./utils";
import type { LegalItem } from "./utils";

const CONTENT_ID = "confirmation-content";

function CheckoutConfirmation() {
  const translate = useTranslate();
  const settings = useSettings<{ title?: string }>();
  const metafields = useAppMetafields({
    type: "shop",
    namespace: "marutto_confirmation",
  });

  const mfMap = buildMetafieldMap(metafields);

  // Check enabled flag -- safe-by-default: anything other than "true" disables
  if (mfMap.get("enabled") !== "true") return null;

  const items = collectLegalItems(mfMap, translate);

  // Nothing to show
  if (items.length === 0) return null;

  const title = settings.title || translate("defaultTitle");

  return <ConfirmationAccordion title={title} items={items} />;
}

function ConfirmationAccordion({
  title,
  items,
}: {
  title: string;
  items: LegalItem[];
}) {
  const [openIds, setOpenIds] = useState<string[]>([]);
  const isOpen = openIds.includes(CONTENT_ID);

  return (
    <Disclosure open={openIds} onToggle={setOpenIds}>
      <Pressable toggles={CONTENT_ID} padding="base">
        <InlineStack spacing="tight" blockAlignment="center">
          <Icon
            source={isOpen ? "chevronDown" : "chevronRight"}
            size="small"
          />
          <Text size="base" emphasis="bold">
            {title}
          </Text>
        </InlineStack>
      </Pressable>
      <View id={CONTENT_ID} padding={["none", "base", "base", "base"]}>
        <BlockStack spacing="none">
          {items.map((item, idx) => (
            <View key={item.key}>
              {idx > 0 && <Divider />}
              <View padding={["base", "none"]}>
                <BlockStack spacing="extraTight">
                  <Text size="small" appearance="subdued" emphasis="bold">
                    {item.label}
                  </Text>
                  <TextBlock size="small">{item.value}</TextBlock>
                </BlockStack>
              </View>
            </View>
          ))}
        </BlockStack>
      </View>
    </Disclosure>
  );
}

export default reactExtension(
  "purchase.checkout.block.render",
  () => <CheckoutConfirmation />,
);
