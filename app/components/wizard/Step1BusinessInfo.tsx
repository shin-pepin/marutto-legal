import {
  FormLayout,
  TextField,
  Select,
  RadioButton,
  BlockStack,
  Card,
  Text,
  Banner,
  Box,
} from "@shopify/polaris";
import type { WizardStepProps } from "./pageTypeUI";

export function Step1BusinessInfo({ formData, errors, onChange }: WizardStepProps) {
  return (
    <BlockStack gap="400">
      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">
            事業者情報
          </Text>
          <FormLayout>
            <Select
              label="事業者の種別"
              options={[
                { label: "選択してください", value: "" },
                { label: "法人", value: "corporation" },
                { label: "個人事業主", value: "individual" },
              ]}
              value={formData.businessType || ""}
              onChange={(v) => onChange("businessType", v)}
              error={errors.businessType}
              helpText="法人の場合は法人名、個人事業主の場合は屋号を入力してください"
            />
            <TextField
              label="販売業者名"
              value={formData.businessName || ""}
              onChange={(v) => onChange("businessName", v)}
              error={errors.businessName}
              autoComplete="organization"
              helpText="法人名または屋号を入力してください"
            />
            <TextField
              label="代表者名（運営責任者名）"
              value={formData.representativeName || ""}
              onChange={(v) => onChange("representativeName", v)}
              error={errors.representativeName}
              autoComplete="name"
              helpText="法人の場合は代表者名または通信販売業務の責任者名"
            />
          </FormLayout>
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">
            住所・連絡先
          </Text>

          <Box paddingBlockEnd="200">
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">
                住所の公開設定
              </Text>
              <RadioButton
                label="住所を公開する"
                helpText="ページに住所・電話番号がそのまま表示されます"
                checked={formData.addressDisclosure === "public"}
                id="address-public"
                name="addressDisclosure"
                onChange={() => onChange("addressDisclosure", "public")}
              />
              <RadioButton
                label="請求があった場合に開示する"
                helpText="個人事業主向け。住所・電話番号の代わりに開示要請時対応の旨を表示します"
                checked={formData.addressDisclosure === "on_request"}
                id="address-on-request"
                name="addressDisclosure"
                onChange={() => onChange("addressDisclosure", "on_request")}
              />
              {errors.addressDisclosure && (
                <Text as="p" tone="critical">
                  {errors.addressDisclosure}
                </Text>
              )}
            </BlockStack>
          </Box>

          {formData.addressDisclosure === "on_request" && (
            <Banner tone="info">
              <p>
                2022年6月施行の特商法改正により、個人事業主は一定の条件下で住所・電話番号の非公開が認められています。
                ページには「請求があった場合、遅滞なく開示いたします。」と表示されます。
              </p>
            </Banner>
          )}

          <FormLayout>
            <FormLayout.Group>
              <TextField
                label="郵便番号"
                value={formData.postalCode || ""}
                onChange={(v) => onChange("postalCode", v)}
                error={errors.postalCode}
                autoComplete="postal-code"
                placeholder="123-4567"
                helpText={
                  formData.addressDisclosure === "on_request"
                    ? "非公開設定でもデータとして保存されますが、ページには表示されません"
                    : undefined
                }
              />
            </FormLayout.Group>
            <TextField
              label="住所"
              value={formData.address || ""}
              onChange={(v) => onChange("address", v)}
              error={errors.address}
              autoComplete="street-address"
              helpText={
                formData.addressDisclosure === "on_request"
                  ? "非公開設定でもデータとして保存されますが、ページには表示されません"
                  : undefined
              }
            />
            <TextField
              label="電話番号"
              value={formData.phone || ""}
              onChange={(v) => onChange("phone", v)}
              error={errors.phone}
              autoComplete="tel"
              placeholder="03-1234-5678"
            />
            <TextField
              label="メールアドレス"
              type="email"
              value={formData.email || ""}
              onChange={(v) => onChange("email", v)}
              error={errors.email}
              autoComplete="email"
            />
          </FormLayout>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
