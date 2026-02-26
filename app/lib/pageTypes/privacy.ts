import { privacyStep1Schema, privacyStep2Schema, privacyFormSchema } from "../validation/privacy";
import { generatePrivacyHtml } from "../templates/privacy";
import { registerPageType } from "./registry";
import type { PrivacyFormData } from "../validation/privacy";

registerPageType({
  type: "privacy",
  title: "プライバシーポリシー作成",
  shopifyPageTitle: "プライバシーポリシー",
  handle: "privacy-policy",
  stepSchemas: [privacyStep1Schema, privacyStep2Schema],
  fullSchema: privacyFormSchema,
  steps: [
    { label: "Step 1", description: "基本情報" },
    { label: "Step 2", description: "収集・利用情報" },
    { label: "Step 3", description: "プレビュー & 公開" },
  ],
  generateHtml: (data) => generatePrivacyHtml(data as PrivacyFormData),
  requiredPlan: "basic",
});
