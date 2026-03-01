import { describe, expect, it } from "vitest";
import { buildMetafieldMap, collectLegalItems } from "../utils";

describe("buildMetafieldMap", () => {
  it("returns empty map for empty array", () => {
    const map = buildMetafieldMap([]);
    expect(map.size).toBe(0);
  });

  it("maps string values correctly", () => {
    const map = buildMetafieldMap([
      { metafield: { key: "enabled", value: "true" } },
      { metafield: { key: "quantity_text", value: "カート内の数量" } },
    ]);
    expect(map.get("enabled")).toBe("true");
    expect(map.get("quantity_text")).toBe("カート内の数量");
  });

  it("converts boolean values to string", () => {
    const map = buildMetafieldMap([
      { metafield: { key: "enabled", value: true } },
      { metafield: { key: "disabled", value: false } },
    ]);
    expect(map.get("enabled")).toBe("true");
    expect(map.get("disabled")).toBe("false");
  });

  it("ignores number values", () => {
    const map = buildMetafieldMap([
      { metafield: { key: "count", value: 42 } },
    ]);
    expect(map.has("count")).toBe(false);
  });

  it("ignores empty string values", () => {
    const map = buildMetafieldMap([
      { metafield: { key: "quantity_text", value: "" } },
    ]);
    expect(map.has("quantity_text")).toBe(false);
  });

  it("last value wins for duplicate keys", () => {
    const map = buildMetafieldMap([
      { metafield: { key: "enabled", value: "false" } },
      { metafield: { key: "enabled", value: "true" } },
    ]);
    expect(map.get("enabled")).toBe("true");
  });
});

describe("collectLegalItems", () => {
  const mockTranslate = (key: string) => `translated:${key}`;

  it("returns empty array when no items present", () => {
    const mfMap = new Map<string, string>();
    const items = collectLegalItems(mfMap, mockTranslate);
    expect(items).toEqual([]);
  });

  it("collects all 6 items when all present", () => {
    const mfMap = new Map<string, string>([
      ["quantity_text", "数量テスト"],
      ["price_text", "価格テスト"],
      ["payment_text", "支払テスト"],
      ["delivery_text", "配送テスト"],
      ["cancellation_text", "解約テスト"],
      ["period_text", "期間テスト"],
    ]);
    const items = collectLegalItems(mfMap, mockTranslate);
    expect(items).toHaveLength(6);
    expect(items[0]).toEqual({
      key: "quantity_text",
      label: "translated:quantity_label",
      value: "数量テスト",
    });
    expect(items[5]).toEqual({
      key: "period_text",
      label: "translated:period_label",
      value: "期間テスト",
    });
  });

  it("collects only items present in the map", () => {
    const mfMap = new Map<string, string>([
      ["quantity_text", "数量のみ"],
      ["cancellation_text", "解約のみ"],
    ]);
    const items = collectLegalItems(mfMap, mockTranslate);
    expect(items).toHaveLength(2);
    expect(items.map((i) => i.key)).toEqual([
      "quantity_text",
      "cancellation_text",
    ]);
  });

  it("preserves order defined by ITEM_KEYS", () => {
    // Insert in reverse order
    const mfMap = new Map<string, string>([
      ["period_text", "期間"],
      ["quantity_text", "数量"],
    ]);
    const items = collectLegalItems(mfMap, mockTranslate);
    expect(items[0].key).toBe("quantity_text");
    expect(items[1].key).toBe("period_text");
  });

  it("ignores keys not in ITEM_KEYS (e.g. enabled)", () => {
    const mfMap = new Map<string, string>([
      ["enabled", "true"],
      ["unknown_key", "何か"],
      ["quantity_text", "数量"],
    ]);
    const items = collectLegalItems(mfMap, mockTranslate);
    expect(items).toHaveLength(1);
    expect(items[0].key).toBe("quantity_text");
  });
});

describe("enabled flag behavior", () => {
  it("only 'true' string should be treated as enabled", () => {
    const cases: { value: string | boolean; expected: boolean }[] = [
      { value: "true", expected: true },
      { value: "false", expected: false },
      { value: "TRUE", expected: false },
      { value: " true ", expected: false },
      { value: "", expected: false },
    ];

    for (const { value, expected } of cases) {
      const entries = value !== ""
        ? [{ metafield: { key: "enabled", value } }]
        : [];
      const mfMap = buildMetafieldMap(entries);
      expect(mfMap.get("enabled") === "true").toBe(expected);
    }
  });

  it("boolean true from Shopify API is treated as enabled", () => {
    const mfMap = buildMetafieldMap([
      { metafield: { key: "enabled", value: true } },
    ]);
    expect(mfMap.get("enabled")).toBe("true");
    expect(mfMap.get("enabled") === "true").toBe(true);
  });

  it("boolean false from Shopify API is treated as disabled", () => {
    const mfMap = buildMetafieldMap([
      { metafield: { key: "enabled", value: false } },
    ]);
    expect(mfMap.get("enabled")).toBe("false");
    expect(mfMap.get("enabled") === "true").toBe(false);
  });

  it("undefined enabled value is treated as disabled", () => {
    const mfMap = buildMetafieldMap([]);
    expect(mfMap.get("enabled")).toBeUndefined();
    expect(mfMap.get("enabled") === "true").toBe(false);
  });
});
