import { describe, it, expect } from "vitest";
import {
  step1Schema,
  step2Schema,
  tokushohoFormSchema,
  normalizePostalCode,
  validateStep,
} from "../validation/wizard";

const validStep1 = {
  businessName: "株式会社テスト",
  representativeName: "山田太郎",
  postalCode: "100-0001",
  address: "東京都千代田区千代田1-1",
  phone: "03-1234-5678",
  email: "test@example.com",
  businessType: "corporation" as const,
  addressDisclosure: "public" as const,
};

const validStep2 = {
  sellingPrice: "各商品ページに記載の価格（税込）",
  additionalFees: "送料：全国一律660円",
  paymentMethods: ["credit_card", "bank_transfer"],
  paymentTiming: "クレジットカード：ご注文時に即時決済",
  deliveryTime: "ご注文確認後、3〜5営業日以内に発送",
  deliveryNotes: "",
  returnPolicy: "商品到着後7日以内",
  returnDeadline: "商品到着後7日以内",
  returnShippingCost: "お客様負担",
  defectiveItemPolicy: "不良品は交換対応",
  quantityLimit: "",
};

describe("step1Schema", () => {
  it("validates correct data", () => {
    const result = step1Schema.safeParse(validStep1);
    expect(result.success).toBe(true);
  });

  it("rejects empty businessName", () => {
    const result = step1Schema.safeParse({
      ...validStep1,
      businessName: "",
    });
    expect(result.success).toBe(false);
  });

  it("validates postal code with hyphen", () => {
    const result = step1Schema.safeParse({
      ...validStep1,
      postalCode: "100-0001",
    });
    expect(result.success).toBe(true);
  });

  it("validates postal code without hyphen", () => {
    const result = step1Schema.safeParse({
      ...validStep1,
      postalCode: "1000001",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid postal code", () => {
    const result = step1Schema.safeParse({
      ...validStep1,
      postalCode: "123",
    });
    expect(result.success).toBe(false);
  });

  it("validates Japanese phone numbers", () => {
    const validPhones = [
      "03-1234-5678",
      "0312345678",
      "090-1234-5678",
      "09012345678",
      "0120-123-456",
    ];
    for (const phone of validPhones) {
      const result = step1Schema.safeParse({ ...validStep1, phone });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid phone numbers", () => {
    const invalidPhones = ["123", "abc", "1-234-5678"];
    for (const phone of invalidPhones) {
      const result = step1Schema.safeParse({ ...validStep1, phone });
      expect(result.success).toBe(false);
    }
  });

  it("validates email", () => {
    const result = step1Schema.safeParse({
      ...validStep1,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid businessType", () => {
    const result = step1Schema.safeParse({
      ...validStep1,
      businessType: "invalid",
    });
    expect(result.success).toBe(false);
  });
});

describe("step2Schema", () => {
  it("validates correct data", () => {
    const result = step2Schema.safeParse(validStep2);
    expect(result.success).toBe(true);
  });

  it("requires at least one payment method", () => {
    const result = step2Schema.safeParse({
      ...validStep2,
      paymentMethods: [],
    });
    expect(result.success).toBe(false);
  });

  it("allows empty optional fields", () => {
    const result = step2Schema.safeParse({
      ...validStep2,
      quantityLimit: "",
      deliveryNotes: "",
    });
    expect(result.success).toBe(true);
  });
});

describe("tokushohoFormSchema", () => {
  it("validates complete form data", () => {
    const result = tokushohoFormSchema.safeParse({
      ...validStep1,
      ...validStep2,
    });
    expect(result.success).toBe(true);
  });
});

describe("validateStep", () => {
  it("validates step 1", () => {
    const result = validateStep(1, validStep1);
    expect(result.success).toBe(true);
  });

  it("validates step 2", () => {
    const result = validateStep(2, validStep2);
    expect(result.success).toBe(true);
  });

  it("validates full form for other steps", () => {
    const result = validateStep(3, { ...validStep1, ...validStep2 });
    expect(result.success).toBe(true);
  });
});

describe("normalizePostalCode", () => {
  it("adds hyphen to 7-digit code", () => {
    expect(normalizePostalCode("1000001")).toBe("100-0001");
  });

  it("keeps hyphenated code as-is", () => {
    expect(normalizePostalCode("100-0001")).toBe("100-0001");
  });

  it("handles invalid codes gracefully", () => {
    expect(normalizePostalCode("123")).toBe("123");
  });
});
