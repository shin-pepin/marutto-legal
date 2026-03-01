import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildLoaderArgs, buildActionArgs } from "./helpers/requestBuilder";

// Use vi.hoisted() so mock functions are available when vi.mock factories run
const {
  mockSession,
  mockBilling,
  mockAdmin,
  mockEnsureStore,
  mockGetLegalPages,
  mockGetLegalPage,
  mockMarkDeletedOnShopify,
  mockUpdateLegalPageVersion,
  mockCheckPlanAccess,
  mockGetPage,
  mockUpdatePage,
  mockCreatePage,
} = vi.hoisted(() => ({
  mockSession: { id: "test-session-id", shop: "test-store.myshopify.com" },
  mockBilling: {
    check: vi.fn().mockResolvedValue({ hasActivePayment: true }),
    request: vi.fn().mockResolvedValue(new Response(null, { status: 302 })),
  },
  mockAdmin: {
    graphql: vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ data: { nodes: [] } }),
    }),
  },
  mockEnsureStore: vi.fn().mockResolvedValue({ id: "test-store.myshopify.com" }),
  mockGetLegalPages: vi.fn().mockResolvedValue([]),
  mockGetLegalPage: vi.fn().mockResolvedValue(null),
  mockMarkDeletedOnShopify: vi.fn().mockResolvedValue({}),
  mockUpdateLegalPageVersion: vi.fn().mockResolvedValue({ id: "page-1", formSchemaVersion: 1 }),
  mockCheckPlanAccess: vi.fn().mockResolvedValue(true),
  mockGetPage: vi.fn().mockResolvedValue({ id: "gid://shopify/Page/1", handle: "legal" }),
  mockUpdatePage: vi.fn().mockResolvedValue({ id: "gid://shopify/Page/1" }),
  mockCreatePage: vi.fn().mockResolvedValue({ pageId: "gid://shopify/Page/2", handle: "legal" }),
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
  default: {
    session: { deleteMany: vi.fn() },
  },
}));

vi.mock("../../lib/db/store.server", () => ({
  ensureStore: (...args: unknown[]) => mockEnsureStore(...args),
}));

// Real OptimisticLockError class so instanceof checks work in the action
const MockOptimisticLockError = class OptimisticLockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OptimisticLockError";
  }
};

vi.mock("../../lib/db/legalPage.server", () => ({
  getLegalPages: (...args: unknown[]) => mockGetLegalPages(...args),
  getLegalPage: (...args: unknown[]) => mockGetLegalPage(...args),
  markDeletedOnShopify: (...args: unknown[]) => mockMarkDeletedOnShopify(...args),
  updateLegalPageVersion: (...args: unknown[]) => mockUpdateLegalPageVersion(...args),
  OptimisticLockError: MockOptimisticLockError,
}));

vi.mock("../../lib/requirePlan.server", () => ({
  checkPlanAccess: (...args: unknown[]) => mockCheckPlanAccess(...args),
  IS_TEST_BILLING: true,
}));

vi.mock("../../lib/shopify/retry.server", () => ({
  withRetry: (fn: () => unknown) => fn(),
  hasRetryableGraphQLError: () => false,
}));

vi.mock("../../lib/shopify/pages.server", () => ({
  getPage: (...args: unknown[]) => mockGetPage(...args),
  updatePage: (...args: unknown[]) => mockUpdatePage(...args),
  createPage: (...args: unknown[]) => mockCreatePage(...args),
  ShopifyApiError: class ShopifyApiError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "ShopifyApiError";
    }
  },
}));

// Import after mocks
const { loader, action } = await import("../app._index");

