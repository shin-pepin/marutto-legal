import { z } from "zod";

const MAX_TEXT_LENGTH = 500;
const MAX_LONG_TEXT_LENGTH = 2000;

// Step 1: 基本情報
export const privacyStep1Schema = z.object({
  businessName: z
    .string()
    .min(1, "事業者名を入力してください")
    .max(MAX_TEXT_LENGTH),
  representativeName: z
    .string()
    .min(1, "代表者名を入力してください")
    .max(MAX_TEXT_LENGTH),
  address: z
    .string()
    .min(1, "住所を入力してください")
    .max(MAX_TEXT_LENGTH),
  email: z
    .string()
    .min(1, "メールアドレスを入力してください")
    .email("正しいメールアドレスを入力してください"),
  siteUrl: z
    .string()
    .min(1, "サイトURLを入力してください")
    .url("正しいURLを入力してください（例: https://example.com）")
    .max(MAX_TEXT_LENGTH),
});

// Step 2: 収集・利用情報
export const privacyStep2Schema = z.object({
  collectedInfo: z
    .array(z.string())
    .min(1, "収集する個人情報を1つ以上選択してください"),
  collectedInfoOther: z
    .string()
    .max(MAX_LONG_TEXT_LENGTH)
    .default(""),
  purposeOfUse: z
    .array(z.string())
    .min(1, "利用目的を1つ以上選択してください"),
  purposeOfUseOther: z
    .string()
    .max(MAX_LONG_TEXT_LENGTH)
    .default(""),
  thirdPartySharing: z.enum(["none", "with_consent", "partial"], {
    errorMap: () => ({ message: "第三者提供の方針を選択してください" }),
  }),
  thirdPartySharingDetail: z
    .string()
    .max(MAX_LONG_TEXT_LENGTH)
    .default(""),
  useCookies: z.enum(["yes", "no"], {
    errorMap: () => ({ message: "Cookie使用の有無を選択してください" }),
  }),
  cookieDetail: z
    .string()
    .max(MAX_LONG_TEXT_LENGTH)
    .default(""),
  useAnalytics: z.enum(["yes", "no"], {
    errorMap: () => ({ message: "アクセス解析ツールの使用を選択してください" }),
  }),
  analyticsTools: z
    .string()
    .max(MAX_TEXT_LENGTH)
    .default(""),
  retentionPeriod: z
    .string()
    .min(1, "保存期間を入力してください")
    .max(MAX_TEXT_LENGTH),
  securityMeasures: z
    .string()
    .min(1, "セキュリティ対策を入力してください")
    .max(MAX_LONG_TEXT_LENGTH),
  contactMethod: z
    .string()
    .min(1, "問い合わせ方法を入力してください")
    .max(MAX_LONG_TEXT_LENGTH),
});

export const privacyFormSchema = privacyStep1Schema.merge(privacyStep2Schema);

export type PrivacyStep1FormData = z.infer<typeof privacyStep1Schema>;
export type PrivacyStep2FormData = z.infer<typeof privacyStep2Schema>;
export type PrivacyFormData = z.infer<typeof privacyFormSchema>;

export function validatePrivacyStep(step: number, data: unknown) {
  switch (step) {
    case 1:
      return privacyStep1Schema.safeParse(data);
    case 2:
      return privacyStep2Schema.safeParse(data);
    default:
      return privacyFormSchema.safeParse(data);
  }
}

export const COLLECTED_INFO_OPTIONS = [
  { value: "name", label: "氏名" },
  { value: "email", label: "メールアドレス" },
  { value: "address", label: "住所" },
  { value: "phone", label: "電話番号" },
  { value: "birthday", label: "生年月日" },
  { value: "payment", label: "決済情報（クレジットカード番号等）" },
  { value: "purchase_history", label: "購入履歴" },
  { value: "ip_address", label: "IPアドレス" },
  { value: "cookie", label: "Cookie情報" },
] as const;

export const PURPOSE_OF_USE_OPTIONS = [
  { value: "order_processing", label: "ご注文の処理・配送" },
  { value: "customer_support", label: "お問い合わせへの対応" },
  { value: "marketing", label: "新商品・セール等のご案内" },
  { value: "service_improvement", label: "サービスの改善・開発" },
  { value: "analytics", label: "アクセス解析・統計情報の作成" },
  { value: "legal", label: "法令に基づく対応" },
  { value: "fraud_prevention", label: "不正行為の防止" },
] as const;
