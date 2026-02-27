import { describe, it, expect } from "vitest";
import {
  termsStep1Schema,
  termsStep2Schema,
  termsFormSchema,
  validateTermsStep,
} from "../validation/terms";

const validStep1 = {
  businessName: "株式会社テスト",
  serviceName: "テストサービス",
  siteUrl: "https://example.com",
  email: "test@example.com",
};

const validStep2 = {
  registrationRequirement: "所定の方法で利用登録を申請してください。",
  prohibitedActions: ["illegal", "ip_infringement"],
  prohibitedActionsOther: "",
  intellectualProperty: "本サービスに関する知的財産権はすべて当社に帰属します。",
  disclaimer: "当社は、本サービスの利用により生じた損害について責任を負いません。",
  serviceInterruption: "メンテナンス時にはサービスを一時中断する場合があります。",
  termsChangePolicy: "当社は必要に応じて本規約を変更することがあります。",
  jurisdiction: "tokyo" as const,
  jurisdictionOther: "",
  contactMethod: "メール (support@example.com)",
};

describe("termsStep1Schema", () => {
  it("validates correct data", () => {
    const result = termsStep1Schema.safeParse(validStep1);
    expect(result.success).toBe(true);
  });

  it("rejects empty businessName", () => {
    const result = termsStep1Schema.safeParse({
      ...validStep1,
      businessName: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty serviceName", () => {
    const result = termsStep1Schema.safeParse({
      ...validStep1,
      serviceName: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty siteUrl", () => {
    const result = termsStep1Schema.safeParse({
      ...validStep1,
      siteUrl: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid siteUrl format", () => {
    const result = termsStep1Schema.safeParse({
      ...validStep1,
      siteUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid https siteUrl", () => {
    const result = termsStep1Schema.safeParse({
      ...validStep1,
      siteUrl: "https://example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty email", () => {
    const result = termsStep1Schema.safeParse({
      ...validStep1,
      email: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = termsStep1Schema.safeParse({
      ...validStep1,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects too long businessName", () => {
    const result = termsStep1Schema.safeParse({
      ...validStep1,
      businessName: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("rejects too long serviceName", () => {
    const result = termsStep1Schema.safeParse({
      ...validStep1,
      serviceName: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

describe("termsStep2Schema", () => {
  it("validates correct data", () => {
    const result = termsStep2Schema.safeParse(validStep2);
    expect(result.success).toBe(true);
  });

  it("requires at least one prohibited action", () => {
    const result = termsStep2Schema.safeParse({
      ...validStep2,
      prohibitedActions: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid prohibitedActions values", () => {
    const result = termsStep2Schema.safeParse({
      ...validStep2,
      prohibitedActions: ["illegal", "unknown_action"],
    });
    expect(result.success).toBe(false);
  });

  it("validates all jurisdiction enum values", () => {
    for (const value of ["tokyo", "osaka", "nagoya", "fukuoka", "sapporo"] as const) {
      const result = termsStep2Schema.safeParse({
        ...validStep2,
        jurisdiction: value,
      });
      expect(result.success).toBe(true);
    }
    // "other" requires jurisdictionOther to be filled
    const otherResult = termsStep2Schema.safeParse({
      ...validStep2,
      jurisdiction: "other",
      jurisdictionOther: "横浜地方裁判所",
    });
    expect(otherResult.success).toBe(true);
  });

  it("rejects jurisdiction 'other' without jurisdictionOther", () => {
    const result = termsStep2Schema.safeParse({
      ...validStep2,
      jurisdiction: "other",
      jurisdictionOther: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid jurisdiction value", () => {
    const result = termsStep2Schema.safeParse({
      ...validStep2,
      jurisdiction: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty registrationRequirement", () => {
    const result = termsStep2Schema.safeParse({
      ...validStep2,
      registrationRequirement: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty intellectualProperty", () => {
    const result = termsStep2Schema.safeParse({
      ...validStep2,
      intellectualProperty: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty disclaimer", () => {
    const result = termsStep2Schema.safeParse({
      ...validStep2,
      disclaimer: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty serviceInterruption", () => {
    const result = termsStep2Schema.safeParse({
      ...validStep2,
      serviceInterruption: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty termsChangePolicy", () => {
    const result = termsStep2Schema.safeParse({
      ...validStep2,
      termsChangePolicy: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty contactMethod", () => {
    const result = termsStep2Schema.safeParse({
      ...validStep2,
      contactMethod: "",
    });
    expect(result.success).toBe(false);
  });

  it("allows empty optional fields", () => {
    const result = termsStep2Schema.safeParse({
      ...validStep2,
      prohibitedActionsOther: "",
      jurisdictionOther: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects too long intellectualProperty", () => {
    const result = termsStep2Schema.safeParse({
      ...validStep2,
      intellectualProperty: "a".repeat(2001),
    });
    expect(result.success).toBe(false);
  });
});

describe("termsFormSchema", () => {
  it("validates complete form data", () => {
    const result = termsFormSchema.safeParse({
      ...validStep1,
      ...validStep2,
    });
    expect(result.success).toBe(true);
  });

  it("rejects incomplete data (missing step 1 fields)", () => {
    const result = termsFormSchema.safeParse(validStep2);
    expect(result.success).toBe(false);
  });

  it("rejects incomplete data (missing step 2 fields)", () => {
    const result = termsFormSchema.safeParse(validStep1);
    expect(result.success).toBe(false);
  });
});

describe("validateTermsStep", () => {
  it("validates step 1", () => {
    const result = validateTermsStep(1, validStep1);
    expect(result.success).toBe(true);
  });

  it("validates step 2", () => {
    const result = validateTermsStep(2, validStep2);
    expect(result.success).toBe(true);
  });

  it("validates full form for other steps", () => {
    const result = validateTermsStep(3, {
      ...validStep1,
      ...validStep2,
    });
    expect(result.success).toBe(true);
  });

  it("returns errors for invalid step 1 data", () => {
    const result = validateTermsStep(1, { businessName: "" });
    expect(result.success).toBe(false);
  });

  it("returns errors for invalid step 2 data", () => {
    const result = validateTermsStep(2, { prohibitedActions: [] });
    expect(result.success).toBe(false);
  });
});
