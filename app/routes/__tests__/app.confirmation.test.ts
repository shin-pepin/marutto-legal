import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildLoaderArgs, buildActionArgs } from "./helpers/requestBuilder";

const {
  mockSession,
  mockBilling,
  mockAdmin,
  mockCheckPlanAccess,
  mockGetConfirmationMetafields,
  mockSaveConfirmationMetafields,
} = vi.hoisted(() => ({
  mockSession: { id: "test-session-id", shop: "test-store.myshopify.com" },
  mockBilling: {
    check: vi.fn().mockResolvedValue({ hasActivePayment: true }),
    request: vi.fn().mockResolvedValue(new Response(null, { status: 302 })),
  },
  mockAdmin: {
    graphql: vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ data: { shop: { metafields: { edges: [] } } } }),
    }),
  },
  mockCheckPlanAccess: vi.fn().mockResolvedValue(true),
  mockGetConfirmationMetafields: vi.fn().mockResolvedValue({
    enabled: false,
    quantityText: "デフォルト分量",
    priceText: "デフォルト価格",
    paymentText: "デフォルト支払",
    deliveryText: "デフォルト引渡",
    cancellationText: "デフォルト解除",
    periodText: "デフォルト期間",
    checkboxLabel: "確認しました",
  }),
  mockSaveConfirmationMetafields: vi.fn().mockResolvedValue(undefined),
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

vi.mock("../../lib/requirePlan.server", () => ({
  checkPlanAccess: (...args: unknown[]) => mockCheckPlanAccess(...args),
  IS_TEST_BILLING: true,
}));

vi.mock("../../lib/shopify/metafields.server", () => ({
  getConfirmationMetafields: (...args: unknown[]) => mockGetConfirmationMetafields(...args),
  saveConfirmationMetafields: (...args: unknown[]) => mockSaveConfirmationMetafields(...args),
}));

vi.mock("../../lib/shopify/retry.server", () => ({
  withRetry: (fn: () => unknown) => fn(),
  hasRetryableGraphQLError: () => false,
}));

const { loader, action } = await import("../app.confirmation");

describe("Confirmation loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckPlanAccess.mockResolvedValue(true);
  });

  it("returns config from metafields when user has paid plan", async () => {
    const args = buildLoaderArgs();
    const response = await loader(args);
    const data = await response.json();

    expect(data.needsUpgrade).toBe(false);
    expect(data.config.quantityText).toBe("デフォルト分量");
    expect(mockGetConfirmationMetafields).toHaveBeenCalled();
  });

  it("returns needsUpgrade when user lacks paid plan", async () => {
    mockCheckPlanAccess.mockResolvedValue(false);

    const args = buildLoaderArgs();
    const response = await loader(args);
    const data = await response.json();

    expect(data.needsUpgrade).toBe(true);
    expect(mockGetConfirmationMetafields).not.toHaveBeenCalled();
  });

  it("returns defaults when metafield fetch fails", async () => {
    mockGetConfirmationMetafields.mockRejectedValue(new Error("GraphQL error"));

    const args = buildLoaderArgs();
    const response = await loader(args);
    const data = await response.json();

    expect(data.needsUpgrade).toBe(false);
    expect(data.config.enabled).toBe(false);
  });
});

describe("Confirmation action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckPlanAccess.mockResolvedValue(true);
  });

  it("saves valid data via save intent", async () => {
    const args = buildActionArgs({
      intent: "save",
      enabled: "true",
      quantityText: "テスト分量",
      priceText: "テスト価格",
      paymentText: "テスト支払",
      deliveryText: "テスト引渡",
      cancellationText: "テスト解除",
      periodText: "テスト期間",
      checkboxLabel: "テスト確認",
    });

    const response = await action(args);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(mockSaveConfirmationMetafields).toHaveBeenCalledWith(
      mockAdmin,
      expect.objectContaining({
        enabled: true,
        quantityText: "テスト分量",
      }),
    );
  });

  it("returns 403 when user lacks billing plan", async () => {
    mockCheckPlanAccess.mockResolvedValue(false);

    const args = buildActionArgs({
      intent: "save",
      enabled: "false",
      quantityText: "テスト",
      priceText: "テスト",
      paymentText: "テスト",
      deliveryText: "テスト",
      cancellationText: "テスト",
      periodText: "テスト",
      checkboxLabel: "テスト",
    });

    const response = await action(args);
    expect(response.status).toBe(403);
  });

  it("returns validation errors for empty required fields", async () => {
    const args = buildActionArgs({
      intent: "save",
      enabled: "true",
      quantityText: "",
      priceText: "",
      paymentText: "",
      deliveryText: "",
      cancellationText: "",
      periodText: "",
      checkboxLabel: "",
    });

    const response = await action(args);
    const data = await response.json();

    expect(data.success).toBe(false);
    expect((data as unknown as { errors?: Record<string, string[]> }).errors).toBeDefined();
    expect((data as unknown as { errors: Record<string, string[]> }).errors.quantityText).toBeDefined();
  });

  it("returns 502 when metafield save fails", async () => {
    mockSaveConfirmationMetafields.mockRejectedValue(new Error("API Error"));

    const args = buildActionArgs({
      intent: "save",
      enabled: "false",
      quantityText: "テスト分量",
      priceText: "テスト価格",
      paymentText: "テスト支払",
      deliveryText: "テスト引渡",
      cancellationText: "テスト解除",
      periodText: "テスト期間",
      checkboxLabel: "テスト確認",
    });

    const response = await action(args);
    expect(response.status).toBe(502);
  });

  it("returns 400 for unknown intent", async () => {
    const args = buildActionArgs({ intent: "unknown" });
    const response = await action(args);
    expect(response.status).toBe(400);
  });
});
