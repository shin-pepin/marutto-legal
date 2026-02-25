import type { AdminApiContext } from "@shopify/shopify-app-remix/server";
import { withRetry } from "./retry.server";
import { ShopifyApiError } from "./pages.server";

interface MenuItem {
  id: string;
  title: string;
  url: string | null;
  resourceId: string | null;
  type: string;
}

interface Menu {
  id: string;
  title: string;
  handle: string;
  items: MenuItem[];
}

/**
 * Get all menus (navigations) for the store.
 */
export async function getMenus(admin: AdminApiContext): Promise<Menu[]> {
  return withRetry(async () => {
    const response = await admin.graphql(
      `#graphql
      query getMenus {
        menus(first: 50) {
          nodes {
            id
            title
            handle
            items(first: 100) {
              id
              title
              url
              resourceId
              type
            }
          }
        }
      }`,
    );

    const json = await response.json();
    const nodes = json.data?.menus?.nodes ?? [];

    return nodes.map((menu: {
      id: string;
      title: string;
      handle: string;
      items: MenuItem[];
    }) => ({
      id: menu.id,
      title: menu.title,
      handle: menu.handle,
      items: menu.items ?? [],
    }));
  });
}

/**
 * Check if a page URL already exists in a menu's items.
 */
export function hasPageInMenu(items: MenuItem[], pageUrl: string): boolean {
  const normalizedUrl = pageUrl.replace(/\/$/, "");
  return items.some((item) => {
    if (!item.url) return false;
    return item.url.replace(/\/$/, "") === normalizedUrl;
  });
}

/**
 * Add a page link to a menu.
 * Uses safe pattern: fetch all existing items → append → update.
 */
export async function addPageToMenu(
  admin: AdminApiContext,
  menuId: string,
  pageTitle: string,
  pageUrl: string,
): Promise<void> {
  return withRetry(async () => {
    // First fetch the current menu to get existing items
    const menuResponse = await admin.graphql(
      `#graphql
      query getMenu($id: ID!) {
        menu(id: $id) {
          id
          items(first: 100) {
            id
            title
            url
            type
          }
        }
      }`,
      { variables: { id: menuId } },
    );

    const menuJson = await menuResponse.json();
    const existingItems = menuJson.data?.menu?.items ?? [];

    // Check for duplicates
    if (hasPageInMenu(existingItems, pageUrl)) {
      return; // Already in menu, skip
    }

    // Rebuild existing items for the mutation input
    const existingItemInputs = existingItems.map((item: { title: string; url: string; type: string }) => ({
      title: item.title,
      url: item.url,
      type: item.type,
    }));

    // Add the new item
    const items = [
      ...existingItemInputs,
      {
        title: pageTitle,
        url: pageUrl,
        type: "HTTP",
      },
    ];

    const response = await admin.graphql(
      `#graphql
      mutation menuUpdate($id: ID!, $items: [MenuItemUpdateInput!]!) {
        menuUpdate(id: $id, items: $items) {
          menu {
            id
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          id: menuId,
          items,
        },
      },
    );

    const json = await response.json();
    const result = json.data?.menuUpdate;

    if (result?.userErrors?.length) {
      throw new ShopifyApiError(
        `メニューの更新に失敗しました: ${result.userErrors.map((e: { message: string }) => e.message).join(", ")}`,
      );
    }
  });
}
