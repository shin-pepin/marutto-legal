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
  COLLECTED_INFO_OPTIONS,
  PURPOSE_OF_USE_OPTIONS,
} from "../../../lib/validation/privacy";

interface Step2Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formData: Record<string, any>;
  errors: Record<string, string>;
  onChange: (field: string, value: string | string[]) => void;
}

export function Step2DataCollection({ formData, errors, onChange }: Step2Props) {
  return (
    <BlockStack gap="400">
      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">
            収集する個人情報
          </Text>
          <FormLayout>
            <ChoiceList
              title="収集する個人情報を選択してください"
              allowMultiple
              choices={COLLECTED_INFO_OPTIONS.map((o) => ({
                label: o.label,
                value: o.value,
              }))}
              selected={formData.collectedInfo || []}
              onChange={(v) => onChange("collectedInfo", v)}
              error={errors.collectedInfo}
            />
            <TextField
              label="その他の収集情報（任意）"
              value={formData.collectedInfoOther || ""}
              onChange={(v) => onChange("collectedInfoOther", v)}
              error={errors.collectedInfoOther}
              multiline={2}
              autoComplete="off"
              helpText="上記以外に収集する情報があれば記入してください"
            />
          </FormLayout>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">
            利用目的
          </Text>
          <FormLayout>
            <ChoiceList
              title="個人情報の利用目的を選択してください"
              allowMultiple
              choices={PURPOSE_OF_USE_OPTIONS.map((o) => ({
                label: o.label,
                value: o.value,
              }))}
              selected={formData.purposeOfUse || []}
              onChange={(v) => onChange("purposeOfUse", v)}
              error={errors.purposeOfUse}
            />
            <TextField
              label="その他の利用目的（任意）"
              value={formData.purposeOfUseOther || ""}
              onChange={(v) => onChange("purposeOfUseOther", v)}
              error={errors.purposeOfUseOther}
              multiline={2}
              autoComplete="off"
            />
          </FormLayout>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">
            第三者提供・Cookie・アクセス解析
          </Text>
          <FormLayout>
            <Select
              label="第三者への個人情報提供"
              options={[
                { label: "選択してください", value: "" },
                { label: "第三者に提供しない", value: "none" },
                { label: "同意を得た場合のみ提供する", value: "with_consent" },
                { label: "業務委託先に必要な範囲で提供する", value: "partial" },
              ]}
              value={formData.thirdPartySharing || ""}
              onChange={(v) => onChange("thirdPartySharing", v)}
              error={errors.thirdPartySharing}
            />
            {formData.thirdPartySharing === "partial" && (
              <TextField
                label="第三者提供の詳細（任意）"
                value={formData.thirdPartySharingDetail || ""}
                onChange={(v) => onChange("thirdPartySharingDetail", v)}
                error={errors.thirdPartySharingDetail}
                multiline={3}
                autoComplete="off"
                helpText="提供先や提供する情報の範囲を記入してください"
              />
            )}

            <Select
              label="Cookieの使用"
              options={[
                { label: "選択してください", value: "" },
                { label: "使用する", value: "yes" },
                { label: "使用しない", value: "no" },
              ]}
              value={formData.useCookies || ""}
              onChange={(v) => onChange("useCookies", v)}
              error={errors.useCookies}
            />
            {formData.useCookies === "yes" && (
              <TextField
                label="Cookie使用の詳細（任意）"
                value={formData.cookieDetail || ""}
                onChange={(v) => onChange("cookieDetail", v)}
                error={errors.cookieDetail}
                multiline={3}
                autoComplete="off"
                helpText="Cookieの使用目的や管理方法を記入してください"
              />
            )}

            <Select
              label="アクセス解析ツールの使用"
              options={[
                { label: "選択してください", value: "" },
                { label: "使用する", value: "yes" },
                { label: "使用しない", value: "no" },
              ]}
              value={formData.useAnalytics || ""}
              onChange={(v) => onChange("useAnalytics", v)}
              error={errors.useAnalytics}
            />
            {formData.useAnalytics === "yes" && (
              <TextField
                label="使用するツール名（任意）"
                value={formData.analyticsTools || ""}
                onChange={(v) => onChange("analyticsTools", v)}
                error={errors.analyticsTools}
                autoComplete="off"
                placeholder="例: Google Analytics"
              />
            )}
          </FormLayout>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">
            保存・セキュリティ・お問い合わせ
          </Text>
          <FormLayout>
            <TextField
              label="個人情報の保存期間"
              value={formData.retentionPeriod || ""}
              onChange={(v) => onChange("retentionPeriod", v)}
              error={errors.retentionPeriod}
              multiline={2}
              autoComplete="off"
              helpText="例: サービス利用終了後1年間"
            />
            <TextField
              label="セキュリティ対策"
              value={formData.securityMeasures || ""}
              onChange={(v) => onChange("securityMeasures", v)}
              error={errors.securityMeasures}
              multiline={3}
              autoComplete="off"
              helpText="例: SSL暗号化通信、アクセス制御"
            />
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
