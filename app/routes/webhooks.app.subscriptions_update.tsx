import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Log subscription update details for debugging/audit
  const subscription = (payload as Record<string, unknown>)?.app_subscription;
  if (subscription) {
    const { name, status } = subscription as Record<string, unknown>;
    console.log(`  Plan: ${name}, Status: ${status}`);
  }

  // Currently API-only: checkPlanAccess() queries Shopify billing on each request.
  // If performance becomes an issue, add DB caching here:
  //   await db.store.update({ where: { shopDomain: shop }, data: { plan: name, planStatus: status } });

  return new Response();
};
