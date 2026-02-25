import { z } from "zod";

// Shared field constraints
const MAX_TEXT_LENGTH = 500;
const MAX_LONG_TEXT_LENGTH = 2000;

// Japanese postal code: 123-4567 or 1234567
const postalCodeRegex = /^\d{3}-?\d{4}$/;

// Japanese phone number: various formats
const phoneRegex = /^0\d{1,4}-?\d{1,4}-?\d{3,4}$/;

// Step 1: Business Info
export const step1Schema = z.object({
  businessName: z
    .string()
    .min(1, "販売業者名を入力してください")
    .max(MAX_TEXT_LENGTH, `${MAX_TEXT_LENGTH}文字以内で入力してください`),
  representativeName: z
    .string()
    .min(1, "代表者名を入力してください")
    .max(MAX_TEXT_LENGTH, `${MAX_TEXT_LENGTH}文字以内で入力してください`),
  postalCode: z
    .string()
    .min(1, "郵便番号を入力してください")
    .regex(postalCodeRegex, "正しい郵便番号を入力してください（例: 123-4567）"),
  address: z
    .string()
    .min(1, "住所を入力してください")
    .max(MAX_TEXT_LENGTH, `${MAX_TEXT_LENGTH}文字以内で入力してください`),
  phone: z
    .string()
    .min(1, "電話番号を入力してください")
    .regex(phoneRegex, "正しい電話番号を入力してください（例: 03-1234-5678）"),
  email: z
    .string()
    .min(1, "メールアドレスを入力してください")
    .email("正しいメールアドレスを入力してください"),
  businessType: z.enum(["corporation", "individual"], {
    errorMap: () => ({ message: "事業者の種別を選択してください" }),
  }),
  addressDisclosure: z.enum(["public", "on_request"], {
    errorMap: () => ({ message: "住所公開設定を選択してください" }),
  }),
});

// Step 2: Sales Conditions
export const step2Schema = z.object({
  sellingPrice: z
    .string()
    .min(1, "販売価格の記載方法を入力してください")
    .max(MAX_LONG_TEXT_LENGTH),
  additionalFees: z
    .string()
    .min(1, "商品代金以外の必要料金を入力してください")
    .max(MAX_LONG_TEXT_LENGTH),
  paymentMethods: z
    .array(z.string())
    .min(1, "支払方法を1つ以上選択してください"),
  paymentTiming: z
    .string()
    .min(1, "支払時期を入力してください")
    .max(MAX_LONG_TEXT_LENGTH),
  deliveryTime: z
    .string()
    .min(1, "商品の引渡時期を入力してください")
    .max(MAX_LONG_TEXT_LENGTH),
  deliveryNotes: z
    .string()
    .max(MAX_LONG_TEXT_LENGTH)
    .default(""),
  returnPolicy: z
    .string()
    .min(1, "返品・交換の条件を入力してください")
    .max(MAX_LONG_TEXT_LENGTH),
  returnDeadline: z
    .string()
    .min(1, "返品期限を入力してください")
    .max(MAX_TEXT_LENGTH),
  returnShippingCost: z
    .string()
    .min(1, "返品送料の負担について入力してください")
    .max(MAX_TEXT_LENGTH),
  defectiveItemPolicy: z
    .string()
    .min(1, "商品の不良についての対応を入力してください")
    .max(MAX_LONG_TEXT_LENGTH),
  quantityLimit: z
    .string()
    .max(MAX_TEXT_LENGTH)
    .default(""),
});

// Full form validation (Step 1 + Step 2)
export const tokushohoFormSchema = step1Schema.merge(step2Schema);

export type Step1FormData = z.infer<typeof step1Schema>;
export type Step2FormData = z.infer<typeof step2Schema>;
export type TokushohoFormData = z.infer<typeof tokushohoFormSchema>;

/**
 * Validate form data for a specific step.
 */
export function validateStep(step: number, data: unknown) {
  switch (step) {
    case 1:
      return step1Schema.safeParse(data);
    case 2:
      return step2Schema.safeParse(data);
    default:
      return tokushohoFormSchema.safeParse(data);
  }
}

/**
 * Normalize postal code to have a hyphen (123-4567 format).
 */
export function normalizePostalCode(code: string): string {
  const digits = code.replace(/-/g, "");
  if (digits.length === 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  return code;
}

/**
 * Normalize phone number - keep as-is (accept both hyphenated and non-hyphenated).
 */
export function normalizePhone(phone: string): string {
  return phone.trim();
}