describe("Dashboard loader (app._index)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetLegalPages.mockResolvedValue([]);
    mockCheckPlanAccess.mockResolvedValue(true);
    mockAdmin.graphql.mockResolvedValue({
      json: vi.fn().mockResolvedValue({ data: { nodes: [] } }),
    });
  });

  it("returns empty pages array for new store", async () => {
    const args = buildLoaderArgs();
    const response = await loader(args);
    const data = await response.json();

    expect(data.pages).toEqual([]);
    expect(mockEnsureStore).toHaveBeenCalledWith("test-store.myshopify.com");
  });

  it("returns existing pages with correct structure", async () => {
    const mockPages = [
      {
        id: "page-1",
        pageType: "tokushoho",
        status: "published",
        shopifyPageId: "gid://shopify/Page/1",
        updatedAt: new Date("2024-01-01T00:00:00.000Z"),
        formData: null,
        formSchemaVersion: 1,
      },
    ];
    mockGetLegalPages.mockResolvedValue(mockPages);
    mockAdmin.graphql.mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        data: { nodes: [{ id: "gid://shopify/Page/1" }] },
      }),
    });

    const args = buildLoaderArgs();
    const response = await loader(args);
    const data = await response.json();

    expect(data.pages).toHaveLength(1);
    expect(data.pages[0].pageType).toBe("tokushoho");
    expect(data.pages[0].status).toBe("published");
  });

  it("does not leak formData or contentHtml to client", async () => {
    const mockPages = [
      {
        id: "page-1",
        pageType: "tokushoho",
        status: "published",
        shopifyPageId: "gid://shopify/Page/1",
        updatedAt: new Date("2024-01-01T00:00:00.000Z"),
        formData: '{"businessName":"秘密の情報"}',
        contentHtml: "<p>秘密</p>",
        formSchemaVersion: 1,
        version: 3,
      },
    ];
    mockGetLegalPages.mockResolvedValue(mockPages);
    mockAdmin.graphql.mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        data: { nodes: [{ id: "gid://shopify/Page/1" }] },
      }),
    });

    const args = buildLoaderArgs();
    const response = await loader(args);
    const data = await response.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const page = data.pages[0] as any;
    expect(page.formData).toBeUndefined();
    expect(page.contentHtml).toBeUndefined();
    expect(page.version).toBeUndefined();
  });

  it("returns hasPaidPlan from billing check", async () => {
    mockCheckPlanAccess.mockResolvedValue(true);

    const args = buildLoaderArgs();
    const response = await loader(args);
    const data = await response.json();

    expect(data.hasPaidPlan).toBe(true);
  });

  it("detects deleted pages on Shopify and marks them", async () => {
    const mockPages = [
      {
        id: "page-1",
        pageType: "tokushoho",
        status: "published",
        shopifyPageId: "gid://shopify/Page/1",
        updatedAt: new Date("2024-01-01T00:00:00.000Z"),
        formData: null,
        formSchemaVersion: 1,
      },
    ];
    mockGetLegalPages.mockResolvedValue(mockPages);
    mockAdmin.graphql.mockResolvedValue({
      json: vi.fn().mockResolvedValue({ data: { nodes: [null] } }),
    });

    const args = buildLoaderArgs();
    const response = await loader(args);
    const data = await response.json();

    expect(mockMarkDeletedOnShopify).toHaveBeenCalledWith("page-1");
    expect(data.pages[0].status).toBe("deleted_on_shopify");
  });

  it("still returns dashboard when GraphQL fails", async () => {
    const mockPages = [
      {
        id: "page-1",
        pageType: "tokushoho",
        status: "published",
        shopifyPageId: "gid://shopify/Page/1",
        updatedAt: new Date("2024-01-01T00:00:00.000Z"),
        formData: null,
        formSchemaVersion: 1,
      },
    ];
    mockGetLegalPages.mockResolvedValue(mockPages);
    mockAdmin.graphql.mockRejectedValue(new Error("GraphQL error"));

    const args = buildLoaderArgs();
    const response = await loader(args);
    const data = await response.json();

    expect(data.pages).toHaveLength(1);
    expect(data.pages[0].status).toBe("published");
  });

  it("returns hasPaidPlan false when billing check fails", async () => {
    mockCheckPlanAccess.mockResolvedValue(false);

    const args = buildLoaderArgs();
    const response = await loader(args);
    const data = await response.json();

    expect(data.hasPaidPlan).toBe(false);
  });
});

