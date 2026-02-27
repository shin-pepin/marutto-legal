import {
  FormLayout,
  TextField,
  BlockStack,
  Card,
  Text,
  Select,
} from "@shopify/polaris";
import {
  RETURN_CONDITION_OPTIONS,
  SHIPPING_COST_OPTIONS,
  EXCHANGE_OPTIONS,
  REFUND_METHOD_OPTIONS,
} from "../../../lib/validation/return";
import type { WizardStepProps } from "../pageTypeUI";

export function Step2ReturnDetails({ formData, errors, onChange }: WizardStepProps) {
  const isNoReturns = formData.returnCondition === "no_returns";

  return (
    <BlockStack gap="400">
      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">
            返品・交換の条件
          </Text>
          <FormLayout>
            <Select
              label="返品条件"
              options={[
                { label: "選択してください", value: "" },
                ...RETURN_CONDITION_OPTIONS.map((o) => ({
                  label: o.label,
                  value: o.value,
                })),
              ]}
              value={formData.returnCondition || ""}
              onChange={(v) => onChange("returnCondition", v)}
              error={errors.returnCondition}
            />
            {!isNoReturns && (
              <TextField
                label="返品期限"
                value={formData.returnDeadline || ""}
                onChange={(v) => onChange("returnDeadline", v)}
                error={errors.returnDeadline}
                autoComplete="off"
                helpText="例: 商品到着後7日以内"
              />
            )}
            <Select
              label="返送料負担"
              options={[
                { label: "選択してください", value: "" },
                ...SHIPPING_COST_OPTIONS.map((o) => ({
                  label: o.label,
                  value: o.value,
                })),
              ]}
              value={formData.shippingCost || ""}
              onChange={(v) => onChange("shippingCost", v)}
              error={errors.shippingCost}
            />
            <Select
              label="交換対応"
              options={[
                { label: "選択してください", value: "" },
                ...EXCHANGE_OPTIONS.map((o) => ({
                  label: o.label,
                  value: o.value,
                })),
              ]}
              value={formData.exchangePolicy || ""}
              onChange={(v) => onChange("exchangePolicy", v)}
              error={errors.exchangePolicy}
            />
          </FormLayout>
        </BlockStack>
      </Card>

      {!isNoReturns && (
        <>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                返金について
              </Text>
              <FormLayout>
                <Select
                  label="返金方法"
                  options={[
                    { label: "選択してください", value: "" },
                    ...REFUND_METHOD_OPTIONS.map((o) => ({
                      label: o.label,
                      value: o.value,
                    })),
                  ]}
                  value={formData.refundMethod || ""}
                  onChange={(v) => onChange("refundMethod", v)}
                  error={errors.refundMethod}
                />
                <TextField
                  label="返金タイミング"
                  value={formData.refundTiming || ""}
                  onChange={(v) => onChange("refundTiming", v)}
                  error={errors.refundTiming}
                  autoComplete="off"
                  helpText="例: 返品商品到着確認後、5営業日以内"
                />
              </FormLayout>
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                不良品対応・返品手順
              </Text>
              <FormLayout>
                <TextField
                  label="不良品対応"
                  value={formData.defectiveHandling || ""}
                  onChange={(v) => onChange("defectiveHandling", v)}
                  error={errors.defectiveHandling}
                  multiline={3}
                  autoComplete="off"
                  helpText="例: 不良品が届いた場合は、送料当店負担で交換いたします。"
                />
                <TextField
                  label="返品手順"
                  value={formData.returnProcess || ""}
                  onChange={(v) => onChange("returnProcess", v)}
                  error={errors.returnProcess}
                  multiline={3}
                  autoComplete="off"
                  helpText="例: 1. お問い合わせフォームからご連絡 2. 返品承認後、商品を返送 3. 確認後に返金処理"
                />
                <TextField
                  label="返品・交換不可の商品（任意）"
                  value={formData.nonReturnableItems || ""}
                  onChange={(v) => onChange("nonReturnableItems", v)}
                  error={errors.nonReturnableItems}
                  multiline={3}
                  autoComplete="off"
                  helpText="例: セール品、名入れ商品、食品など"
                />
              </FormLayout>
            </BlockStack>
          </Card>
        </>
      )}

      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">
            お問い合わせ
          </Text>
          <FormLayout>
            <TextField
              label="問い合わせ方法"
              value={formData.contactMethod || ""}
              onChange={(v) => onChange("contactMethod", v)}
              error={errors.contactMethod}
              multiline={2}
              autoComplete="off"
              helpText="例: メール (support@example.com) または問い合わせフォーム"
            />
          </FormLayout>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
