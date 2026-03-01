/** Metafield keys that map to the 6 legal items (2022 revised Tokushoho Art.12-6) */
export const ITEM_KEYS = [
  "quantity_text",
  "price_text",
  "payment_text",
  "delivery_text",
  "cancellation_text",
  "period_text",
] as const;

export type ItemKey = (typeof ITEM_KEYS)[number];

/** Translate key for each item label */
export const LABEL_KEYS: Record<ItemKey, string> = {
  quantity_text: "quantity_label",
  price_text: "price_label",
  payment_text: "payment_label",
  delivery_text: "delivery_label",
  cancellation_text: "cancellation_label",
  period_text: "period_label",
};

export interface LegalItem {
  key: ItemKey;
  label: string;
  value: string;
}

/**
 * Parse metafield entries into a key-value map.
 */
export function buildMetafieldMap(
  metafields: { metafield: { key: string; value: string | number | boolean } }[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of metafields) {
    const { key } = entry.metafield;
    const value =
      typeof entry.metafield.value === "string" ? entry.metafield.value : "";
    if (value) map.set(key, value);
  }
  return map;
}

/**
 * Collect non-empty legal items from the metafield map.
 */
export function collectLegalItems(
  mfMap: Map<string, string>,
  translate: (key: string) => string,
): LegalItem[] {
  return ITEM_KEYS.filter((k) => mfMap.has(k)).map((k) => ({
    key: k,
    label: translate(LABEL_KEYS[k]),
    value: mfMap.get(k) ?? "",
  }));
}
