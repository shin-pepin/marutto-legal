import type { AdminApiContext } from "@shopify/shopify-app-remix/server";

interface CreatePageInput {
  title: string;
  handle?: string;
  bodyHtml: string;
  published?: boolean;
}

interface CreatePageResult {
  pageId: string;
  handle: string;
}

/**
 * Create a page on Shopify via GraphQL Admin API.
 */
export async function createPage(
  admin: AdminApiContext,
  input: CreatePageInput,
): Promise<CreatePageResult> {
  const response = await admin.graphql(
    `#graphql
    mutation pageCreate($page: PageCreateInput!) {
      pageCreate(page: $page) {
        page {
          id
          handle
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      variables: {
        page: {
          title: input.title,
          ...(input.handle ? { handle: input.handle } : {}),
          body: input.bodyHtml,
          isPublished: input.published ?? true,
        },
      },
    },
  );

  const json = await response.json();
  const result = json.data?.pageCreate;

  if (result?.userErrors?.length) {
    throw new ShopifyApiError(
      `ページの作成に失敗しました: ${result.userErrors.map((e: { message: string }) => e.message).join(", ")}`,
    );
  }

  if (!result?.page) {
    throw new ShopifyApiError("ページの作成に失敗しました。");
  }

  return {
    pageId: result.page.id,
    handle: result.page.handle,
  };
}

/**
 * Update an existing page on Shopify via GraphQL Admin API.
 */
export async function updatePage(
  admin: AdminApiContext,
  pageId: string,
  input: { title?: string; bodyHtml?: string; published?: boolean },
) {
  const page: Record<string, unknown> = {};
  if (input.title !== undefined) page.title = input.title;
  if (input.bodyHtml !== undefined) page.body = input.bodyHtml;
  if (input.published !== undefined) page.isPublished = input.published;

  const response = await admin.graphql(
    `#graphql
    mutation pageUpdate($id: ID!, $page: PageUpdateInput!) {
      pageUpdate(id: $id, page: $page) {
        page {
          id
          handle
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      variables: { id: pageId, page },
    },
  );

  const json = await response.json();
  const result = json.data?.pageUpdate;

  if (result?.userErrors?.length) {
    throw new ShopifyApiError(
      `ページの更新に失敗しました: ${result.userErrors.map((e: { message: string }) => e.message).join(", ")}`,
    );
  }

  return result?.page;
}

/**
 * Check if a page still exists on Shopify.
 */
export async function getPage(admin: AdminApiContext, pageId: string) {
  const response = await admin.graphql(
    `#graphql
    query getPage($id: ID!) {
      page(id: $id) {
        id
        title
        handle
        isPublished
      }
    }`,
    { variables: { id: pageId } },
  );

  const json = await response.json();
  return json.data?.page ?? null;
}

export class ShopifyApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShopifyApiError";
  }
}
