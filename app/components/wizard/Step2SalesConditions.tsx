import { useCallback } from "react";
import {
  FormLayout,
  TextField,
  ChoiceList,
  BlockStack,
  Card,
  Text,
  Collapsible,
  Button,
  InlineStack,
  Icon,
} from "@shopify/polaris";
import { ChevronDownIcon, ChevronUpIcon } from "@shopify/polaris-icons";
import { TemplateInsertButton } from "./TemplateInsertButton";
import { PAYMENT_METHODS, TEMPLATE_TEXTS } from "../../types/wizard";
import type { TokushohoFormData } from "../../types/wizard";

interface Step2Props {
  formData: Partial<TokushohoFormData>;
  errors: Record<string, string>;
  onChange: (field: string, value: string | string[]) => void;
  openSections: Record<string, boolean>;
  onToggleSection: (section: string) => void;
}

export function Step2SalesConditions({
  formData,
  errors,
  onChange,
  openSections,
  onToggleSection,
}: Step2Props) {
  const handlePaymentMethodsChange = useCallback(
    (value: string[]) => {
      onChange("paymentMethods", value);
      // Always regenerate payment timing text from selected methods
      const timingTexts = value
        .map((method) => {
          const key = method as keyof typeof TEMPLATE_TEXTS.paymentTiming;
          return TEMPLATE_TEXTS.paymentTiming[key];
        })
        .filter(Boolean);
      if (timingTexts.length > 0) {
        onChange("paymentTiming", timingTexts.join("\n"));
      }
    },
    [onChange],
  );

  return (
    <BlockStack gap="400">
      {/* Payment Section */}
      <Card>
        <BlockStack gap="300">
          <InlineStack align="space-between">
            <Text as="h2" variant="headingMd">
              支払い条件
            </Text>
            <Button
              variant="plain"
              onClick={() => onToggleSection("payment")}
              icon={
                <Icon
                  source={
                    openSections.payment ? ChevronUpIcon : ChevronDownIcon
                  }
                />
              }
            />
          </InlineStack>
          <Collapsible
            open={openSections.payment !== false}
            id="payment-section"
          >
            <BlockStack gap="300">
              <FormLayout>
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodyMd">
                      販売価格
                    </Text>
                    <TemplateInsertButton
                      options={[
                        {
                          content: "商品ページ記載価格（税込）",
                          value: TEMPLATE_TEXTS.sellingPrice,
                        },
                      ]}
                      onSelect={(v) => onChange("sellingPrice", v)}
                    />
                  </InlineStack>
                  <TextField
                    label=""
                    labelHidden
                    value={formData.sellingPrice || ""}
                    onChange={(v) => onChange("sellingPrice", v)}
                    error={errors.sellingPrice}
                    multiline={2}
                    autoComplete="off"
                  />
                </BlockStack>

                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text as="span" variant="bodyMd">
                      商品代金以外の必要料金
                    </Text>
                    <TemplateInsertButton
                      options={[
                        {
                          content: "送料・消費税テンプレート",
                          value: TEMPLATE_TEXTS.additionalFees,
                        },
                      ]}
                      onSelect={(v) => onChange("additionalFees", v)}
                    />
                  </InlineStack>
                  <TextField
                    label=""
                    labelHidden
                    value={formData.additionalFees || ""}
                    onChange={(v) => onChange("additionalFees", v)}
                    error={errors.additionalFees}
                    multiline={3}
                    autoComplete="off"
                  />
                </BlockStack>

                <ChoiceList
                  title="支払方法"
                  allowMultiple
                  choices={PAYMENT_METHODS.map((m) => ({
                    label: m.label,
                    value: m.value,
                  }))}
                  selected={formData.paymentMethods || []}
                  onChange={handlePaymentMethodsChange}
                  error={errors.paymentMethods}
                />

                <TextField
                  label="支払時期"
                  value={formData.paymentTiming || ""}
                  onChange={(v) => onChange("paymentTiming", v)}
                  error={errors.paymentTiming}
                  multiline={4}
                  autoComplete="off"
                  helpText="支払方法を選択すると、自動的にテンプレートが挿入されます"
                />
              </FormLayout>
            </BlockStack>
          </Collapsible>
        </BlockStack>
      </Card>

      {/* Delivery Section */}
      <Card>
        <BlockStack gap="300">
          <InlineStack align="space-between">
            <Text as="h2" variant="headingMd">
              配送条件
            </Text>
            <Button
              variant="plain"
              onClick={() => onToggleSection("delivery")}
              icon={
                <Icon
                  source={
                    openSections.delivery ? ChevronUpIcon : ChevronDownIcon
                  }
                />
              }
            />
          </InlineStack>
          <Collapsible
            open={openSections.delivery !== false}
            id="delivery-section"
          >
            <FormLayout>
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text as="span" variant="bodyMd">
                    商品の引渡時期
                  </Text>
                  <TemplateInsertButton
                    options={[
                      {
                        content: "3〜5営業日以内に発送",
                        value: TEMPLATE_TEXTS.deliveryTime,
                      },
                    ]}
                    onSelect={(v) => onChange("deliveryTime", v)}
                  />
                </InlineStack>
                <TextField
                  label=""
                  labelHidden
                  value={formData.deliveryTime || ""}
                  onChange={(v) => onChange("deliveryTime", v)}
                  error={errors.deliveryTime}
                  multiline={2}
                  autoComplete="off"
                />
              </BlockStack>

              <TextField
                label="引き渡し時期の特記事項（任意）"
                value={formData.deliveryNotes || ""}
                onChange={(v) => onChange("deliveryNotes", v)}
                error={errors.deliveryNotes}
                multiline={2}
                autoComplete="off"
                helpText="予約商品や受注生産品がある場合に記入してください"
              />
            </FormLayout>
          </Collapsible>
        </BlockStack>
      </Card>

      {/* Returns Section */}
      <Card>
        <BlockStack gap="300">
          <InlineStack align="space-between">
            <Text as="h2" variant="headingMd">
              返品・交換条件
            </Text>
            <Button
              variant="plain"
              onClick={() => onToggleSection("returns")}
              icon={
                <Icon
                  source={
                    openSections.returns ? ChevronUpIcon : ChevronDownIcon
                  }
                />
              }
            />
          </InlineStack>
          <Collapsible
            open={openSections.returns !== false}
            id="returns-section"
          >
            <FormLayout>
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text as="span" variant="bodyMd">
                    返品・交換について
                  </Text>
                  <TemplateInsertButton
                    options={[
                      {
                        content: "標準返品ポリシー",
                        value: TEMPLATE_TEXTS.returnPolicy,
                      },
                    ]}
                    onSelect={(v) => onChange("returnPolicy", v)}
                  />
                </InlineStack>
                <TextField
                  label=""
                  labelHidden
                  value={formData.returnPolicy || ""}
                  onChange={(v) => onChange("returnPolicy", v)}
                  error={errors.returnPolicy}
                  multiline={3}
                  autoComplete="off"
                />
              </BlockStack>

              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text as="span" variant="bodyMd">
                    返品期限
                  </Text>
                  <TemplateInsertButton
                    options={[
                      {
                        content: "商品到着後7日以内",
                        value: TEMPLATE_TEXTS.returnDeadline,
                      },
                    ]}
                    onSelect={(v) => onChange("returnDeadline", v)}
                  />
                </InlineStack>
                <TextField
                  label=""
                  labelHidden
                  value={formData.returnDeadline || ""}
                  onChange={(v) => onChange("returnDeadline", v)}
                  error={errors.returnDeadline}
                  autoComplete="off"
                />
              </BlockStack>

              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text as="span" variant="bodyMd">
                    返品送料
                  </Text>
                  <TemplateInsertButton
                    options={[
                      {
                        content: "お客様負担",
                        value: TEMPLATE_TEXTS.returnShippingCost.customer,
                      },
                      {
                        content: "当店負担",
                        value: TEMPLATE_TEXTS.returnShippingCost.seller,
                      },
                      {
                        content: "不良品は当店、お客様都合はお客様",
                        value:
                          TEMPLATE_TEXTS.returnShippingCost.defect_seller,
                      },
                    ]}
                    onSelect={(v) => onChange("returnShippingCost", v)}
                  />
                </InlineStack>
                <TextField
                  label=""
                  labelHidden
                  value={formData.returnShippingCost || ""}
                  onChange={(v) => onChange("returnShippingCost", v)}
                  error={errors.returnShippingCost}
                  autoComplete="off"
                />
              </BlockStack>

              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text as="span" variant="bodyMd">
                    商品の不良について
                  </Text>
                  <TemplateInsertButton
                    options={[
                      {
                        content: "標準不良品対応",
                        value: TEMPLATE_TEXTS.defectiveItemPolicy,
                      },
                    ]}
                    onSelect={(v) => onChange("defectiveItemPolicy", v)}
                  />
                </InlineStack>
                <TextField
                  label=""
                  labelHidden
                  value={formData.defectiveItemPolicy || ""}
                  onChange={(v) => onChange("defectiveItemPolicy", v)}
                  error={errors.defectiveItemPolicy}
                  multiline={3}
                  autoComplete="off"
                />
              </BlockStack>

              <TextField
                label="販売数量の制限（任意）"
                value={formData.quantityLimit || ""}
                onChange={(v) => onChange("quantityLimit", v)}
                error={errors.quantityLimit}
                autoComplete="off"
                helpText="「お一人様○個まで」等、制限がある場合に入力してください"
              />
            </FormLayout>
          </Collapsible>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
