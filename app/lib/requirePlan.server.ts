import { BASIC_PLAN } from "../shopify.server";

/** Supported billing plan levels. */
export type PlanLevel = "free" | "basic";

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
 * Maps plan level to Shopify billing plan name(s).
 * When adding new plans, extend both PlanLevel and this map.
 */
const PLAN_MAP: Record<Exclude<PlanLevel, "free">, string[]> = {
  basic: [BASIC_PLAN],
};

/**
 * Check if the current store has access to the required plan.
 * Uses Shopify's billing.check() to verify active subscription.
 */
export async function checkPlanAccess(
  billing: BillingCheckContext,
  requiredPlan: PlanLevel,
): Promise<boolean> {
  if (requiredPlan === "free") {
    return true;
  }

  const plans = PLAN_MAP[requiredPlan];
  if (!plans) {
    console.error(`[billing] Unknown plan level: ${requiredPlan}`);
    return false;
  }

  try {
    const { hasActivePayment } = await billing.check({
      plans,
      isTest: IS_TEST_BILLING,
    });
    return hasActivePayment;
  } catch (error) {
    console.error("[billing] checkPlanAccess failed:", error);
    return false;
  }
}
