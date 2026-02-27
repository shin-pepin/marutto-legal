import { describe, it, expect } from "vitest";
import {
  getPageTypeConfig,
  getAllPageTypes,
  isValidPageType,
  registerPageType,
} from "../pageTypes/registry";
import "../pageTypes"; // register all page types

describe("pageTypes registry", () => {
  it("has tokushoho registered", () => {
    expect(isValidPageType("tokushoho")).toBe(true);
  });

  it("has privacy registered", () => {
    expect(isValidPageType("privacy")).toBe(true);
  });

  it("rejects invalid page types", () => {
    expect(isValidPageType("invalid")).toBe(false);
    expect(isValidPageType("")).toBe(false);
  });

  it("allows re-registration (idempotent for HMR)", () => {
    const original = getPageTypeConfig("tokushoho");
    registerPageType({
      type: "tokushoho",
      title: "updated",
      description: "updated",
      shopifyPageTitle: "updated",
      handle: "updated",
      stepSchemas: [],
      fullSchema: {} as any,
      steps: [],
      generateHtml: () => "",
    });
    expect(getPageTypeConfig("tokushoho")!.title).toBe("updated");
    // Restore original to not break other tests
    if (original) registerPageType(original);
  });

  it("returns all registered page types", () => {
    const types = getAllPageTypes();
    expect(types.length).toBeGreaterThanOrEqual(2);
    const typeNames = types.map((t) => t.type);
    expect(typeNames).toContain("tokushoho");
    expect(typeNames).toContain("privacy");
  });
});

describe("tokushoho config", () => {
  const config = getPageTypeConfig("tokushoho");

  it("is defined", () => {
    expect(config).toBeDefined();
  });

  it("has correct type", () => {
    expect(config!.type).toBe("tokushoho");
  });

  it("has correct title", () => {
    expect(config!.title).toBe("特商法ページ作成");
  });

  it("has correct Shopify page title", () => {
    expect(config!.shopifyPageTitle).toBe("特定商取引法に基づく表記");
  });

  it("has correct handle", () => {
    expect(config!.handle).toBe("legal");
  });

  it("has 2 step schemas", () => {
    expect(config!.stepSchemas).toHaveLength(2);
  });

  it("has 3 steps (including preview)", () => {
    expect(config!.steps).toHaveLength(3);
  });

  it("has a fullSchema", () => {
    expect(config!.fullSchema).toBeDefined();
  });

  it("has a generateHtml function", () => {
    expect(typeof config!.generateHtml).toBe("function");
  });

  it("has a normalizeData function", () => {
    expect(typeof config!.normalizeData).toBe("function");
  });

  it("normalizes postal code", () => {
    const normalized = config!.normalizeData!({ postalCode: "1000001" });
    expect(normalized.postalCode).toBe("100-0001");
  });

  it("has sections config", () => {
    expect(config!.sections).toEqual({
      payment: true,
      delivery: true,
      returns: true,
    });
  });
});

describe("privacy config", () => {
  const config = getPageTypeConfig("privacy");

  it("is defined", () => {
    expect(config).toBeDefined();
  });

  it("has correct type", () => {
    expect(config!.type).toBe("privacy");
  });

  it("has correct title", () => {
    expect(config!.title).toBe("プライバシーポリシー作成");
  });

  it("has correct Shopify page title", () => {
    expect(config!.shopifyPageTitle).toBe("プライバシーポリシー");
  });

  it("has correct handle", () => {
    expect(config!.handle).toBe("privacy-policy");
  });

  it("has 2 step schemas", () => {
    expect(config!.stepSchemas).toHaveLength(2);
  });

  it("has 3 steps (including preview)", () => {
    expect(config!.steps).toHaveLength(3);
  });

  it("has a fullSchema", () => {
    expect(config!.fullSchema).toBeDefined();
  });

  it("has a generateHtml function", () => {
    expect(typeof config!.generateHtml).toBe("function");
  });

  it("generates valid HTML", () => {
    const html = config!.generateHtml({
      businessName: "テスト社",
      representativeName: "テスト太郎",
      address: "東京都",
      email: "test@test.com",
      siteUrl: "https://test.com",
      collectedInfo: ["name"],
      collectedInfoOther: "",
      purposeOfUse: ["order_processing"],
      purposeOfUseOther: "",
      thirdPartySharing: "none",
      thirdPartySharingDetail: "",
      useCookies: "no",
      cookieDetail: "",
      useAnalytics: "no",
      analyticsTools: "",
      retentionPeriod: "1年間",
      securityMeasures: "SSL",
      contactMethod: "メール",
    });
    expect(html).toContain("プライバシーポリシー");
    expect(html).toContain("テスト社");
  });

  it("does not have sections", () => {
    expect(config!.sections).toBeUndefined();
  });
});
