import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";

export function buildLoaderArgs(
  overrides?: Partial<{ params: Record<string, string>; url: string }>,
): LoaderFunctionArgs {
  const url = overrides?.url || "https://test-store.myshopify.com/app";
  return {
    request: new Request(url, { method: "GET" }),
    params: overrides?.params || {},
    context: {},
  };
}

export function buildActionArgs(
  formData: Record<string, string>,
  overrides?: Partial<{ params: Record<string, string>; url: string; method: string }>,
): ActionFunctionArgs {
  const url = overrides?.url || "https://test-store.myshopify.com/app";
  const body = new URLSearchParams(formData);
  return {
    request: new Request(url, {
      method: overrides?.method || "POST",
      body,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }),
    params: overrides?.params || {},
    context: {},
  };
}
