import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  const subscription = (payload as Record<string, unknown>)?.app_subscription;
  const logData = {
    event: "webhook_received",
    topic,
    shop,
    plan: subscription ? (subscription as Record<string, unknown>).name : undefined,
    status: subscription ? (subscription as Record<string, unknown>).status : undefined,
  };
  console.log(JSON.stringify(logData));

  // Currently API-only: checkPlanAccess() queries Shopify billing on each request.
  // If performance becomes an issue, add DB caching here:
  //   await db.store.update({ where: { shopDomain: shop }, data: { plan: name, planStatus: status } });

  return new Response();
};