describe("Dashboard action - apply-template-update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckPlanAccess.mockResolvedValue(true);
  });

  it("returns 400 when pageType is missing", async () => {
    const args = buildActionArgs({ intent: "apply-template-update" });
    const response = await action(args);
    expect(response.status).toBe(400);
  });

  it("returns 400 for unknown page type", async () => {
    const args = buildActionArgs({
      intent: "apply-template-update",
      pageType: "nonexistent",
    });
    const response = await action(args);
    expect(response.status).toBe(400);
  });

  it("returns 404 when page not found", async () => {
    mockGetLegalPage.mockResolvedValue(null);
    const args = buildActionArgs({
      intent: "apply-template-update",
      pageType: "tokushoho",
    });
    const response = await action(args);
    expect(response.status).toBe(404);
  });

  it("returns 403 for paid pageType without billing", async () => {
    mockCheckPlanAccess.mockResolvedValue(false);
    const args = buildActionArgs({
      intent: "apply-template-update",
      pageType: "privacy",
    });
    const response = await action(args);
    expect(response.status).toBe(403);
  });

  it("successfully applies template update for published page", async () => {
    mockGetLegalPage.mockResolvedValue({
      id: "page-1",
      pageType: "tokushoho",
      status: "published",
      shopifyPageId: "gid://shopify/Page/1",
      formData: JSON.stringify({
        businessName: "テスト社",
        representativeName: "テスト太郎",
        address: "東京都渋谷区1-1-1",
        email: "test@test.com",
        phone: "03-1234-5678",
        postalCode: "100-0001",
        businessType: "corporation",
        addressDisclosure: "public",
        sellingPrice: "商品ページに記載",
        additionalFees: "送料500円",
        paymentMethods: ["credit_card"],
        paymentTiming: "注文時",
        deliveryTime: "3営業日以内",
        deliveryNotes: "",
        returnPolicy: "商品到着後7日以内",
        returnDeadline: "7日以内",
        returnShippingCost: "お客様負担",
        defectiveItemPolicy: "交換対応",
        quantityLimit: "",
      }),
      formSchemaVersion: 1,
      version: 3,
    });

    const args = buildActionArgs({
      intent: "apply-template-update",
      pageType: "tokushoho",
    });
    const response = await action(args);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(mockUpdatePage).toHaveBeenCalled();
    expect(mockUpdateLegalPageVersion).toHaveBeenCalledWith(
      "page-1",
      1,
      expect.any(String),
      { shopifyPageId: undefined, expectedVersion: 3 },
    );
  });

  it("recreates Shopify page and saves new ID when original is deleted", async () => {
    mockGetLegalPage.mockResolvedValue({
      id: "page-1",
      pageType: "tokushoho",
      status: "published",
      shopifyPageId: "gid://shopify/Page/1",
      formData: JSON.stringify({
        businessName: "テスト社",
        representativeName: "テスト太郎",
        address: "東京都渋谷区1-1-1",
        email: "test@test.com",
        phone: "03-1234-5678",
        postalCode: "100-0001",
        businessType: "corporation",
        addressDisclosure: "public",
        sellingPrice: "商品ページに記載",
        additionalFees: "送料500円",
        paymentMethods: ["credit_card"],
        paymentTiming: "注文時",
        deliveryTime: "3営業日以内",
        deliveryNotes: "",
        returnPolicy: "商品到着後7日以内",
        returnDeadline: "7日以内",
        returnShippingCost: "お客様負担",
        defectiveItemPolicy: "交換対応",
        quantityLimit: "",
      }),
      formSchemaVersion: 1,
      version: 2,
    });
    // Simulate page deleted on Shopify
    mockGetPage.mockResolvedValue(null);

    const args = buildActionArgs({
      intent: "apply-template-update",
      pageType: "tokushoho",
    });
    const response = await action(args);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(mockCreatePage).toHaveBeenCalled();
    expect(mockUpdateLegalPageVersion).toHaveBeenCalledWith(
      "page-1",
      1,
      expect.any(String),
      { shopifyPageId: "gid://shopify/Page/2", expectedVersion: 2 },
    );
  });

  it("returns 502 on Shopify API failure", async () => {
    mockGetLegalPage.mockResolvedValue({
      id: "page-1",
      pageType: "tokushoho",
      status: "published",
      shopifyPageId: "gid://shopify/Page/1",
      formData: JSON.stringify({
        businessName: "テスト社",
        representativeName: "テスト太郎",
        address: "東京都渋谷区1-1-1",
        email: "test@test.com",
        phone: "03-1234-5678",
        postalCode: "100-0001",
        businessType: "corporation",
        addressDisclosure: "public",
        sellingPrice: "商品ページに記載",
        additionalFees: "送料500円",
        paymentMethods: ["credit_card"],
        paymentTiming: "注文時",
        deliveryTime: "3営業日以内",
        deliveryNotes: "",
        returnPolicy: "商品到着後7日以内",
        returnDeadline: "7日以内",
        returnShippingCost: "お客様負担",
        defectiveItemPolicy: "交換対応",
        quantityLimit: "",
      }),
      formSchemaVersion: 1,
      version: 1,
    });
    mockGetPage.mockRejectedValue(new Error("Shopify error"));

    const args = buildActionArgs({
      intent: "apply-template-update",
      pageType: "tokushoho",
    });
    const response = await action(args);
    expect(response.status).toBe(502);
  });

  it("redirects to wizard when formData is invalid JSON", async () => {
    mockGetLegalPage.mockResolvedValue({
      id: "page-1",
      pageType: "tokushoho",
      status: "published",
      shopifyPageId: "gid://shopify/Page/1",
      formData: "invalid-json{{{",
      formSchemaVersion: 1,
      version: 1,
    });

    const args = buildActionArgs({
      intent: "apply-template-update",
      pageType: "tokushoho",
    });
    const response = await action(args);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect((data as { redirectTo?: string }).redirectTo).toBe("/app/wizard/tokushoho");
  });

  it("returns 409 on optimistic lock conflict", async () => {
    mockGetPage.mockResolvedValue({ id: "gid://shopify/Page/1", handle: "legal" });
    mockGetLegalPage.mockResolvedValue({
      id: "page-1",
      pageType: "tokushoho",
      status: "published",
      shopifyPageId: "gid://shopify/Page/1",
      formData: JSON.stringify({
        businessName: "テスト社",
        representativeName: "テスト太郎",
        address: "東京都渋谷区1-1-1",
        email: "test@test.com",
        phone: "03-1234-5678",
        postalCode: "100-0001",
        businessType: "corporation",
        addressDisclosure: "public",
        sellingPrice: "商品ページに記載",
        additionalFees: "送料500円",
        paymentMethods: ["credit_card"],
        paymentTiming: "注文時",
        deliveryTime: "3営業日以内",
        deliveryNotes: "",
        returnPolicy: "商品到着後7日以内",
        returnDeadline: "7日以内",
        returnShippingCost: "お客様負担",
        defectiveItemPolicy: "交換対応",
        quantityLimit: "",
      }),
      formSchemaVersion: 1,
      version: 3,
    });
    // Simulate optimistic lock failure
    mockUpdateLegalPageVersion.mockRejectedValue(
      new MockOptimisticLockError("このページは別のセッションで更新されています。再読み込みしてください。"),
    );

    const args = buildActionArgs({
      intent: "apply-template-update",
      pageType: "tokushoho",
    });
    const response = await action(args);
    expect(response.status).toBe(409);
    const data = await response.json();
    expect(data.success).toBe(false);
  });

  it("redirects to wizard when formData fails schema validation", async () => {
    mockGetLegalPage.mockResolvedValue({
      id: "page-1",
      pageType: "tokushoho",
      status: "published",
      shopifyPageId: "gid://shopify/Page/1",
      formData: JSON.stringify({ businessName: "" }),
      formSchemaVersion: 1,
      version: 1,
    });

    const args = buildActionArgs({
      intent: "apply-template-update",
      pageType: "tokushoho",
    });
    const response = await action(args);
    const data = await response.json();

    expect(data.success).toBe(false);
    expect((data as { redirectTo?: string }).redirectTo).toBe("/app/wizard/tokushoho");
  });
});
