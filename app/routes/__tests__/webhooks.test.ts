import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock shopify.server for all webhook tests
const mockWebhookAuth = vi.fn();
vi.mock("../../shopify.server", () => ({
  authenticate: {
    webhook: (...args: unknown[]) => mockWebhookAuth(...args),
  },
  BASIC_PLAN: "Basic",
}));

const mockDeleteMany = vi.fn().mockResolvedValue({ count: 1 });
const mockSessionUpdate = vi.fn().mockResolvedValue({});
vi.mock("../../db.server", () => ({
  default: {
    session: {
      deleteMany: (...args: unknown[]) => mockDeleteMany(...args),
      update: (...args: unknown[]) => mockSessionUpdate(...args),
    },
  },
}));

describe("Webhook: app/uninstalled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes sessions when session exists", async () => {
    mockWebhookAuth.mockResolvedValue({
      shop: "test-store.myshopify.com",
      topic: "APP_UNINSTALLED",
      session: { id: "session-1", shop: "test-store.myshopify.com" },
      payload: {},
    });

    const { action } = await import("../webhooks.app.uninstalled");
    const response = await action({
      request: new Request("https://test.com/webhooks/app/uninstalled", { method: "POST" }),
      params: {},
      context: {},
    });

    expect(response.status).toBe(200);
    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { shop: "test-store.myshopify.com" } });
  });

  it("handles missing session gracefully", async () => {
    mockWebhookAuth.mockResolvedValue({
      shop: "test-store.myshopify.com",
      topic: "APP_UNINSTALLED",
      session: undefined,
      payload: {},
    });

    const { action } = await import("../webhooks.app.uninstalled");
    const response = await action({
      request: new Request("https://test.com/webhooks/app/uninstalled", { method: "POST" }),
      params: {},
      context: {},
    });

    expect(response.status).toBe(200);
    expect(mockDeleteMany).not.toHaveBeenCalled();
  });
});

describe("Webhook: app_subscriptions/update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs subscription update payload", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    mockWebhookAuth.mockResolvedValue({
      shop: "test-store.myshopify.com",
      topic: "APP_SUBSCRIPTIONS_UPDATE",
      payload: {
        app_subscription: {
          name: "Basic",
          status: "ACTIVE",
        },
      },
      session: { id: "session-1" },
    });

    const { action } = await import("../webhooks.app.subscriptions_update");
    const response = await action({
      request: new Request("https://test.com/webhooks/app/subscriptions_update", { method: "POST" }),
      params: {},
      context: {},
    });

    expect(response.status).toBe(200);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("APP_SUBSCRIPTIONS_UPDATE"),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Basic"),
    );
    consoleSpy.mockRestore();
  });

  it("returns 200 even without subscription data", async () => {
    mockWebhookAuth.mockResolvedValue({
      shop: "test-store.myshopify.com",
      topic: "APP_SUBSCRIPTIONS_UPDATE",
      payload: {},
      session: { id: "session-1" },
    });

    const { action } = await import("../webhooks.app.subscriptions_update");
    const response = await action({
      request: new Request("https://test.com/webhooks/app/subscriptions_update", { method: "POST" }),
      params: {},
      context: {},
    });

    expect(response.status).toBe(200);
  });
});
