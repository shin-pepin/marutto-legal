import { vi } from "vitest";

export function createMockSession(overrides?: Partial<{ shop: string; id: string }>) {
  return {
    id: "test-session-id",
    shop: "test-store.myshopify.com",
    ...overrides,
  };
}

export function createMockBilling(hasActivePayment = true) {
  return {
    check: vi.fn().mockResolvedValue({ hasActivePayment }),
    request: vi.fn().mockResolvedValue(
      new Response(null, { status: 302, headers: { Location: "https://billing.shopify.com" } }),
    ),
  };
}

export function createMockAdmin() {
  return {
    graphql: vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ data: { nodes: [] } }),
    }),
  };
}

export function createMockWebhookContext(overrides?: Partial<{
  shop: string;
  topic: string;
  payload: Record<string, unknown>;
  session: { id: string; shop: string } | undefined;
}>) {
  return {
    shop: "test-store.myshopify.com",
    topic: "APP_UNINSTALLED",
    payload: {},
    session: createMockSession(),
    ...overrides,
  };
}
