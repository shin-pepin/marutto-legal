import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildLoaderArgs, buildActionArgs } from "./helpers/requestBuilder";

// Use vi.hoisted() so mock functions are available when vi.mock factories run
const {
  mockSession,
  mockBilling,
  mockAdmin,
  mockEnsureStore,
  mockGetLegalPage,
  mockGetLegalPageMeta,
  mockUpsertLegalPageDraft,
  mockPublishLegalPage,
  mockCheckVersionOrThrow,
  mockCheckPlanAccess,
  mockCreatePage,
  mockUpdatePage,
  mockGetPage,
} = vi.hoisted(() => ({
  mockSession: { id: "test-session-id", shop: "test-store.myshopify.com" },
  mockBilling: {
    check: vi.fn().mockResolvedValue({ hasActivePayment: true }),
    request: vi.fn().mockResolvedValue(
      new Response(null, { status: 302, headers: { Location: "https://billing.shopify.com" } }),
    ),
  },
  mockAdmin: {
    graphql: vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ data: { nodes: [] } }),
    }),
  },
  mockEnsureStore: vi.fn().mockResolvedValue({ id: "test-store.myshopify.com" }),
  mockGetLegalPage: vi.fn().mockResolvedValue(null),
  mockGetLegalPageMeta: vi.fn().mockResolvedValue(null),
  mockUpsertLegalPageDraft: vi.fn().mockResolvedValue({ version: 2 }),
  mockPublishLegalPage: vi.fn().mockResolvedValue({ version: 2 }),
  mockCheckVersionOrThrow: vi.fn().mockResolvedValue(undefined),
  mockCheckPlanAccess: vi.fn().mockResolvedValue(true),
  mockCreatePage: vi.fn().mockResolvedValue({ pageId: "gid://shopify/Page/new", handle: "legal" }),
  mockUpdatePage: vi.fn().mockResolvedValue({ id: "gid://shopify/Page/1", handle: "legal" }),
  mockGetPage: vi.fn().mockResolvedValue({ id: "gid://shopify/Page/1", handle: "legal" }),
}));

vi.mock("../../shopify.server", () => ({
  authenticate: {
    admin: vi.fn().mockImplementation(() =>
      Promise.resolve({
        admin: mockAdmin,
        billing: mockBilling,
        session: mockSession,
      }),
    ),
  },
  BASIC_PLAN: "Basic",
}));

vi.mock("../../db.server", () => ({
  default: {},
}));

vi.mock("../../lib/db/store.server", () => ({
  ensureStore: (...args: unknown[]) => mockEnsureStore(...args),
}));

vi.mock("../../lib/db/legalPage.server", () => {
  class OptimisticLockError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "OptimisticLockError";
    }
  }
  return {
    getLegalPage: (...args: unknown[]) => mockGetLegalPage(...args),
    getLegalPageMeta: (...args: unknown[]) => mockGetLegalPageMeta(...args),
    upsertLegalPageDraft: (...args: unknown[]) => mockUpsertLegalPageDraft(...args),
    publishLegalPage: (...args: unknown[]) => mockPublishLegalPage(...args),
    checkVersionOrThrow: (...args: unknown[]) => mockCheckVersionOrThrow(...args),
    OptimisticLockError,
  };
});

vi.mock("../../lib/requirePlan.server", () => ({
  checkPlanAccess: (...args: unknown[]) => mockCheckPlanAccess(...args),
  IS_TEST_BILLING: true,
}));

vi.mock("../../lib/crypto.server", () => ({
  encryptFormData: (data: string) => `encrypted:${data}`,
  decryptFormData: (data: string) =>
    data.startsWith("encrypted:") ? data.slice("encrypted:".length) : data,
  isEncrypted: (data: string) => data.startsWith("encrypted:"),
}));

