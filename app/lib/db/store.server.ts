import db from "../../db.server";

/**
 * Ensure a Store record exists for the given shop domain.
 * Creates one if it doesn't exist.
 */
export async function ensureStore(shopDomain: string) {
  return db.store.upsert({
    where: { shopDomain },
    create: {
      id: shopDomain,
      shopDomain,
    },
    update: {},
  });
}

/**
 * Delete all store data (for GDPR compliance).
 */
export async function deleteStoreData(shopDomain: string) {
  // LegalPages are cascade-deleted via the relation
  await db.store.delete({
    where: { shopDomain },
  }).catch(() => {
    // Store may not exist (already deleted)
  });
}
