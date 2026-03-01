import { describe, it, expect } from "vitest";
import {
  confirmationSchema,
  CONFIRMATION_DEFAULTS,
  CONFIRMATION_METAFIELD_NAMESPACE,
  CONFIRMATION_METAFIELD_KEYS,
} from "../validation/confirmation";

describe("confirmationSchema", () => {
  it("accepts valid default data", () => {
    const result = confirmationSchema.safeParse(CONFIRMATION_DEFAULTS);
    expect(result.success).toBe(true);
  });

  it("accepts enabled=true", () => {
    const data = { ...CONFIRMATION_DEFAULTS, enabled: true };
    const result = confirmationSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("rejects empty quantityText when enabled", () => {
    const data = { ...CONFIRMATION_DEFAULTS, enabled: true, quantityText: "" };
    const result = confirmationSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      expect(fields.quantityText).toBeDefined();
    }
  });

  it("rejects empty priceText when enabled", () => {
    const data = { ...CONFIRMATION_DEFAULTS, enabled: true, priceText: "" };
    const result = confirmationSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects empty paymentText when enabled", () => {
    const data = { ...CONFIRMATION_DEFAULTS, enabled: true, paymentText: "" };
    const result = confirmationSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects empty deliveryText when enabled", () => {
    const data = { ...CONFIRMATION_DEFAULTS, enabled: true, deliveryText: "" };
    const result = confirmationSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects empty cancellationText when enabled", () => {
    const data = { ...CONFIRMATION_DEFAULTS, enabled: true, cancellationText: "" };
    const result = confirmationSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects empty periodText when enabled", () => {
    const data = { ...CONFIRMATION_DEFAULTS, enabled: true, periodText: "" };
    const result = confirmationSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("allows empty text fields when disabled", () => {
    const data = {
      enabled: false,
      quantityText: "",
      priceText: "",
      paymentText: "",
      deliveryText: "",
      cancellationText: "",
      periodText: "",
    };
    const result = confirmationSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("enforces max length on quantityText (500)", () => {
    const data = { ...CONFIRMATION_DEFAULTS, quantityText: "a".repeat(501) };
    const result = confirmationSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("allows max length on priceText (2000)", () => {
    const data = { ...CONFIRMATION_DEFAULTS, priceText: "a".repeat(2000) };
    const result = confirmationSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("rejects priceText over max length (2001)", () => {
    const data = { ...CONFIRMATION_DEFAULTS, priceText: "a".repeat(2001) };
    const result = confirmationSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe("CONFIRMATION_DEFAULTS", () => {
  it("has all required fields", () => {
    expect(CONFIRMATION_DEFAULTS.enabled).toBe(false);
    expect(CONFIRMATION_DEFAULTS.quantityText).toBeTruthy();
    expect(CONFIRMATION_DEFAULTS.priceText).toBeTruthy();
    expect(CONFIRMATION_DEFAULTS.paymentText).toBeTruthy();
    expect(CONFIRMATION_DEFAULTS.deliveryText).toBeTruthy();
    expect(CONFIRMATION_DEFAULTS.cancellationText).toBeTruthy();
    expect(CONFIRMATION_DEFAULTS.periodText).toBeTruthy();
  });
});

describe("CONFIRMATION_METAFIELD constants", () => {
  it("has correct namespace", () => {
    expect(CONFIRMATION_METAFIELD_NAMESPACE).toBe("marutto_confirmation");
  });

  it("has all 7 keys", () => {
    const keys = Object.keys(CONFIRMATION_METAFIELD_KEYS);
    expect(keys).toHaveLength(7);
    expect(keys).toContain("enabled");
    expect(keys).toContain("quantityText");
    expect(keys).toContain("priceText");
    expect(keys).toContain("paymentText");
    expect(keys).toContain("deliveryText");
    expect(keys).toContain("cancellationText");
    expect(keys).toContain("periodText");
  });

  it("maps keys to snake_case metafield keys", () => {
    expect(CONFIRMATION_METAFIELD_KEYS.quantityText).toBe("quantity_text");
    expect(CONFIRMATION_METAFIELD_KEYS.priceText).toBe("price_text");
  });
});