vi.mock("../../lib/shopify/pages.server", () => {
  class ShopifyApiError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "ShopifyApiError";
    }
  }
  return {
    createPage: (...args: unknown[]) => mockCreatePage(...args),
    updatePage: (...args: unknown[]) => mockUpdatePage(...args),
    getPage: (...args: unknown[]) => mockGetPage(...args),
    ShopifyApiError,
  };
});

vi.mock("../../lib/shopify/retry.server", () => ({
  withRetry: (fn: () => unknown) => fn(),
  hasRetryableGraphQLError: () => false,
}));

// Import after mocks
const { loader, action } = await import("../app.wizard.$pageType");
const { OptimisticLockError } = await import("../../lib/db/legalPage.server");

// Valid terms form data (paid plan)
const validTermsFormData = JSON.stringify({
  businessName: "株式会社テスト",
  serviceName: "テストサービス",
  siteUrl: "https://test.example.com",
  email: "test@example.com",
  registrationRequirement: "18歳以上であること",
  prohibitedActions: ["illegal", "ip_infringement"],
  prohibitedActionsOther: "",
  intellectualProperty: "当社に帰属します",
  disclaimer: "当社は責任を負いません",
  serviceInterruption: "事前に通知します",
  termsChangePolicy: "変更後に通知します",
  jurisdiction: "tokyo",
  jurisdictionOther: "",
  contactMethod: "メールにてお問い合わせください",
});

// Valid return form data (paid plan)
const validReturnFormData = JSON.stringify({
  businessName: "株式会社テスト",
  email: "test@example.com",
  phone: "03-1234-5678",
  siteUrl: "https://test.example.com",
  returnDeadline: "商品到着後7日以内",
  returnCondition: "both",
  shippingCost: "defective_store",
  exchangePolicy: "defective_only",
  refundMethod: "original_payment",
  refundTiming: "返品確認後14日以内",
  defectiveHandling: "送料当店負担で交換いたします",
  returnProcess: "メールにてご連絡ください",
  nonReturnableItems: "",
  contactMethod: "メールにてお問い合わせください",
});

// Valid tokushoho form data matching the ACTUAL schema (free plan)
const validTokushohoFormData = JSON.stringify({
  // Step 1
  businessName: "株式会社テスト",
  representativeName: "山田太郎",
  businessType: "corporation",
  postalCode: "100-0001",
  address: "東京都千代田区千代田1-1",
  addressDisclosure: "public",
  phone: "03-1234-5678",
  email: "test@example.com",
  // Step 2
  sellingPrice: "商品ページに記載の価格（税込）",
  additionalFees: "送料: 全国一律500円",
  paymentMethods: ["credit_card"],
  paymentTiming: "クレジットカード決済: ご注文時",
  deliveryTime: "通常3〜5営業日",
  deliveryNotes: "",
  returnPolicy: "商品到着後7日以内、未使用・未開封のもの",
  returnDeadline: "商品到着後7日以内",
  returnShippingCost: "お客様負担（不良品は当店負担）",
  defectiveItemPolicy: "商品に不良があった場合は、送料当店負担で交換いたします。",
  quantityLimit: "",
});

