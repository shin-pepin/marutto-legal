import type { AdminApiContext } from "@shopify/shopify-app-remix/server";
import { withRetry, hasRetryableGraphQLError } from "./retry.server";
import type { ConfirmationFormData } from "../validation/confirmation";
import {
  CONFIRMATION_METAFIELD_NAMESPACE,
  CONFIRMATION_METAFIELD_KEYS,
  CONFIRMATION_DEFAULTS,
} from "../validation/confirmation";

/**
 * Build metafield input array for the metafieldsSet mutation.
 */
function buildMetafieldInputs(config: ConfirmationFormData) {
  const ns = CONFIRMATION_METAFIELD_NAMESPACE;
  const keys = CONFIRMATION_METAFIELD_KEYS;

  return [
    { namespace: ns, key: keys.enabled, type: "boolean", value: String(config.enabled) },
    { namespace: ns, key: keys.quantityText, type: "single_line_text_field", value: config.quantityText },
    { namespace: ns, key: keys.priceText, type: "multi_line_text_field", value: config.priceText },
    { namespace: ns, key: keys.paymentText, type: "multi_line_text_field", value: config.paymentText },
    { namespace: ns, key: keys.deliveryText, type: "multi_line_text_field", value: config.deliveryText },
    { namespace: ns, key: keys.cancellationText, type: "multi_line_text_field", value: config.cancellationText },
    { namespace: ns, key: keys.periodText, type: "single_line_text_field", value: config.periodText },
  ];
}

/**
 * Get the current shop's GID (e.g. "gid://shopify/Shop/12345678").
 * Required for metafieldsSet mutation ownerId.
 * Note: No module-level cache — multi-tenant environment where different
 * shops share the same process would cause cross-store data writes.
 */
async function getShopGid(admin: AdminApiContext): Promise<string> {
  const response = await admin.graphql(
    `#graphql
    query shopId {
      shop {
        id
      }
    }`,
  );
  const json = await response.json();
  const id = json.data?.shop?.id;
  if (!id) {
    throw new Error("Shop ID を取得できませんでした");
  }
  return id;
}

/**
 * Save confirmation metafields to the Shop resource.
 */
export async function saveConfirmationMetafields(
  admin: AdminApiContext,
  config: ConfirmationFormData,
): Promise<void> {
  const metafields = buildMetafieldInputs(config);
  // H-7: Resolve full Shop GID (e.g. gid://shopify/Shop/12345678)
  const shopGid = await getShopGid(admin);

  await withRetry(async () => {
    const response = await admin.graphql(
      `#graphql
      mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            namespace
            key
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          metafields: metafields.map((mf) => ({
            ...mf,
            ownerId: shopGid,
          })),
        },
      },
    );

    const json = await response.json();

    if (hasRetryableGraphQLError(json)) {
      throw new Error("Throttled: GraphQL API rate limited");
    }

    const result = json.data?.metafieldsSet;
    if (result?.userErrors?.length) {
      throw new Error(
        `メタフィールドの保存に失敗しました: ${result.userErrors.map((e: { message: string }) => e.message).join(", ")}`,
      );
    }
  });
}

/**
 * Get confirmation metafields from the Shop resource.
 * Uses individual metafield() accessors (not the metafields connection)
 * because the connection filter does NOT resolve the $app: namespace prefix.
 * Returns parsed ConfirmationFormData, falling back to defaults for missing fields.
 */
export async function getConfirmationMetafields(
  admin: AdminApiContext,
): Promise<ConfirmationFormData> {
  const ns = CONFIRMATION_METAFIELD_NAMESPACE;

  const result = await withRetry(async () => {
    const response = await admin.graphql(
      `#graphql
      query getConfirmationMetafields($ns: String!) {
        shop {
          enabled: metafield(namespace: $ns, key: "enabled") { value }
          quantity_text: metafield(namespace: $ns, key: "quantity_text") { value }
          price_text: metafield(namespace: $ns, key: "price_text") { value }
          payment_text: metafield(namespace: $ns, key: "payment_text") { value }
          delivery_text: metafield(namespace: $ns, key: "delivery_text") { value }
          cancellation_text: metafield(namespace: $ns, key: "cancellation_text") { value }
          period_text: metafield(namespace: $ns, key: "period_text") { value }
        }
      }`,
      {
        variables: { ns },
      },
    );

    const json = await response.json();

    if (hasRetryableGraphQLError(json)) {
      throw new Error("Throttled: GraphQL API rate limited");
    }

    return json;
  });

  const shop = result.data?.shop ?? {};
  const val = (alias: string) => shop[alias]?.value as string | undefined;

  return {
    enabled: val("enabled") === "true",
    quantityText: val("quantity_text") || CONFIRMATION_DEFAULTS.quantityText,
    priceText: val("price_text") || CONFIRMATION_DEFAULTS.priceText,
    paymentText: val("payment_text") || CONFIRMATION_DEFAULTS.paymentText,
    deliveryText: val("delivery_text") || CONFIRMATION_DEFAULTS.deliveryText,
    cancellationText: val("cancellation_text") || CONFIRMATION_DEFAULTS.cancellationText,
    periodText: val("period_text") || CONFIRMATION_DEFAULTS.periodText,
  };
}
