import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock shopify.server.ts to avoid shopifyApp() initialization
vi.mock("../../shopify.server", () => ({
  BASIC_PLAN: "Basic",
}));

import { checkPlanAccess } from "../requirePlan.server";
import type { BillingCheckContext } from "../requirePlan.server";

function mockBilling(hasActivePayment: boolean): BillingCheckContext {
  return {
    check: vi.fn().mockResolvedValue({ hasActivePayment }),
  };
}

function throwingBilling(error: Error): BillingCheckContext {
  return {
    check: vi.fn().mockRejectedValue(error),
  };
}

describe("checkPlanAccess", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true for free plan", async () => {
    const billing = mockBilling(false);
    expect(await checkPlanAccess(billing, "free")).toBe(true);
    expect(billing.check).not.toHaveBeenCalled();
  });

  it("returns true when billing has active payment for basic plan", async () => {
    const billing = mockBilling(true);
    expect(await checkPlanAccess(billing, "basic")).toBe(true);
    expect(billing.check).toHaveBeenCalledOnce();
  });

  it("returns false when billing has no active payment", async () => {
    const billing = mockBilling(false);
    expect(await checkPlanAccess(billing, "basic")).toBe(false);
  });

  it("returns false and logs error when billing.check throws", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const billing = throwingBilling(new Error("network error"));

    expect(await checkPlanAccess(billing, "basic")).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(
      "[billing] checkPlanAccess failed:",
      expect.any(Error),
    );
  });

  it("passes correct plan name to billing.check", async () => {
    const billing = mockBilling(true);
    await checkPlanAccess(billing, "basic");

    expect(billing.check).toHaveBeenCalledWith(
      expect.objectContaining({
        plans: ["Basic"],
      }),
    );
  });
});
