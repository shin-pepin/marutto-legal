import { z } from "zod";

const MAX_TEXT_LENGTH = 500;
const MAX_LONG_TEXT_LENGTH = 2000;

// 返品条件の選択肢
export const RETURN_CONDITION_OPTIONS = [
  { value: "unused_only", label: "未使用・未開封のみ" },
  { value: "defective_only", label: "不良品のみ" },
  { value: "both", label: "両方対応（未使用・未開封および不良品）" },
  { value: "no_returns", label: "返品不可" },
] as const;

// 返送料負担の選択肢
export const SHIPPING_COST_OPTIONS = [
  { value: "customer", label: "お客様負担" },
  { value: "store", label: "当店負担" },
  { value: "defective_store", label: "不良品は当店負担、それ以外はお客様負担" },
] as const;

// 交換対応の選択肢
export const EXCHANGE_OPTIONS = [
  { value: "available", label: "交換対応可能" },
  { value: "unavailable", label: "交換対応不可（返品・返金のみ）" },
  { value: "defective_only", label: "不良品のみ交換対応" },
] as const;

// 返金方法の選択肢
export const REFUND_METHOD_OPTIONS = [
  { value: "original_payment", label: "元の支払方法に返金" },
  { value: "bank_transfer", label: "銀行振込" },
  { value: "store_credit", label: "ストアクレジット" },
  { value: "flexible", label: "お客様のご要望に応じて柔軟に対応" },
] as const;

const RETURN_CONDITION_VALUES = RETURN_CONDITION_OPTIONS.map((o) => o.value) as [string, ...string[]];
const SHIPPING_COST_VALUES = SHIPPING_COST_OPTIONS.map((o) => o.value) as [string, ...string[]];
const EXCHANGE_VALUES = EXCHANGE_OPTIONS.map((o) => o.value) as [string, ...string[]];
const REFUND_METHOD_VALUES = REFUND_METHOD_OPTIONS.map((o) => o.value) as [string, ...string[]];

// Step 1: 基本情報
export const returnStep1Schema = z.object({
  businessName: z
    .string()
    .min(1, "事業者名を入力してください")
    .max(MAX_TEXT_LENGTH),
  email: z
    .string()
    .min(1, "メールアドレスを入力してください")
    .email("正しいメールアドレスを入力してください"),
  phone: z
    .string()
    .min(1, "電話番号を入力してください")
    .max(20, "電話番号は20文字以内で入力してください")
    .regex(/^[\d\-+()\s]+$/, "正しい電話番号を入力してください"),
  siteUrl: z
    .string()
    .min(1, "サイトURLを入力してください")
    .url("正しいURLを入力してください（例: https://example.com）")
    .max(MAX_TEXT_LENGTH),
});

// Step 2: 返品条件 (base object, used for merge)
const returnStep2BaseSchema = z.object({
  returnDeadline: z
    .string()
    .max(MAX_TEXT_LENGTH)
    .default(""),
  returnCondition: z.enum(RETURN_CONDITION_VALUES, {
    errorMap: () => ({ message: "返品条件を選択してください" }),
  }),
  shippingCost: z.enum(SHIPPING_COST_VALUES, {
    errorMap: () => ({ message: "返送料負担を選択してください" }),
  }),
  exchangePolicy: z.enum(EXCHANGE_VALUES, {
    errorMap: () => ({ message: "交換対応を選択してください" }),
  }),
  refundMethod: z.enum(REFUND_METHOD_VALUES, {
    errorMap: () => ({ message: "返金方法を選択してください" }),
  }),
  refundTiming: z
    .string()
    .max(MAX_TEXT_LENGTH)
    .default(""),
  defectiveHandling: z
    .string()
    .max(MAX_LONG_TEXT_LENGTH)
    .default(""),
  returnProcess: z
    .string()
    .max(MAX_LONG_TEXT_LENGTH)
    .default(""),
  nonReturnableItems: z
    .string()
    .max(MAX_LONG_TEXT_LENGTH)
    .default(""),
  contactMethod: z
    .string()
    .min(1, "問い合わせ方法を入力してください")
    .max(MAX_LONG_TEXT_LENGTH),
});

const isNotNoReturns = (data: { returnCondition: string }) => data.returnCondition !== "no_returns";

function addReturnRefines<T extends z.ZodTypeAny>(schema: T) {
  return schema
    .refine(
      (data: z.infer<typeof returnStep2BaseSchema>) =>
        !isNotNoReturns(data) || data.returnDeadline.length > 0,
      { message: "返品期限を入力してください", path: ["returnDeadline"] },
    )
    .refine(
      (data: z.infer<typeof returnStep2BaseSchema>) =>
        !isNotNoReturns(data) || data.refundTiming.length > 0,
      { message: "返金タイミングを入力してください", path: ["refundTiming"] },
    )
    .refine(
      (data: z.infer<typeof returnStep2BaseSchema>) =>
        !isNotNoReturns(data) || data.defectiveHandling.length > 0,
      { message: "不良品対応について入力してください", path: ["defectiveHandling"] },
    )
    .refine(
      (data: z.infer<typeof returnStep2BaseSchema>) =>
        !isNotNoReturns(data) || data.returnProcess.length > 0,
      { message: "返品手順を入力してください", path: ["returnProcess"] },
    );
}

// Step 2 with cross-field validation
export const returnStep2Schema = addReturnRefines(returnStep2BaseSchema);

export const returnFormSchema = addReturnRefines(returnStep1Schema.merge(returnStep2BaseSchema));

export type ReturnStep1FormData = z.infer<typeof returnStep1Schema>;
export type ReturnStep2FormData = z.infer<typeof returnStep2BaseSchema>;
export type ReturnFormData = z.infer<typeof returnFormSchema>;

export function validateReturnStep(step: number, data: unknown) {
  switch (step) {
    case 1:
      return returnStep1Schema.safeParse(data);
    case 2:
      return returnStep2Schema.safeParse(data);
    default:
      return returnFormSchema.safeParse(data);
  }
}
