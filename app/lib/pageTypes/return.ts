import { returnStep1Schema, returnStep2Schema, returnFormSchema } from "../validation/return";
import { generateReturnHtml } from "../templates/return";
import { registerPageType } from "./registry";
import type { ReturnFormData } from "../validation/return";

registerPageType({
  type: "return",
  title: "返品・交換ポリシー作成",
  description: "返品・交換に関するポリシーページ",
  shopifyPageTitle: "返品・交換ポリシー",
  handle: "return-policy",
  stepSchemas: [returnStep1Schema, returnStep2Schema],
  fullSchema: returnFormSchema,
  steps: [
    { label: "Step 1", description: "基本情報" },
    { label: "Step 2", description: "返品条件" },
    { label: "Step 3", description: "プレビュー & 公開" },
  ],
  generateHtml: (data) => generateReturnHtml(data as ReturnFormData),
  requiredPlan: "basic",
});
