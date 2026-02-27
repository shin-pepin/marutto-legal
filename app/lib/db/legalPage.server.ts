import db from "../../db.server";
import type { PageType, PageStatus } from "../../types/wizard";
import { encryptFormData, decryptFormData } from "../crypto.server";

/**
 * Decrypt formData field if present and encrypted.
 */
function decryptPageFormData<T extends { formData: string | null }>(page: T): T {
  if (page.formData) {
    return { ...page, formData: decryptFormData(page.formData) };
  }
  return page;
}

/**
 * Get a legal page by store and page type (with decrypted formData).
 */
export async function getLegalPage(storeId: string, pageType: PageType) {
  const page = await db.legalPage.findUnique({
    where: {
      storeId_pageType: { storeId, pageType },
    },
  });
  return page ? decryptPageFormData(page) : null;
}

/**
 * Get page metadata (id, version, shopifyPageId, status) without decrypting formData.
 * Use this when you only need metadata (e.g., for optimistic lock checks).
 */
export async function getLegalPageMeta(storeId: string, pageType: PageType) {
  return db.legalPage.findUnique({
    where: {
      storeId_pageType: { storeId, pageType },
    },
    select: {
      id: true,
      version: true,
      shopifyPageId: true,
      status: true,
    },
  });
}

/**
 * Pre-check optimistic lock version before external API calls.
 * Throws OptimisticLockError if the version doesn't match.
 */
export async function checkVersionOrThrow(
  storeId: string,
  pageType: PageType,
  expectedVersion: number | undefined,
): Promise<void> {
  if (expectedVersion === undefined) return;
  const meta = await getLegalPageMeta(storeId, pageType);
  if (meta && meta.version !== expectedVersion) {
    throw new OptimisticLockError(
      "このページは別のセッションで更新されています。再読み込みしてください。",
    );
  }
}

/**
 * Get all legal pages for a store.
 */
export async function getLegalPages(storeId: string) {
  const pages = await db.legalPage.findMany({
    where: { storeId },
    orderBy: { updatedAt: "desc" },
  });
  return pages.map(decryptPageFormData);
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
  const existing = await getLegalPageMeta(storeId, pageType);
  const encryptedFormData = encryptFormData(formData);

  if (existing) {
    if (expectedVersion !== undefined) {
      // Atomic check-and-update to prevent TOCTOU race
      const result = await db.legalPage.updateMany({
        where: { id: existing.id, version: expectedVersion },
        data: {
          formData: encryptedFormData,
          version: expectedVersion + 1,
        },
      });
      if (result.count === 0) {
        throw new OptimisticLockError(
          "このページは別のセッションで更新されています。再読み込みしてください。",
        );
      }
      return db.legalPage.findUniqueOrThrow({ where: { id: existing.id } });
    }

    return db.legalPage.update({
      where: { id: existing.id },
      data: {
        formData: encryptedFormData,
        version: existing.version + 1,
      },
    });
  }

  return db.legalPage.create({
    data: {
      storeId,
      pageType,
      formData: encryptedFormData,
      status: "draft",
    },
  });
}

/**
 * Publish a legal page (update with generated HTML and Shopify page ID).
 * Uses optimistic locking via version field.
 * Optionally sets formSchemaVersion (template version at publish time).
 */
export async function publishLegalPage(
  storeId: string,
  pageType: PageType,
  data: {
    shopifyPageId: string;
    contentHtml: string;
    formData: string;
    formSchemaVersion?: number;
  },
  expectedVersion?: number,
) {
  const { formSchemaVersion, ...rest } = data;
  const encryptedData = {
    ...rest,
    formData: encryptFormData(rest.formData),
    ...(formSchemaVersion !== undefined ? { formSchemaVersion } : {}),
  };

  const existing = await getLegalPageMeta(storeId, pageType);

  if (existing) {
    if (expectedVersion !== undefined) {
      // Atomic check-and-update to prevent TOCTOU race
      const result = await db.legalPage.updateMany({
        where: { id: existing.id, version: expectedVersion },
        data: {
          ...encryptedData,
          status: "published" as PageStatus,
          version: expectedVersion + 1,
        },
      });
      if (result.count === 0) {
        throw new OptimisticLockError(
          "このページは別のセッションで更新されています。再読み込みしてください。",
        );
      }
      return db.legalPage.findUniqueOrThrow({ where: { id: existing.id } });
    }

    return db.legalPage.update({
      where: { id: existing.id },
      data: {
        ...encryptedData,
        status: "published" as PageStatus,
        version: existing.version + 1,
      },
    });
  }

  // First-time creation: expectedVersion is not applicable (no existing record to lock).
  if (expectedVersion !== undefined) {
    console.warn(
      `[legalPage] publishLegalPage: expectedVersion=${expectedVersion} was provided but no existing page found for ${storeId}/${pageType}. Ignoring version for initial creation.`,
    );
  }

  return db.legalPage.create({
    data: {
      storeId,
      pageType,
      ...encryptedData,
      status: "published",
    },
  });
}

/**
 * Update a published legal page's content and formSchemaVersion.
 * Used by template update flow (re-generate from existing formData).
 */
export async function updateLegalPageVersion(
  pageId: string,
  newVersion: number,
  contentHtml: string,
) {
  return db.legalPage.update({
    where: { id: pageId },
    data: {
      contentHtml,
      formSchemaVersion: newVersion,
      version: { increment: 1 },
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
