import { BASIC_PLAN } from "../shopify.server";

/**
 * Whether billing operations should run in test mode.
 * Defaults to true in development, false in production.
 */
export const IS_TEST_BILLING =
  process.env.NODE_ENV !== "production" ||
  process.env.SHOPIFY_BILLING_TEST === "true";

/** Minimal interface for Shopify billing context used in checkPlanAccess. */
export interface BillingCheckContext {
  check: (params: {
    plans: string[];
    isTest: boolean;
  }) => Promise<{ hasActivePayment: boolean }>;
}

/**
 * Check if the current store has access to the required plan.
 * Uses Shopify's billing.check() to verify active subscription.
 */
export async function checkPlanAccess(
  billing: BillingCheckContext,
  requiredPlan: string,
): Promise<boolean> {
  if (!requiredPlan || requiredPlan === "free") {
    return true;
  }

  try {
    const { hasActivePayment } = await billing.check({
      plans: [BASIC_PLAN],
      isTest: IS_TEST_BILLING,
    });
    return hasActivePayment;
  } catch {
    // If billing check fails, deny access to be safe
    return false;
  }
}
