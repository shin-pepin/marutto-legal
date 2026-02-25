import db from "../../db.server";
import type { PageType, PageStatus } from "../../types/wizard";

/**
 * Get a legal page by store and page type.
 */
export async function getLegalPage(storeId: string, pageType: PageType) {
  return db.legalPage.findUnique({
    where: {
      storeId_pageType: { storeId, pageType },
    },
  });
}

/**
 * Get all legal pages for a store.
 */
export async function getLegalPages(storeId: string) {
  return db.legalPage.findMany({
    where: { storeId },
    orderBy: { updatedAt: "desc" },
  });
}

/**
 * Create or update a legal page's form data (auto-save / draft).
 * Uses optimistic locking via version field.
 */
export async function upsertLegalPageDraft(
  storeId: string,
  pageType: PageType,
  formData: string,
  expectedVersion?: number,
) {
  const existing = await getLegalPage(storeId, pageType);

  if (existing) {
    // Optimistic lock check
    if (expectedVersion !== undefined && existing.version !== expectedVersion) {
      throw new OptimisticLockError(
        "このページは別のセッションで更新されています。再読み込みしてください。",
      );
    }

    return db.legalPage.update({
      where: { id: existing.id },
      data: {
        formData,
        version: existing.version + 1,
      },
    });
  }

  return db.legalPage.create({
    data: {
      storeId,
      pageType,
      formData,
      status: "draft",
    },
  });
}

/**
 * Publish a legal page (update with generated HTML and Shopify page ID).
 * Uses optimistic locking via version field.
 */
export async function publishLegalPage(
  storeId: string,
  pageType: PageType,
  data: {
    shopifyPageId: string;
    contentHtml: string;
    formData: string;
  },
  expectedVersion?: number,
) {
  const existing = await getLegalPage(storeId, pageType);

  if (existing) {
    if (expectedVersion !== undefined && existing.version !== expectedVersion) {
      throw new OptimisticLockError(
        "このページは別のセッションで更新されています。再読み込みしてください。",
      );
    }

    return db.legalPage.update({
      where: { id: existing.id },
      data: {
        ...data,
        status: "published" as PageStatus,
        version: existing.version + 1,
      },
    });
  }

  return db.legalPage.create({
    data: {
      storeId,
      pageType,
      ...data,
      status: "published",
    },
  });
}

/**
 * Mark a page as deleted on Shopify side.
 */
export async function markDeletedOnShopify(pageId: string) {
  return db.legalPage.update({
    where: { id: pageId },
    data: {
      status: "deleted_on_shopify",
      shopifyPageId: null,
    },
  });
}

export class OptimisticLockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OptimisticLockError";
  }
}
