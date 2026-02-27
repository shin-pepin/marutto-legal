import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildLoaderArgs } from "./helpers/requestBuilder";

// Use vi.hoisted() so mock functions are available when vi.mock factories run
const {
  mockSession,
  mockBilling,
  mockAdmin,
  mockEnsureStore,
  mockGetLegalPages,
  mockMarkDeletedOnShopify,
  mockCheckPlanAccess,
} = vi.hoisted(() => ({
  mockSession: { id: "test-session-id", shop: "test-store.myshopify.com" },
  mockBilling: {
    check: vi.fn().mockResolvedValue({ hasActivePayment: true }),
  },
  mockAdmin: {
    graphql: vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ data: { nodes: [] } }),
    }),
  },
  mockEnsureStore: vi.fn().mockResolvedValue({ id: "test-store.myshopify.com" }),
  mockGetLegalPages: vi.fn().mockResolvedValue([]),
  mockMarkDeletedOnShopify: vi.fn().mockResolvedValue({}),
  mockCheckPlanAccess: vi.fn().mockResolvedValue(true),
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

vi.mock("../../lib/db/legalPage.server", () => ({
  getLegalPages: (...args: unknown[]) => mockGetLegalPages(...args),
  markDeletedOnShopify: (...args: unknown[]) => mockMarkDeletedOnShopify(...args),
}));

vi.mock("../../lib/requirePlan.server", () => ({
  checkPlanAccess: (...args: unknown[]) => mockCheckPlanAccess(...args),
  IS_TEST_BILLING: true,
}));

vi.mock("../../lib/shopify/retry.server", () => ({
  withRetry: (fn: () => unknown) => fn(),
  hasRetryableGraphQLError: () => false,
}));

// Import after mocks
const { loader } = await import("../app._index");

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
        updatedAt: "2024-01-01T00:00:00.000Z",
        formData: null,
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
        updatedAt: "2024-01-01T00:00:00.000Z",
        formData: null,
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
        updatedAt: "2024-01-01T00:00:00.000Z",
        formData: null,
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
