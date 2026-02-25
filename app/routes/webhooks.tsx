import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { deleteStoreData } from "../lib/db/store.server";
import db from "../db.server";

/**
 * Handle all webhook events including GDPR mandatory webhooks.
 *
 * Topics handled:
 * - customers/data_request: Respond with customer data held by the app
 * - customers/redact: Delete customer data
 * - shop/redact: Delete all shop data (48h after uninstall)
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  switch (topic) {
    case "CUSTOMERS_DATA_REQUEST": {
      // This app does not store customer-specific data.
      // The form_data contains business info, not customer data.
      // Respond with empty data.
      console.log(`[GDPR] customers/data_request for ${shop} - no customer data stored`);
      break;
    }

    case "CUSTOMERS_REDACT": {
      // This app does not store customer-specific data.
      // No action needed.
      console.log(`[GDPR] customers/redact for ${shop} - no customer data to delete`);
      break;
    }

    case "SHOP_REDACT": {
      // Delete all store data from our database.
      // Shopify-side pages are intentionally left intact.
      console.log(`[GDPR] shop/redact for ${shop} - deleting all store data`);
      try {
        await deleteStoreData(shop);
        console.log(`[GDPR] Successfully deleted data for ${shop}`);
      } catch (error) {
        console.error(`[GDPR] Failed to delete data for ${shop}:`, error);
        throw error;
      }
      break;
    }

    default: {
      console.log(`Unhandled webhook topic: ${topic}`);
    }
  }

  return new Response();
};
