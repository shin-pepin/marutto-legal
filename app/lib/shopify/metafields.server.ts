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
    { namespace: ns, key: keys.checkboxLabel, type: "single_line_text_field", value: config.checkboxLabel },
  ];
}

/**
 * Get the current shop's GID (e.g. "gid://shopify/Shop/12345678").
 * Required for metafieldsSet mutation ownerId.
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
 * Returns parsed ConfirmationFormData, falling back to defaults for missing fields.
 */
export async function getConfirmationMetafields(
  admin: AdminApiContext,
): Promise<ConfirmationFormData> {
  const ns = CONFIRMATION_METAFIELD_NAMESPACE;
  const keys = Object.values(CONFIRMATION_METAFIELD_KEYS);

  const result = await withRetry(async () => {
    const response = await admin.graphql(
      `#graphql
      query getShopMetafields($namespace: String!, $keys: [String!]!) {
        shop {
          metafields(namespace: $namespace, keys: $keys, first: 10) {
            edges {
              node {
                key
                value
              }
            }
          }
        }
      }`,
      {
        variables: { namespace: ns, keys },
      },
    );

    const json = await response.json();

    if (hasRetryableGraphQLError(json)) {
      throw new Error("Throttled: GraphQL API rate limited");
    }

    return json;
  });

  // Build a key-value map from the response
  const edges = result.data?.shop?.metafields?.edges ?? [];
  const metaMap = new Map<string, string>();
  for (const edge of edges) {
    if (edge.node) {
      metaMap.set(edge.node.key, edge.node.value);
    }
  }

  const k = CONFIRMATION_METAFIELD_KEYS;

  return {
    enabled: metaMap.get(k.enabled) === "true",
    quantityText: metaMap.get(k.quantityText) || CONFIRMATION_DEFAULTS.quantityText,
    priceText: metaMap.get(k.priceText) || CONFIRMATION_DEFAULTS.priceText,
    paymentText: metaMap.get(k.paymentText) || CONFIRMATION_DEFAULTS.paymentText,
    deliveryText: metaMap.get(k.deliveryText) || CONFIRMATION_DEFAULTS.deliveryText,
    cancellationText: metaMap.get(k.cancellationText) || CONFIRMATION_DEFAULTS.cancellationText,
    periodText: metaMap.get(k.periodText) || CONFIRMATION_DEFAULTS.periodText,
    checkboxLabel: metaMap.get(k.checkboxLabel) || CONFIRMATION_DEFAULTS.checkboxLabel,
  };
}
