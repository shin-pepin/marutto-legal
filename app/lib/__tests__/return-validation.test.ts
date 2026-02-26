import { describe, it, expect } from "vitest";
import {
  returnStep1Schema,
  returnStep2Schema,
  returnFormSchema,
  validateReturnStep,
} from "../validation/return";

const validStep1 = {
  businessName: "株式会社テスト",
  email: "test@example.com",
  phone: "03-1234-5678",
  siteUrl: "https://example.com",
};

const validStep2 = {
  returnDeadline: "商品到着後7日以内",
  returnCondition: "unused_only" as const,
  shippingCost: "customer" as const,
  exchangePolicy: "available" as const,
  refundMethod: "original_payment" as const,
  refundTiming: "返品商品到着確認後、5営業日以内",
  defectiveHandling: "不良品の場合は送料当店負担で交換いたします。",
  returnProcess: "1. お問い合わせフォームからご連絡\n2. 返品承認後、商品を返送\n3. 確認後に返金処理",
  nonReturnableItems: "",
  contactMethod: "メール (support@example.com)",
};

describe("returnStep1Schema", () => {
  it("validates correct data", () => {
    const result = returnStep1Schema.safeParse(validStep1);
    expect(result.success).toBe(true);
  });

  it("rejects empty businessName", () => {
    const result = returnStep1Schema.safeParse({
      ...validStep1,
      businessName: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty email", () => {
    const result = returnStep1Schema.safeParse({
      ...validStep1,
      email: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = returnStep1Schema.safeParse({
      ...validStep1,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty phone", () => {
    const result = returnStep1Schema.safeParse({
      ...validStep1,
      phone: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty siteUrl", () => {
    const result = returnStep1Schema.safeParse({
      ...validStep1,
      siteUrl: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid siteUrl format", () => {
    const result = returnStep1Schema.safeParse({
      ...validStep1,
      siteUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid https siteUrl", () => {
    const result = returnStep1Schema.safeParse({
      ...validStep1,
      siteUrl: "https://example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects too long businessName", () => {
    const result = returnStep1Schema.safeParse({
      ...validStep1,
      businessName: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("rejects too long phone", () => {
    const result = returnStep1Schema.safeParse({
      ...validStep1,
      phone: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

describe("returnStep2Schema", () => {
  it("validates correct data", () => {
    const result = returnStep2Schema.safeParse(validStep2);
    expect(result.success).toBe(true);
  });

  it("validates all returnCondition enum values", () => {
    for (const value of ["unused_only", "defective_only", "both", "no_returns"] as const) {
      const result = returnStep2Schema.safeParse({
        ...validStep2,
        returnCondition: value,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid returnCondition value", () => {
    const result = returnStep2Schema.safeParse({
      ...validStep2,
      returnCondition: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("validates all shippingCost enum values", () => {
    for (const value of ["customer", "store", "defective_store"] as const) {
      const result = returnStep2Schema.safeParse({
        ...validStep2,
        shippingCost: value,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid shippingCost value", () => {
    const result = returnStep2Schema.safeParse({
      ...validStep2,
      shippingCost: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("validates all exchangePolicy enum values", () => {
    for (const value of ["available", "unavailable", "defective_only"] as const) {
      const result = returnStep2Schema.safeParse({
        ...validStep2,
        exchangePolicy: value,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid exchangePolicy value", () => {
    const result = returnStep2Schema.safeParse({
      ...validStep2,
      exchangePolicy: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("validates all refundMethod enum values", () => {
    for (const value of ["original_payment", "bank_transfer", "store_credit", "flexible"] as const) {
      const result = returnStep2Schema.safeParse({
        ...validStep2,
        refundMethod: value,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid refundMethod value", () => {
    const result = returnStep2Schema.safeParse({
      ...validStep2,
      refundMethod: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty returnDeadline", () => {
    const result = returnStep2Schema.safeParse({
      ...validStep2,
      returnDeadline: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty refundTiming", () => {
    const result = returnStep2Schema.safeParse({
      ...validStep2,
      refundTiming: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty defectiveHandling", () => {
    const result = returnStep2Schema.safeParse({
      ...validStep2,
      defectiveHandling: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty returnProcess", () => {
    const result = returnStep2Schema.safeParse({
      ...validStep2,
      returnProcess: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty contactMethod", () => {
    const result = returnStep2Schema.safeParse({
      ...validStep2,
      contactMethod: "",
    });
    expect(result.success).toBe(false);
  });

  it("allows empty nonReturnableItems", () => {
    const result = returnStep2Schema.safeParse({
      ...validStep2,
      nonReturnableItems: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects too long defectiveHandling", () => {
    const result = returnStep2Schema.safeParse({
      ...validStep2,
      defectiveHandling: "a".repeat(2001),
    });
    expect(result.success).toBe(false);
  });
});

describe("returnFormSchema", () => {
  it("validates complete form data", () => {
    const result = returnFormSchema.safeParse({
      ...validStep1,
      ...validStep2,
    });
    expect(result.success).toBe(true);
  });

  it("rejects incomplete data (missing step 1 fields)", () => {
    const result = returnFormSchema.safeParse(validStep2);
    expect(result.success).toBe(false);
  });

  it("rejects incomplete data (missing step 2 fields)", () => {
    const result = returnFormSchema.safeParse(validStep1);
    expect(result.success).toBe(false);
  });
});

describe("validateReturnStep", () => {
  it("validates step 1", () => {
    const result = validateReturnStep(1, validStep1);
    expect(result.success).toBe(true);
  });

  it("validates step 2", () => {
    const result = validateReturnStep(2, validStep2);
    expect(result.success).toBe(true);
  });

  it("validates full form for other steps", () => {
    const result = validateReturnStep(3, {
      ...validStep1,
      ...validStep2,
    });
    expect(result.success).toBe(true);
  });

  it("returns errors for invalid step 1 data", () => {
    const result = validateReturnStep(1, { businessName: "" });
    expect(result.success).toBe(false);
  });

  it("returns errors for invalid step 2 data", () => {
    const result = validateReturnStep(2, { returnDeadline: "" });
    expect(result.success).toBe(false);
  });
});
