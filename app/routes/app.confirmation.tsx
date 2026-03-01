import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  BlockStack,
  Card,
  Text,
  TextField,
  Button,
  Banner,
  InlineStack,
  Badge,
  Checkbox,
  Divider,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useState, useCallback } from "react";
import { authenticate, BASIC_PLAN } from "../shopify.server";
import { checkPlanAccess, IS_TEST_BILLING } from "../lib/requirePlan.server";
import type { BillingCheckContext } from "../lib/requirePlan.server";
import {
  confirmationSchema,
  CONFIRMATION_DEFAULTS,
} from "../lib/validation/confirmation";
import type { ConfirmationFormData } from "../lib/validation/confirmation";
import {
  getConfirmationMetafields,
  saveConfirmationMetafields,
} from "../lib/shopify/metafields.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, billing } = await authenticate.admin(request);

  const hasPaidPlan = await checkPlanAccess(billing as BillingCheckContext, "basic");
  if (!hasPaidPlan) {
    return json({ config: CONFIRMATION_DEFAULTS, needsUpgrade: true });
  }

  try {
    const config = await getConfirmationMetafields(admin);
    return json({ config, needsUpgrade: false });
  } catch (error) {
    console.error("[confirmation] Failed to load metafields:", error);
    return json({ config: CONFIRMATION_DEFAULTS, needsUpgrade: false });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, billing } = await authenticate.admin(request);
  const formPayload = await request.formData();
  const intent = formPayload.get("intent") as string;

  if (intent === "upgrade") {
    return billing.request({
      plan: BASIC_PLAN,
      isTest: IS_TEST_BILLING,
    });
  }

  if (intent === "save") {
    // Check billing
    const hasPaidPlan = await checkPlanAccess(billing as BillingCheckContext, "basic");
    if (!hasPaidPlan) {
      return json({ success: false, error: "Basicプランが必要です。" }, { status: 403 });
    }

    // Parse form data
    const config: Record<string, unknown> = {
      enabled: formPayload.get("enabled") === "true",
      quantityText: formPayload.get("quantityText") as string || "",
      priceText: formPayload.get("priceText") as string || "",
      paymentText: formPayload.get("paymentText") as string || "",
      deliveryText: formPayload.get("deliveryText") as string || "",
      cancellationText: formPayload.get("cancellationText") as string || "",
      periodText: formPayload.get("periodText") as string || "",
      checkboxLabel: formPayload.get("checkboxLabel") as string || "",
    };

    // Validate
    const validation = confirmationSchema.safeParse(config);
    if (!validation.success) {
      return json({
        success: false,
        errors: validation.error.flatten().fieldErrors,
      });
    }

    // Save to metafields
    try {
      await saveConfirmationMetafields(admin, validation.data);
      return json({ success: true });
    } catch (error) {
      console.error("[confirmation] Failed to save metafields:", error);
      return json({
        success: false,
        error: "設定の保存に失敗しました。しばらくしてからもう一度お試しください。",
      }, { status: 502 });
    }
  }

  return json({ success: false, error: "Unknown intent" }, { status: 400 });
};

const FIELD_LABELS: Record<keyof Omit<ConfirmationFormData, "enabled">, { label: string; helpText: string; multiline: boolean }> = {
  quantityText: {
    label: "① 分量",
    helpText: "商品の数量・回数等に関する表示内容",
    multiline: false,
  },
  priceText: {
    label: "② 販売価格",
    helpText: "商品金額・送料・手数料を含む合計金額に関する表示内容",
    multiline: true,
  },
  paymentText: {
    label: "③ 支払方法・時期",
    helpText: "利用可能な支払方法と請求タイミングに関する表示内容",
    multiline: true,
  },
  deliveryText: {
    label: "④ 引渡時期",
    helpText: "商品の発送・配送時期に関する表示内容",
    multiline: true,
  },
  cancellationText: {
    label: "⑤ 申込みの撤回・解除に関する事項",
    helpText: "キャンセル・返品・交換ポリシーに関する表示内容",
    multiline: true,
  },
  periodText: {
    label: "⑥ 申込期間",
    helpText: "商品の販売期間に関する表示内容（期間限定でない場合はその旨を記載）",
    multiline: false,
  },
  checkboxLabel: {
    label: "チェックボックスラベル",
    helpText: "お客様が確認済みであることを示すチェックボックスのラベル文言",
    multiline: false,
  },
};

