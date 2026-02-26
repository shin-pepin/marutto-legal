import { termsStep1Schema, termsStep2Schema, termsFormSchema } from "../validation/terms";
import { generateTermsHtml } from "../templates/terms";
import { registerPageType } from "./registry";
import type { TermsFormData } from "../validation/terms";

registerPageType({
  type: "terms",
  title: "利用規約作成",
  description: "サービスの利用条件を定める規約ページ",
  shopifyPageTitle: "利用規約",
  handle: "terms-of-service",
  stepSchemas: [termsStep1Schema, termsStep2Schema],
  fullSchema: termsFormSchema,
  steps: [
    { label: "Step 1", description: "基本情報" },
    { label: "Step 2", description: "規約内容" },
    { label: "Step 3", description: "プレビュー & 公開" },
  ],
  generateHtml: (data) => generateTermsHtml(data as TermsFormData),
  requiredPlan: "basic",
});
