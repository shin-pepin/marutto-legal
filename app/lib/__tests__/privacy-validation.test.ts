import { describe, it, expect } from "vitest";
import {
  privacyStep1Schema,
  privacyStep2Schema,
  privacyFormSchema,
  validatePrivacyStep,
} from "../validation/privacy";

const validStep1 = {
  businessName: "株式会社テスト",
  representativeName: "山田太郎",
  address: "東京都千代田区千代田1-1",
  email: "test@example.com",
  siteUrl: "https://example.com",
};

const validStep2 = {
  collectedInfo: ["name", "email"],
  collectedInfoOther: "",
  purposeOfUse: ["order_processing"],
  purposeOfUseOther: "",
  thirdPartySharing: "none" as const,
  thirdPartySharingDetail: "",
  useCookies: "yes" as const,
  cookieDetail: "",
  useAnalytics: "no" as const,
  analyticsTools: "",
  retentionPeriod: "サービス利用終了後1年間",
  securityMeasures: "SSL暗号化通信",
  contactMethod: "メール (support@example.com)",
};

describe("privacyStep1Schema", () => {
  it("validates correct data", () => {
    const result = privacyStep1Schema.safeParse(validStep1);
    expect(result.success).toBe(true);
  });

  it("rejects empty businessName", () => {
    const result = privacyStep1Schema.safeParse({
      ...validStep1,
      businessName: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty representativeName", () => {
    const result = privacyStep1Schema.safeParse({
      ...validStep1,
      representativeName: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty address", () => {
    const result = privacyStep1Schema.safeParse({
      ...validStep1,
      address: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = privacyStep1Schema.safeParse({
      ...validStep1,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty email", () => {
    const result = privacyStep1Schema.safeParse({
      ...validStep1,
      email: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty siteUrl", () => {
    const result = privacyStep1Schema.safeParse({
      ...validStep1,
      siteUrl: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects too long businessName", () => {
    const result = privacyStep1Schema.safeParse({
      ...validStep1,
      businessName: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

describe("privacyStep2Schema", () => {
  it("validates correct data", () => {
    const result = privacyStep2Schema.safeParse(validStep2);
    expect(result.success).toBe(true);
  });

  it("requires at least one collected info item", () => {
    const result = privacyStep2Schema.safeParse({
      ...validStep2,
      collectedInfo: [],
    });
    expect(result.success).toBe(false);
  });

  it("requires at least one purpose of use", () => {
    const result = privacyStep2Schema.safeParse({
      ...validStep2,
      purposeOfUse: [],
    });
    expect(result.success).toBe(false);
  });

  it("validates thirdPartySharing enum values", () => {
    for (const value of ["none", "with_consent", "partial"] as const) {
      const result = privacyStep2Schema.safeParse({
        ...validStep2,
        thirdPartySharing: value,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid thirdPartySharing value", () => {
    const result = privacyStep2Schema.safeParse({
      ...validStep2,
      thirdPartySharing: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("validates useCookies enum values", () => {
    for (const value of ["yes", "no"] as const) {
      const result = privacyStep2Schema.safeParse({
        ...validStep2,
        useCookies: value,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid useCookies value", () => {
    const result = privacyStep2Schema.safeParse({
      ...validStep2,
      useCookies: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("validates useAnalytics enum values", () => {
    for (const value of ["yes", "no"] as const) {
      const result = privacyStep2Schema.safeParse({
        ...validStep2,
        useAnalytics: value,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects empty retentionPeriod", () => {
    const result = privacyStep2Schema.safeParse({
      ...validStep2,
      retentionPeriod: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty securityMeasures", () => {
    const result = privacyStep2Schema.safeParse({
      ...validStep2,
      securityMeasures: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty contactMethod", () => {
    const result = privacyStep2Schema.safeParse({
      ...validStep2,
      contactMethod: "",
    });
    expect(result.success).toBe(false);
  });

  it("allows empty optional fields", () => {
    const result = privacyStep2Schema.safeParse({
      ...validStep2,
      collectedInfoOther: "",
      purposeOfUseOther: "",
      thirdPartySharingDetail: "",
      cookieDetail: "",
      analyticsTools: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects too long securityMeasures", () => {
    const result = privacyStep2Schema.safeParse({
      ...validStep2,
      securityMeasures: "a".repeat(2001),
    });
    expect(result.success).toBe(false);
  });
});

describe("privacyFormSchema", () => {
  it("validates complete form data", () => {
    const result = privacyFormSchema.safeParse({
      ...validStep1,
      ...validStep2,
    });
    expect(result.success).toBe(true);
  });

  it("rejects incomplete data (missing step 1 fields)", () => {
    const result = privacyFormSchema.safeParse(validStep2);
    expect(result.success).toBe(false);
  });

  it("rejects incomplete data (missing step 2 fields)", () => {
    const result = privacyFormSchema.safeParse(validStep1);
    expect(result.success).toBe(false);
  });
});

describe("validatePrivacyStep", () => {
  it("validates step 1", () => {
    const result = validatePrivacyStep(1, validStep1);
    expect(result.success).toBe(true);
  });

  it("validates step 2", () => {
    const result = validatePrivacyStep(2, validStep2);
    expect(result.success).toBe(true);
  });

  it("validates full form for other steps", () => {
    const result = validatePrivacyStep(3, {
      ...validStep1,
      ...validStep2,
    });
    expect(result.success).toBe(true);
  });

  it("returns errors for invalid step 1 data", () => {
    const result = validatePrivacyStep(1, { businessName: "" });
    expect(result.success).toBe(false);
  });

  it("returns errors for invalid step 2 data", () => {
    const result = validatePrivacyStep(2, { collectedInfo: [] });
    expect(result.success).toBe(false);
  });
});