export default function ConfirmationPage() {
  const { config, needsUpgrade } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<ConfirmationFormData>(config);

  const handleFieldChange = useCallback(
    (field: keyof ConfirmationFormData) => (value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleToggleEnabled = useCallback(
    (checked: boolean) => {
      setFormData((prev) => ({ ...prev, enabled: checked }));
    },
    [],
  );

  const handleLoadDefaults = useCallback(() => {
    setFormData((prev) => ({
      ...CONFIRMATION_DEFAULTS,
      enabled: prev.enabled,
    }));
  }, []);

  const handleSave = useCallback(() => {
    const fd = new FormData();
    fd.append("intent", "save");
    fd.append("enabled", String(formData.enabled));
    for (const [key, value] of Object.entries(formData)) {
      if (key !== "enabled") {
        fd.append(key, value as string);
      }
    }
    fetcher.submit(fd, { method: "POST" });
  }, [formData, fetcher]);

  const isSaving =
    fetcher.state !== "idle" && fetcher.formData?.get("intent") === "save";

  // H-3: Type-safe access to fetcher data
  const fetcherError =
    fetcher.data && !fetcher.data.success
      ? (fetcher.data as { success: false; error?: string; errors?: Record<string, string[]> })
      : null;
  const fieldErrors = fetcherError?.errors;

  return (
    <Page>
      <TitleBar title="最終確認画面設定" />
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {needsUpgrade ? (
              <Card>
                <BlockStack gap="400">
                  <InlineStack gap="200" blockAlign="center">
                    <Text as="h2" variant="headingLg">
                      最終確認画面設定
                    </Text>
                    <Badge tone="info">有料プラン</Badge>
                  </InlineStack>
                  <Text as="p">
                    最終確認画面の設定にはBasicプランへのアップグレードが必要です。
                  </Text>
                  <InlineStack gap="200">
                    <fetcher.Form method="post">
                      <input type="hidden" name="intent" value="upgrade" />
                      <Button variant="primary" submit size="large">
                        無料トライアルを開始する
                      </Button>
                    </fetcher.Form>
                    <Button onClick={() => navigate("/app")}>
                      ダッシュボードに戻る
                    </Button>
                  </InlineStack>
                </BlockStack>
              </Card>
            ) : (
              <>
                <Banner tone="info">
                  <p>
                    2022年改正特商法（第12条の6）により、最終確認画面に6項目の表示が義務付けられています。
                    以下の内容はカートページにTheme App Extensionとして表示されます。
                  </p>
                </Banner>

                {fetcher.data?.success && (
                  <Banner tone="success">
                    <p>設定を保存しました。</p>
                  </Banner>
                )}

                {fetcherError?.error && (
                  <Banner tone="critical">
                    <p>{fetcherError.error}</p>
                  </Banner>
                )}

                <Card>
                  <BlockStack gap="400">
                    <Checkbox
                      label="最終確認画面を有効にする"
                      helpText="有効にすると、テーマエディタで追加した最終確認ブロックに内容が表示されます"
                      checked={formData.enabled}
                      onChange={handleToggleEnabled}
                    />
                  </BlockStack>
                </Card>

                <Banner tone="info">
                  <p>
                    チェックアウトページへの表示は Shopify Plus プランのストアのみ対応しています。
                    カートページへの表示は全プランでご利用いただけます。
                  </p>
                </Banner>

                <Card>
                  <BlockStack gap="400">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="h2" variant="headingMd">
                        法定6項目の表示内容
                      </Text>
                      <Button onClick={handleLoadDefaults} variant="plain">
                        デフォルト値を挿入
                      </Button>
                    </InlineStack>

                    <Divider />

                    {(Object.keys(FIELD_LABELS) as Array<keyof typeof FIELD_LABELS>).map((field) => {
                      const { label, helpText, multiline } = FIELD_LABELS[field];
                      const errorMessages = fieldErrors?.[field];
                      return (
                        <TextField
                          key={field}
                          label={label}
                          helpText={helpText}
                          value={formData[field]}
                          onChange={handleFieldChange(field)}
                          multiline={multiline ? 3 : undefined}
                          autoComplete="off"
                          error={errorMessages?.[0]}
                        />
                      );
                    })}
                  </BlockStack>
                </Card>

                <InlineStack align="end" gap="200">
                  <Button onClick={() => navigate("/app")}>キャンセル</Button>
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    loading={isSaving}
                  >
                    保存
                  </Button>
                </InlineStack>

                <Card>
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingMd">
                      テーマへの追加方法
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      1. Shopify管理画面 → 「オンラインストア」→「テーマ」→「カスタマイズ」
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      2. ページ選択で「カート」を選択
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      3. 「ブロックを追加」→「最終確認画面」を選択
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      4. 保存して公開
                    </Text>
                    <Button url="shopify:admin/themes/current/editor?template=cart">
                      テーマエディタを開く
                    </Button>
                  </BlockStack>
                </Card>

              </>
            )}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