describe("Wizard loader (app.wizard.$pageType)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetLegalPage.mockResolvedValue(null);
    mockCheckPlanAccess.mockResolvedValue(true);
    mockBilling.check.mockResolvedValue({ hasActivePayment: true });
  });

  it("throws 404 for invalid pageType", async () => {
    const args = buildLoaderArgs({ params: { pageType: "invalid" } });
    await expect(loader(args)).rejects.toThrow();
  });

  it("returns empty formData for new page", async () => {
    const args = buildLoaderArgs({ params: { pageType: "tokushoho" } });
    const response = await loader(args);
    const data = await response.json();

    expect(data.formData).toEqual({});
    expect(data.existingPage).toBeNull();
    expect(data.pageType).toBe("tokushoho");
  });

  it("returns existing formData (decrypted) for existing page", async () => {
    mockGetLegalPage.mockResolvedValue({
      id: "page-1",
      formData: '{"businessName":"テスト"}',
      shopifyPageId: "gid://shopify/Page/1",
      status: "published",
      version: 3,
    });

    const args = buildLoaderArgs({ params: { pageType: "tokushoho" } });
    const response = await loader(args);
    const data = await response.json();

    expect(data.formData.businessName).toBe("テスト");
    expect(data.existingPage!.version).toBe(3);
  });

  it("returns needsUpgrade true when billing check fails for paid page type", async () => {
    mockCheckPlanAccess.mockResolvedValue(false);

    const args = buildLoaderArgs({ params: { pageType: "privacy" } });
    const response = await loader(args);
    const data = await response.json();

    expect(data.needsUpgrade).toBe(true);
  });

  it("returns needsUpgrade false for free page type", async () => {
    mockCheckPlanAccess.mockResolvedValue(true);

    const args = buildLoaderArgs({ params: { pageType: "tokushoho" } });
    const response = await loader(args);
    const data = await response.json();

    expect(data.needsUpgrade).toBe(false);
  });

  it("returns pageType config info", async () => {
    const args = buildLoaderArgs({ params: { pageType: "tokushoho" } });
    const response = await loader(args);
    const data = await response.json();

    expect(data.pageType).toBe("tokushoho");
    expect(data.shop).toBe("test-store.myshopify.com");
  });
});

describe("Wizard action - save-draft (app.wizard.$pageType)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckPlanAccess.mockResolvedValue(true);
    mockUpsertLegalPageDraft.mockResolvedValue({ version: 2 });
  });

  it("saves draft successfully with new version", async () => {
    const args = buildActionArgs(
      { intent: "save-draft", formData: validTokushohoFormData, version: "1" },
      { params: { pageType: "tokushoho" } },
    );
    const response = await action(args);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.intent).toBe("save-draft");
    expect((data as Record<string, unknown>).newVersion).toBe(2);
  });

  it("returns 400 when formData is missing", async () => {
    const args = buildActionArgs(
      { intent: "save-draft" },
      { params: { pageType: "tokushoho" } },
    );
    const response = await action(args);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
  });

  it("returns 409 on optimistic lock conflict", async () => {
    mockUpsertLegalPageDraft.mockRejectedValue(
      new OptimisticLockError("Version conflict"),
    );

    const args = buildActionArgs(
      { intent: "save-draft", formData: validTokushohoFormData, version: "1" },
      { params: { pageType: "tokushoho" } },
    );
    const response = await action(args);

    expect(response.status).toBe(409);
    const data = await response.json();
    expect(data.success).toBe(false);
  });
});

