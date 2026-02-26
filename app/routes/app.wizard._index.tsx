import { redirect } from "@remix-run/node";
import { getAllPageTypes } from "../lib/pageTypes/registry";
import "../lib/pageTypes";

export const loader = () => {
  const firstType = getAllPageTypes()[0]?.type ?? "tokushoho";
  return redirect(`/app/wizard/${firstType}`);
};
