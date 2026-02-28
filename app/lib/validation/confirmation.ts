import { z } from "zod";

const MAX_TEXT_LENGTH = 500;
const MAX_LONG_TEXT_LENGTH = 2000;

/**
 * Zod schema for the final confirmation screen settings.
 * 2022年改正特商法 第12条の6 — 最終確認画面に表示が義務付けられる6項目:
 * 1. 分量  2. 販売価格  3. 支払方法・時期  4. 引渡時期  5. 解除・返品事項  6. 申込期間
 */
// Base shape: max-length only (used when enabled: false)
const textFields = {
  quantityText: z.string().max(MAX_TEXT_LENGTH),
  priceText: z.string().max(MAX_LONG_TEXT_LENGTH),
  paymentText: z.string().max(MAX_LONG_TEXT_LENGTH),
  deliveryText: z.string().max(MAX_LONG_TEXT_LENGTH),
  cancellationText: z.string().max(MAX_LONG_TEXT_LENGTH),
  periodText: z.string().max(MAX_TEXT_LENGTH),
  checkboxLabel: z.string().max(MAX_TEXT_LENGTH),
};

// Required-text messages (used when enabled: true)
const requiredMessages: Record<keyof typeof textFields, string> = {
  quantityText: "分量に関する表示内容を入力してください",
  priceText: "販売価格に関する表示内容を入力してください",
  paymentText: "支払方法・時期に関する表示内容を入力してください",
  deliveryText: "引渡時期に関する表示内容を入力してください",
  cancellationText: "解除・返品に関する表示内容を入力してください",
  periodText: "申込期間に関する表示内容を入力してください",
  checkboxLabel: "チェックボックスラベルを入力してください",
};

export const confirmationSchema = z
  .object({
    enabled: z.boolean(),
    ...textFields,
  })
  .superRefine((data, ctx) => {
    // When disabled, skip min-length validation — allow empty fields
    if (!data.enabled) return;
    for (const [field, message] of Object.entries(requiredMessages)) {
      const value = data[field as keyof typeof textFields];
      if (!value || value.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.too_small,
          minimum: 1,
          type: "string",
          inclusive: true,
          message,
          path: [field],
        });
      }
    }
  });

export type ConfirmationFormData = z.infer<typeof confirmationSchema>;

/**
 * Default values for the confirmation form.
 * Provides sensible starting text for each legally required item.
 */
export const CONFIRMATION_DEFAULTS: ConfirmationFormData = {
  enabled: false,
  quantityText: "カート内に表示されている数量をご確認ください。",
  priceText:
    "カート内に表示されている商品金額・送料・手数料を含む合計金額をご確認ください。",
  paymentText:
    "お支払い方法はチェックアウト画面にてご選択いただけます。クレジットカード決済の場合、商品発送時にご請求いたします。",
  deliveryText:
    "ご注文確定後、通常3〜7営業日以内に発送いたします。配送状況は発送完了メールにてご確認いただけます。",
  cancellationText:
    "ご注文確定後のキャンセルは原則お受けできません。返品・交換については返品ポリシーをご確認ください。",
  periodText:
    "特に定めはありません。在庫がなくなり次第、販売を終了する場合がございます。",
  checkboxLabel:
    "上記の内容を確認しました",
};

/**
 * Metafield keys used for storing confirmation settings on Shop resource.
 * Regular namespace used so Liquid can access via shop.metafields["marutto_confirmation"]["key"].
 * ($app: prefix metafields are not directly accessible in Liquid templates.)
 */
export const CONFIRMATION_METAFIELD_NAMESPACE = "marutto_confirmation";

export const CONFIRMATION_METAFIELD_KEYS = {
  enabled: "enabled",
  quantityText: "quantity_text",
  priceText: "price_text",
  paymentText: "payment_text",
  deliveryText: "delivery_text",
  cancellationText: "cancellation_text",
  periodText: "period_text",
  checkboxLabel: "checkbox_label",
} as const;
