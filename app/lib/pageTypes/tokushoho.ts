import { step1Schema, step2Schema, tokushohoFormSchema, normalizePostalCode } from "../validation/wizard";
import { generateTokushohoHtml } from "../templates/tokushoho";
import { registerPageType } from "./registry";
import type { TokushohoFormData } from "../../types/wizard";

registerPageType({
  type: "tokushoho",
  title: "特商法ページ作成",
  description: "ECサイトに必須の法的表記ページ",
  shopifyPageTitle: "特定商取引法に基づく表記",
  handle: "legal",
  stepSchemas: [step1Schema, step2Schema],
  fullSchema: tokushohoFormSchema,
  steps: [
    { label: "Step 1", description: "事業者情報" },
    { label: "Step 2", description: "販売条件" },
    { label: "Step 3", description: "プレビュー & 公開" },
  ],
  generateHtml: (data) => generateTokushohoHtml(data as TokushohoFormData),
  normalizeData: (data) => ({
    ...data,
    postalCode: normalizePostalCode(data.postalCode as string),
  }),
  sections: {
    payment: true,
    delivery: true,
    returns: true,
  },
  requiredPlan: "free",
  templateVersion: 1,
  versionHistory: [{ version: 1, date: "2026-02-27", summary: "初期バージョン" }],
});
