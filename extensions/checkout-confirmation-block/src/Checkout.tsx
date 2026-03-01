import { useState } from "react";
import {
  reactExtension,
  useAppMetafields,
  useSettings,
  useTranslate,
  BlockStack,
  Disclosure,
  Pressable,
  View,
  Text,
  Divider,
} from "@shopify/ui-extensions-react/checkout";

/** Metafield keys that map to the 6 legal items */
const ITEM_KEYS = [
  "quantity_text",
  "price_text",
  "payment_text",
  "delivery_text",
  "cancellation_text",
  "period_text",
] as const;

/** Translate key for each item label */
const LABEL_KEYS: Record<(typeof ITEM_KEYS)[number], string> = {
  quantity_text: "quantity_label",
  price_text: "price_label",
  payment_text: "payment_label",
  delivery_text: "delivery_label",
  cancellation_text: "cancellation_label",
  period_text: "period_label",
};

const CONTENT_ID = "confirmation-content";

function CheckoutConfirmation() {
  const translate = useTranslate();
  const settings = useSettings<{ title?: string }>();
  const metafields = useAppMetafields({
    type: "shop",
    namespace: "marutto_confirmation",
  });

  // Build a key→value map from metafields
  const mfMap = new Map<string, string>();
  for (const entry of metafields) {
    const { key } = entry.metafield;
    const value =
      typeof entry.metafield.value === "string" ? entry.metafield.value : "";
    if (value) mfMap.set(key, value);
  }

  // Check enabled flag
  if (mfMap.get("enabled") !== "true") return null;

  // Collect non-empty items
  const items = ITEM_KEYS.filter((k) => mfMap.has(k)).map((k) => ({
    key: k,
    label: translate(LABEL_KEYS[k]),
    value: mfMap.get(k)!,
  }));

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
  items: { key: string; label: string; value: string }[];
}) {
  const [openIds, setOpenIds] = useState<string[]>([]);
  const isOpen = openIds.includes(CONTENT_ID);

  return (
    <Disclosure open={openIds} onToggle={setOpenIds}>
      <Pressable toggles={CONTENT_ID} padding="base">
        <Text size="base" emphasis="bold">
          {isOpen ? "▼ " : "▶ "}
          {title}
        </Text>
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
                  <Text size="small">{item.value}</Text>
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
