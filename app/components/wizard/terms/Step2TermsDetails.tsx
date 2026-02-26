import {
  FormLayout,
  TextField,
  ChoiceList,
  BlockStack,
  Card,
  Text,
  Select,
} from "@shopify/polaris";
import {
  PROHIBITED_ACTIONS_OPTIONS,
  JURISDICTION_OPTIONS,
} from "../../../lib/validation/terms";
import type { WizardStepProps } from "../pageTypeUI";

export function Step2TermsDetails({ formData, errors, onChange }: WizardStepProps) {
  return (
    <BlockStack gap="400">
      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">
            利用登録
          </Text>
          <FormLayout>
            <TextField
              label="利用登録の要件"
              value={formData.registrationRequirement || ""}
              onChange={(v) => onChange("registrationRequirement", v)}
              error={errors.registrationRequirement}
              multiline={3}
              autoComplete="off"
              helpText="例: 本サービスの利用を希望する方は、所定の方法で利用登録を申請してください。"
            />
          </FormLayout>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">
            禁止事項
          </Text>
          <FormLayout>
            <ChoiceList
              title="禁止事項を選択してください"
              allowMultiple
              choices={PROHIBITED_ACTIONS_OPTIONS.map((o) => ({
                label: o.label,
                value: o.value,
              }))}
              selected={formData.prohibitedActions || []}
              onChange={(v) => onChange("prohibitedActions", v)}
              error={errors.prohibitedActions}
            />
            <TextField
              label="その他の禁止事項（任意）"
              value={formData.prohibitedActionsOther || ""}
              onChange={(v) => onChange("prohibitedActionsOther", v)}
              error={errors.prohibitedActionsOther}
              multiline={2}
              autoComplete="off"
              helpText="上記以外に禁止したい行為があれば記入してください"
            />
          </FormLayout>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">
            知的財産権・免責事項
          </Text>
          <FormLayout>
            <TextField
              label="知的財産権"
              value={formData.intellectualProperty || ""}
              onChange={(v) => onChange("intellectualProperty", v)}
              error={errors.intellectualProperty}
              multiline={3}
              autoComplete="off"
              helpText="例: 本サービスに関する知的財産権はすべて当社に帰属します。"
            />
            <TextField
              label="免責事項"
              value={formData.disclaimer || ""}
              onChange={(v) => onChange("disclaimer", v)}
              error={errors.disclaimer}
              multiline={3}
              autoComplete="off"
              helpText="例: 当社は、本サービスの利用により生じた損害について一切の責任を負いません。"
            />
          </FormLayout>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">
            サービス運営・準拠法
          </Text>
          <FormLayout>
            <TextField
              label="サービス中断ポリシー"
              value={formData.serviceInterruption || ""}
              onChange={(v) => onChange("serviceInterruption", v)}
              error={errors.serviceInterruption}
              multiline={3}
              autoComplete="off"
              helpText="例: メンテナンスや障害時にサービスを中断する場合の方針"
            />
            <TextField
              label="規約変更ポリシー"
              value={formData.termsChangePolicy || ""}
              onChange={(v) => onChange("termsChangePolicy", v)}
              error={errors.termsChangePolicy}
              multiline={3}
              autoComplete="off"
              helpText="例: 規約を変更する場合の通知方法や適用時期"
            />
            <Select
              label="準拠法・裁判管轄"
              options={[
                { label: "選択してください", value: "" },
                ...JURISDICTION_OPTIONS.map((o) => ({
                  label: o.label,
                  value: o.value,
                })),
              ]}
              value={formData.jurisdiction || ""}
              onChange={(v) => onChange("jurisdiction", v)}
              error={errors.jurisdiction}
            />
            {formData.jurisdiction === "other" && (
              <TextField
                label="裁判管轄（その他）"
                value={formData.jurisdictionOther || ""}
                onChange={(v) => onChange("jurisdictionOther", v)}
                error={errors.jurisdictionOther}
                autoComplete="off"
                helpText="裁判管轄となる裁判所名を入力してください"
              />
            )}
            <TextField
              label="お問い合わせ方法"
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