describe("Wizard action - publish (app.wizard.$pageType)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckPlanAccess.mockResolvedValue(true);
    mockCheckVersionOrThrow.mockResolvedValue(undefined);
    mockGetLegalPageMeta.mockResolvedValue(null);
    mockCreatePage.mockResolvedValue({ pageId: "gid://shopify/Page/new", handle: "legal" });
    mockPublishLegalPage.mockResolvedValue({ version: 2 });
  });

  it("publishes successfully and creates Shopify page", async () => {
    const args = buildActionArgs(
      { intent: "publish", formData: validTokushohoFormData },
      { params: { pageType: "tokushoho" } },
    );
    const response = await action(args);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.intent).toBe("publish");
    expect((data as Record<string, unknown>).shopifyPageId).toBe("gid://shopify/Page/new");
  });

  it("returns validation errors for invalid form data", async () => {
    const args = buildActionArgs(
      { intent: "publish", formData: JSON.stringify({ businessName: "" }) },
      { params: { pageType: "tokushoho" } },
    );
    const response = await action(args);
    const data = await response.json();

    expect(data.success).toBe(false);
    expect(data.intent).toBe("publish");
    expect((data as Record<string, unknown>).errors).toBeDefined();
  });

  it("returns 403 when billing guard fails for paid pageType", async () => {
    mockCheckPlanAccess.mockResolvedValue(false);

    const args = buildActionArgs(
      { intent: "publish", formData: validTokushohoFormData },
      { params: { pageType: "privacy" } },
    );
    const response = await action(args);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.success).toBe(false);
  });

  it("returns 502 on Shopify API error", async () => {
    const { ShopifyApiError } = await import("../../lib/shopify/pages.server");
    mockCreatePage.mockRejectedValue(new ShopifyApiError("Shopify error"));

    const args = buildActionArgs(
      { intent: "publish", formData: validTokushohoFormData },
      { params: { pageType: "tokushoho" } },
    );
    const response = await action(args);

    expect(response.status).toBe(502);
    const data = await response.json();
    expect(data.success).toBe(false);
  });

  it("returns 409 on optimistic lock conflict during pre-check", async () => {
    mockCheckVersionOrThrow.mockRejectedValue(
      new OptimisticLockError("Version conflict"),
    );

    const args = buildActionArgs(
      { intent: "publish", formData: validTokushohoFormData, version: "1" },
      { params: { pageType: "tokushoho" } },
    );
    const response = await action(args);

    expect(response.status).toBe(409);
    const data = await response.json();
    expect(data.success).toBe(false);
  });

  it("updates existing Shopify page when shopifyPageId exists", async () => {
    mockGetLegalPageMeta.mockResolvedValue({
      id: "page-1",
      shopifyPageId: "gid://shopify/Page/1",
      status: "published",
      version: 1,
    });
    mockGetPage.mockResolvedValue({ id: "gid://shopify/Page/1", handle: "legal" });
    mockUpdatePage.mockResolvedValue({ id: "gid://shopify/Page/1", handle: "legal" });

    const args = buildActionArgs(
      { intent: "publish", formData: validTokushohoFormData },
      { params: { pageType: "tokushoho" } },
    );
    const response = await action(args);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(mockUpdatePage).toHaveBeenCalled();
  });
});

describe("Wizard action - upgrade (app.wizard.$pageType)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls billing.request for upgrade intent", async () => {
    const args = buildActionArgs(
      { intent: "upgrade" },
      { params: { pageType: "privacy" } },
    );

    await action(args);

    expect(mockBilling.request).toHaveBeenCalledWith(
      expect.objectContaining({ plan: "Basic" }),
    );
  });
});

// --- Terms page type tests ---

describe("Wizard loader - terms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetLegalPage.mockResolvedValue(null);
    mockCheckPlanAccess.mockResolvedValue(true);
    mockBilling.check.mockResolvedValue({ hasActivePayment: true });
  });

  it("returns empty formData for new terms page", async () => {
    const args = buildLoaderArgs({ params: { pageType: "terms" } });
    const response = await loader(args);
    const data = await response.json();

    expect(data.formData).toEqual({});
    expect(data.pageType).toBe("terms");
  });

  it("returns needsUpgrade true when billing fails for terms", async () => {
    mockCheckPlanAccess.mockResolvedValue(false);

    const args = buildLoaderArgs({ params: { pageType: "terms" } });
    const response = await loader(args);
    const data = await response.json();

    expect(data.needsUpgrade).toBe(true);
  });
});

describe("Wizard action - terms save-draft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckPlanAccess.mockResolvedValue(true);
    mockUpsertLegalPageDraft.mockResolvedValue({ version: 2 });
  });

  it("saves terms draft successfully", async () => {
    const args = buildActionArgs(
      { intent: "save-draft", formData: validTermsFormData, version: "1" },
      { params: { pageType: "terms" } },
    );
    const response = await action(args);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.intent).toBe("save-draft");
  });
});

