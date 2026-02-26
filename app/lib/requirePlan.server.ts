import { BASIC_PLAN } from "../shopify.server";

/**
 * Check if the current store has access to the required plan.
 * Uses Shopify's billing.check() to verify active subscription.
 */
export async function checkPlanAccess(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  billing: any,
  requiredPlan: string,
): Promise<boolean> {
  if (!requiredPlan || requiredPlan === "free") {
    return true;
  }

  try {
    const { hasActivePayment } = await billing.check({
      plans: [BASIC_PLAN],
      isTest: true,
    });
    return hasActivePayment;
  } catch {
    // If billing check fails, deny access to be safe
    return false;
  }
}
