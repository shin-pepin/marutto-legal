import {
  FormLayout,
  TextField,
  BlockStack,
  Card,
  Text,
} from "@shopify/polaris";
import type { WizardStepProps } from "../pageTypeUI";

export function Step1BasicInfo({ formData, errors, onChange }: WizardStepProps) {
  return (
    <BlockStack gap="400">
      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">
            基本情報
          </Text>
          <FormLayout>
            <TextField
              label="事業者名"
              value={formData.businessName || ""}
              onChange={(v) => onChange("businessName", v)}
              error={errors.businessName}
              autoComplete="organization"
              helpText="法人名または屋号を入力してください"
            />
            <TextField
              label="メールアドレス"
              type="email"
              value={formData.email || ""}
              onChange={(v) => onChange("email", v)}
              error={errors.email}
              autoComplete="email"
            />
            <TextField
              label="電話番号"
              value={formData.phone || ""}
              onChange={(v) => onChange("phone", v)}
              error={errors.phone}
              autoComplete="tel"
              helpText="例: 03-1234-5678"
            />
            <TextField
              label="サイトURL"
              value={formData.siteUrl || ""}
              onChange={(v) => onChange("siteUrl", v)}
              error={errors.siteUrl}
              autoComplete="url"
              placeholder="https://example.com"
            />
          </FormLayout>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