describe("Wizard action - terms publish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckPlanAccess.mockResolvedValue(true);
    mockCheckVersionOrThrow.mockResolvedValue(undefined);
    mockGetLegalPageMeta.mockResolvedValue(null);
    mockCreatePage.mockResolvedValue({ pageId: "gid://shopify/Page/new", handle: "terms" });
    mockPublishLegalPage.mockResolvedValue({ version: 2 });
  });

  it("publishes terms page successfully", async () => {
    const args = buildActionArgs(
      { intent: "publish", formData: validTermsFormData },
      { params: { pageType: "terms" } },
    );
    const response = await action(args);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.intent).toBe("publish");
  });

  it("returns validation errors for invalid terms data", async () => {
    const args = buildActionArgs(
      { intent: "publish", formData: JSON.stringify({ businessName: "" }) },
      { params: { pageType: "terms" } },
    );
    const response = await action(args);
    const data = await response.json();

    expect(data.success).toBe(false);
    expect((data as Record<string, unknown>).errors).toBeDefined();
  });

  it("returns 403 when billing guard fails for terms", async () => {
    mockCheckPlanAccess.mockResolvedValue(false);

    const args = buildActionArgs(
      { intent: "publish", formData: validTermsFormData },
      { params: { pageType: "terms" } },
    );
    const response = await action(args);

    expect(response.status).toBe(403);
  });
});

// --- Return page type tests ---

describe("Wizard loader - return", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetLegalPage.mockResolvedValue(null);
    mockCheckPlanAccess.mockResolvedValue(true);
    mockBilling.check.mockResolvedValue({ hasActivePayment: true });
  });

  it("returns empty formData for new return page", async () => {
    const args = buildLoaderArgs({ params: { pageType: "return" } });
    const response = await loader(args);
    const data = await response.json();

    expect(data.formData).toEqual({});
    expect(data.pageType).toBe("return");
  });

  it("returns needsUpgrade true when billing fails for return", async () => {
    mockCheckPlanAccess.mockResolvedValue(false);

    const args = buildLoaderArgs({ params: { pageType: "return" } });
    const response = await loader(args);
    const data = await response.json();

    expect(data.needsUpgrade).toBe(true);
  });
});

describe("Wizard action - return save-draft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckPlanAccess.mockResolvedValue(true);
    mockUpsertLegalPageDraft.mockResolvedValue({ version: 2 });
  });

  it("saves return draft successfully", async () => {
    const args = buildActionArgs(
      { intent: "save-draft", formData: validReturnFormData, version: "1" },
      { params: { pageType: "return" } },
    );
    const response = await action(args);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.intent).toBe("save-draft");
  });
});

describe("Wizard action - return publish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckPlanAccess.mockResolvedValue(true);
    mockCheckVersionOrThrow.mockResolvedValue(undefined);
    mockGetLegalPageMeta.mockResolvedValue(null);
    mockCreatePage.mockResolvedValue({ pageId: "gid://shopify/Page/new", handle: "return" });
    mockPublishLegalPage.mockResolvedValue({ version: 2 });
  });

  it("publishes return page successfully", async () => {
    const args = buildActionArgs(
      { intent: "publish", formData: validReturnFormData },
      { params: { pageType: "return" } },
    );
    const response = await action(args);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.intent).toBe("publish");
  });

  it("returns validation errors for invalid return data", async () => {
    const args = buildActionArgs(
      { intent: "publish", formData: JSON.stringify({ businessName: "" }) },
      { params: { pageType: "return" } },
    );
    const response = await action(args);
    const data = await response.json();

    expect(data.success).toBe(false);
    expect((data as Record<string, unknown>).errors).toBeDefined();
  });

  it("returns 403 when billing guard fails for return", async () => {
    mockCheckPlanAccess.mockResolvedValue(false);

    const args = buildActionArgs(
      { intent: "publish", formData: validReturnFormData },
      { params: { pageType: "return" } },
    );
    const response = await action(args);

    expect(response.status).toBe(403);
  });
});
