import { z } from "zod";

const MAX_TEXT_LENGTH = 500;
const MAX_LONG_TEXT_LENGTH = 2000;

// 禁止事項の選択肢
export const PROHIBITED_ACTIONS_OPTIONS = [
  { value: "illegal", label: "法令または公序良俗に違反する行為" },
  { value: "ip_infringement", label: "知的財産権を侵害する行為" },
  { value: "defamation", label: "他者の名誉・信用を毀損する行為" },
  { value: "unauthorized_access", label: "不正アクセスまたはその試み" },
  { value: "commercial_use", label: "無断での商用利用" },
  { value: "service_disruption", label: "サービスの運営を妨害する行為" },
  { value: "impersonation", label: "他者へのなりすまし" },
  { value: "antisocial", label: "反社会的勢力への利益供与" },
] as const;

// 準拠法・裁判管轄の選択肢
export const JURISDICTION_OPTIONS = [
  { value: "tokyo", label: "東京地方裁判所" },
  { value: "osaka", label: "大阪地方裁判所" },
  { value: "nagoya", label: "名古屋地方裁判所" },
  { value: "fukuoka", label: "福岡地方裁判所" },
  { value: "sapporo", label: "札幌地方裁判所" },
  { value: "other", label: "その他" },
] as const;

const PROHIBITED_ACTIONS_VALUES = PROHIBITED_ACTIONS_OPTIONS.map((o) => o.value) as [string, ...string[]];
const JURISDICTION_VALUES = JURISDICTION_OPTIONS.map((o) => o.value) as [string, ...string[]];

// Step 1: 基本情報
export const termsStep1Schema = z.object({
  businessName: z
    .string()
    .min(1, "事業者名を入力してください")
    .max(MAX_TEXT_LENGTH),
  serviceName: z
    .string()
    .min(1, "サービス名を入力してください")
    .max(MAX_TEXT_LENGTH),
  siteUrl: z
    .string()
    .min(1, "サイトURLを入力してください")
    .url("正しいURLを入力してください（例: https://example.com）")
    .max(MAX_TEXT_LENGTH),
  email: z
    .string()
    .min(1, "メールアドレスを入力してください")
    .email("正しいメールアドレスを入力してください"),
});

// Step 2: 規約内容 (base object, used for merge)
const termsStep2BaseSchema = z.object({
  registrationRequirement: z
    .string()
    .min(1, "利用登録の要件を入力してください")
    .max(MAX_LONG_TEXT_LENGTH),
  prohibitedActions: z
    .array(z.enum(PROHIBITED_ACTIONS_VALUES))
    .min(1, "禁止事項を1つ以上選択してください"),
  prohibitedActionsOther: z
    .string()
    .max(MAX_LONG_TEXT_LENGTH)
    .default(""),
  intellectualProperty: z
    .string()
    .min(1, "知的財産権について入力してください")
    .max(MAX_LONG_TEXT_LENGTH),
  disclaimer: z
    .string()
    .min(1, "免責事項を入力してください")
    .max(MAX_LONG_TEXT_LENGTH),
  serviceInterruption: z
    .string()
    .min(1, "サービス中断ポリシーを入力してください")
    .max(MAX_LONG_TEXT_LENGTH),
  termsChangePolicy: z
    .string()
    .min(1, "規約変更ポリシーを入力してください")
    .max(MAX_LONG_TEXT_LENGTH),
  jurisdiction: z.enum(JURISDICTION_VALUES, {
    errorMap: () => ({ message: "準拠法・裁判管轄を選択してください" }),
  }),
  jurisdictionOther: z
    .string()
    .max(MAX_TEXT_LENGTH)
    .default(""),
  contactMethod: z
    .string()
    .min(1, "問い合わせ方法を入力してください")
    .max(MAX_LONG_TEXT_LENGTH),
});

// Step 2 with cross-field validation
export const termsStep2Schema = termsStep2BaseSchema.refine(
  (data) => data.jurisdiction !== "other" || data.jurisdictionOther.length > 0,
  { message: "「その他」を選択した場合は裁判管轄を入力してください", path: ["jurisdictionOther"] },
);

export const termsFormSchema = termsStep1Schema.merge(termsStep2BaseSchema).refine(
  (data) => data.jurisdiction !== "other" || data.jurisdictionOther.length > 0,
  { message: "「その他」を選択した場合は裁判管轄を入力してください", path: ["jurisdictionOther"] },
);

export type TermsStep1FormData = z.infer<typeof termsStep1Schema>;
export type TermsStep2FormData = z.infer<typeof termsStep2BaseSchema>;
export type TermsFormData = z.infer<typeof termsFormSchema>;

export function validateTermsStep(step: number, data: unknown) {
  switch (step) {
    case 1:
      return termsStep1Schema.safeParse(data);
    case 2:
      return termsStep2Schema.safeParse(data);
    default:
      return termsFormSchema.safeParse(data);
  }
}
