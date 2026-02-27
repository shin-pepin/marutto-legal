import { useState, useCallback, useEffect, useRef } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher, useBlocker, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  BlockStack,
  Button,
  InlineStack,
  Banner,
  Modal,
  Text,
  Card,
  Badge,
  List,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate, BASIC_PLAN } from "../shopify.server";
import { WizardStepper } from "../components/wizard/WizardStepper";
import { Step3PreviewPublish } from "../components/wizard/Step3PreviewPublish";
import { CompletionScreen } from "../components/wizard/CompletionScreen";
import { getStepComponents } from "../components/wizard/pageTypeUI";
import { ensureStore } from "../lib/db/store.server";
import {
  getLegalPage,
  getLegalPageMeta,
  upsertLegalPageDraft,
  publishLegalPage,
  checkVersionOrThrow,
  OptimisticLockError,
} from "../lib/db/legalPage.server";
import { createPage, updatePage, getPage, ShopifyApiError } from "../lib/shopify/pages.server";
import { checkPlanAccess, IS_TEST_BILLING } from "../lib/requirePlan.server";
import type { BillingCheckContext } from "../lib/requirePlan.server";
import { getPageTypeConfig, isValidPageType } from "../lib/pageTypes/registry";
import "../lib/pageTypes";
import type { PageType } from "../types/wizard";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { billing, session } = await authenticate.admin(request);
  const shop = session.shop;
  const { pageType } = params;

  if (!pageType || !isValidPageType(pageType)) {
    throw new Response("Not Found", { status: 404 });
  }

  const config = getPageTypeConfig(pageType);
  if (!config) {
    throw new Response("Not Found", { status: 404 });
  }

  // Check billing plan access
  const hasAccess = await checkPlanAccess(billing as BillingCheckContext, config.requiredPlan || "free");

  await ensureStore(shop);
  const existingPage = await getLegalPage(shop, pageType);

  let formData: Record<string, unknown> = {};
  if (existingPage?.formData) {
    try {
      formData = JSON.parse(existingPage.formData);
    } catch {
      // Invalid JSON, start fresh
    }
  }

  return json({
    formData,
    existingPage: existingPage
      ? {
          id: existingPage.id,
          shopifyPageId: existingPage.shopifyPageId,
          status: existingPage.status,
          version: existingPage.version,
        }
      : null,
    shop,
    pageType,
    needsUpgrade: !hasAccess,
  });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { admin, billing, session } = await authenticate.admin(request);
  const shop = session.shop;
  const { pageType } = params;

  if (!pageType || !isValidPageType(pageType)) {
    throw new Response("Not Found", { status: 404 });
  }

  const config = getPageTypeConfig(pageType);
  if (!config) {
    throw new Response("Not Found", { status: 404 });
  }

  const formPayload = await request.formData();
  const intent = formPayload.get("intent") as string;

  if (intent === "upgrade") {
    return billing.request({
      plan: BASIC_PLAN,
      isTest: IS_TEST_BILLING,
    });
  }

  // Server-side billing guard: prevent unpaid access to paid pageTypes
  const requiredPlan = config.requiredPlan || "free";
  if (requiredPlan !== "free") {
    const hasAccess = await checkPlanAccess(billing as BillingCheckContext, requiredPlan);
    if (!hasAccess) {
      return json(
        { success: false, intent, error: "このページタイプにはBasicプランが必要です。" },
        { status: 403 },
      );
    }
  }

  const MAX_FORM_DATA_SIZE = 100_000; // 100KB

  if (intent === "save-draft") {
    const formDataJson = formPayload.get("formData") as string | null;
    if (!formDataJson) {
      return json({ success: false, intent: "save-draft", error: "Form data is required" }, { status: 400 });
    }
    if (formDataJson.length > MAX_FORM_DATA_SIZE) {
      return json({ success: false, intent: "save-draft", error: "Form data too large" }, { status: 400 });
    }
    const versionStr = formPayload.get("version") as string | null;
    const expectedVersion = versionStr ? parseInt(versionStr, 10) : undefined;
    try {
      const updated = await upsertLegalPageDraft(shop, pageType as PageType, formDataJson, expectedVersion);
      return json({ success: true, intent: "save-draft", newVersion: updated.version });
    } catch (error) {
      if (error instanceof OptimisticLockError) {
        return json({ success: false, intent: "save-draft", error: error.message }, { status: 409 });
      }
      throw error;
    }
  }

  if (intent === "publish") {
    const formDataJson = formPayload.get("formData") as string | null;
    if (!formDataJson) {
      return json({ success: false, intent: "publish", error: "Form data is required" }, { status: 400 });
    }
    if (formDataJson.length > MAX_FORM_DATA_SIZE) {
      return json({ success: false, intent: "publish", error: "Form data too large" }, { status: 400 });
    }
    let formData: unknown;
    try {
      formData = JSON.parse(formDataJson);
    } catch {
      return json({ success: false, intent: "publish", error: "Invalid form data" }, { status: 400 });
    }

    // Validate full form
    const validation = config.fullSchema.safeParse(formData);
    if (!validation.success) {
      return json({
        success: false,
        intent: "publish",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    // Normalize data
    const normalized = config.normalizeData
      ? config.normalizeData(validation.data as Record<string, unknown>)
      : validation.data;

    // Generate HTML
    const contentHtml = config.generateHtml(normalized as Record<string, unknown>);

    // Pre-check optimistic lock BEFORE calling Shopify API
    // This prevents Shopify page creation/update when the DB version is stale.
    const versionStr = formPayload.get("version") as string | null;
    const expectedVersion = versionStr ? parseInt(versionStr, 10) : undefined;
    try {
      await checkVersionOrThrow(shop, pageType as PageType, expectedVersion);
    } catch (error) {
      if (error instanceof OptimisticLockError) {
        return json({ success: false, intent: "publish", error: error.message }, { status: 409 });
      }
      throw error;
    }

    // Version check passed — now safe to call Shopify API
    const existingPage = await getLegalPageMeta(shop, pageType as PageType);
    let shopifyPageId: string;
    let pageHandle: string | undefined;

    try {
      if (existingPage?.shopifyPageId) {
        const page = await getPage(admin, existingPage.shopifyPageId);
        if (page) {
          await updatePage(admin, existingPage.shopifyPageId, {
            bodyHtml: contentHtml,
          });
          shopifyPageId = existingPage.shopifyPageId;
          pageHandle = page.handle;
        } else {
          // Page was deleted on Shopify — recreate
          const result = await createPage(admin, {
            title: config.shopifyPageTitle,
            handle: config.handle,
            bodyHtml: contentHtml,
            published: false,
          });
          shopifyPageId = result.pageId;
          pageHandle = result.handle;
        }
      } else {
        const result = await createPage(admin, {
          title: config.shopifyPageTitle,
          handle: config.handle,
          bodyHtml: contentHtml,
          published: false,
        });
        shopifyPageId = result.pageId;
        pageHandle = result.handle;
      }
    } catch (error) {
      console.error("[publish] Shopify API error:", error);
      const message = error instanceof ShopifyApiError
        ? error.message
        : "Shopifyページの作成・更新に失敗しました。しばらくしてからもう一度お試しください。";
      return json({ success: false, intent: "publish", error: message }, { status: 502 });
    }

    // Save to DB with optimistic lock (double-check, race window is now minimal)
    try {
      const published = await publishLegalPage(shop, pageType as PageType, {
        shopifyPageId,
        contentHtml,
        formData: formDataJson,
        formSchemaVersion: config.templateVersion,
      }, expectedVersion);
      return json({
        success: true,
        intent: "publish",
        shopifyPageId,
        pageHandle,
        newVersion: published.version,
      });
    } catch (error) {
      if (error instanceof OptimisticLockError) {
        return json({ success: false, intent: "publish", error: error.message }, { status: 409 });
      }
      throw error;
    }
  }

  return json({ success: false, intent: "unknown" });
};

export default function WizardPage() {
  const { formData: initialFormData, existingPage, shop, pageType, needsUpgrade } =
    useLoaderData<typeof loader>();

  const navigate = useNavigate();
  const config = getPageTypeConfig(pageType);
  if (!config) {
    throw new Error(`Unknown pageType: ${pageType}`);
  }
  const totalSteps = config.steps.length;
  const stepComponents = getStepComponents(pageType);

  const fetcher = useFetcher<typeof action>();
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const [currentStep, setCurrentStep] = useState(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [formData, setFormData] = useState<Record<string, any>>(
    initialFormData as Record<string, any>,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    config.sections || {},
  );
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [publishResult, setPublishResult] = useState<{
    shopifyPageId?: string;
    pageHandle?: string;
  } | null>(null);
  const [pageVersion, setPageVersion] = useState<number | undefined>(
    existingPage?.version,
  );
  const pageVersionRef = useRef(pageVersion);
  pageVersionRef.current = pageVersion;
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();
  const [isDirty, setIsDirty] = useState(false);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const isPublishing =
    fetcher.state !== "idle" &&
    fetcher.formData?.get("intent") === "publish";

  const blocker = useBlocker(isDirty && !publishSuccess);

  // Auto-save with debounce
  const autoSave = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data: Record<string, any>) => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(() => {
        const fd = new FormData();
        fd.append("intent", "save-draft");
        fd.append("formData", JSON.stringify(data));
        if (pageVersionRef.current !== undefined) {
          fd.append("version", String(pageVersionRef.current));
        }
        fetcherRef.current.submit(fd, { method: "POST" });
      }, 3000);
    },
    [],
  );

  const handleFieldChange = useCallback(
    (field: string, value: string | string[]) => {
      setFormData((prev) => {
        const next = { ...prev, [field]: value };
        autoSave(next);
        return next;
      });
      setIsDirty(true);
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    [autoSave],
  );

  const handleToggleSection = useCallback((section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  const handleNext = useCallback(() => {
    // Cancel pending auto-save to avoid stale version conflict
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Validate current step (form steps only, not preview)
    const stepSchema = config.stepSchemas[currentStep - 1];
    if (stepSchema) {
      const validation = stepSchema.safeParse(formData);
      if (!validation.success) {
        const fieldErrors: Record<string, string> = {};
        for (const [key, msgs] of Object.entries(
          validation.error.flatten().fieldErrors,
        )) {
          if (msgs && msgs.length > 0) {
            fieldErrors[key] = msgs[0]!;
          }
        }
        setErrors(fieldErrors);
        return;
      }
    }
    setErrors({});

    // Save on step completion
    const fd = new FormData();
    fd.append("intent", "save-draft");
    fd.append("formData", JSON.stringify(formData));
    if (pageVersion !== undefined) {
      fd.append("version", String(pageVersion));
    }
    fetcherRef.current.submit(fd, { method: "POST" });

    setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
  }, [currentStep, formData, pageVersion, config.stepSchemas, totalSteps]);

  const handleBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }, []);

  const handlePublish = useCallback(() => {
    const fd = new FormData();
    fd.append("intent", "publish");
    fd.append("formData", JSON.stringify(formData));
    if (pageVersion !== undefined) {
      fd.append("version", String(pageVersion));
    }
    fetcherRef.current.submit(fd, { method: "POST" });
  }, [formData, pageVersion]);

  // Handle action results — sync version from server
  useEffect(() => {
    if (fetcher.data?.success) {
      const data = fetcher.data as {
        success: boolean;
        intent: string;
        newVersion?: number;
        shopifyPageId?: string;
        pageHandle?: string;
      };
      if (data.newVersion !== undefined) {
        setPageVersion(data.newVersion);
      }
      setIsDirty(false);
      if (fetcher.data.intent === "publish") {
        setPublishSuccess(true);
        setPublishResult({
          shopifyPageId: data.shopifyPageId,
          pageHandle: data.pageHandle,
        });
      }
    }
  }, [fetcher.data]);

  // Generate preview HTML for the last step
  let previewHtml = "";
  const isPreviewStep = currentStep === totalSteps;
  if (isPreviewStep) {
    const fullValidation = config.fullSchema.safeParse(formData);
    if (fullValidation.success) {
      const normalized = config.normalizeData
        ? config.normalizeData(fullValidation.data as Record<string, unknown>)
        : fullValidation.data;
      previewHtml = config.generateHtml(normalized as Record<string, unknown>);
    }
  }

  const isUpdate = !!existingPage?.shopifyPageId;
  const CurrentStepComponent = !isPreviewStep
    ? stepComponents[currentStep - 1]
    : null;

  return (
    <Page>
      <TitleBar title={config.title} />
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            <Banner tone="warning">
              <p>
                本アプリは法的助言を提供するものではありません。生成されたページの内容については、必要に応じて専門家にご確認ください。
              </p>
            </Banner>

            {needsUpgrade ? (
              <Card>
                <BlockStack gap="400">
                  <InlineStack gap="200" blockAlign="center">
                    <Text as="h2" variant="headingLg">
                      {config.shopifyPageTitle}
                    </Text>
                    <Badge tone="info">有料プラン</Badge>
                  </InlineStack>
                  <Text as="p">
                    {config.shopifyPageTitle}の作成にはBasicプランへのアップグレードが必要です。
                  </Text>
                  <Card>
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingMd">
                        Basicプラン
                      </Text>
                      <Text as="p" variant="headingLg">
                        $4.99 / 月
                      </Text>
                      <Text as="p" tone="subdued" variant="bodySm">
                        7日間の無料トライアル付き
                      </Text>
                      <List>
                        <List.Item>全ページタイプの作成</List.Item>
                        <List.Item>プライバシーポリシー</List.Item>
                        <List.Item>利用規約</List.Item>
                        <List.Item>返品・交換ポリシー</List.Item>
                      </List>
                    </BlockStack>
                  </Card>
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
            <WizardStepper currentStep={currentStep} steps={config.steps} />

            {publishSuccess ? (
              <CompletionScreen
                isUpdate={isUpdate}
                shopifyPageId={publishResult?.shopifyPageId}
                pageHandle={publishResult?.pageHandle}
                shop={shop}
                pageTypeTitle={config.shopifyPageTitle}
              />
            ) : (
              <>
                {fetcher.data && !fetcher.data.success && (fetcher.data as Record<string, unknown>).error && (
                  <Banner tone={fetcher.data.intent === "save-draft" ? "warning" : "critical"}>
                    <p>{String((fetcher.data as Record<string, unknown>).error)}</p>
                  </Banner>
                )}

                {fetcher.data?.intent === "publish" &&
                  !fetcher.data.success &&
                  (fetcher.data as Record<string, unknown>).errors && (
                    <Banner tone="critical">
                      <p>入力内容にエラーがあります。修正してください。</p>
                    </Banner>
                  )}

                {CurrentStepComponent && (
                  <CurrentStepComponent
                    formData={formData}
                    errors={errors}
                    onChange={handleFieldChange}
                    openSections={openSections}
                    onToggleSection={handleToggleSection}
                  />
                )}

                {isPreviewStep && (
                  <Step3PreviewPublish
                    previewHtml={previewHtml}
                    onPublish={handlePublish}
                    isPublishing={isPublishing}
                    isUpdate={isUpdate}
                  />
                )}

                <InlineStack align="space-between">
                  <div>
                    {currentStep > 1 && (
                      <Button onClick={handleBack}>戻る</Button>
                    )}
                  </div>
                  <div>
                    {currentStep < totalSteps && (
                      <Button variant="primary" onClick={handleNext}>
                        次へ
                      </Button>
                    )}
                  </div>
                </InlineStack>
              </>
            )}
            </>
            )}
          </BlockStack>
        </Layout.Section>
      </Layout>

      {/* Exit confirmation modal */}
      {blocker.state === "blocked" && (
        <Modal
          open
          onClose={() => blocker.reset()}
          title="編集内容が保存されていません"
          primaryAction={{
            content: "このページを離れる",
            destructive: true,
            onAction: () => blocker.proceed(),
          }}
          secondaryActions={[
            {
              content: "編集を続ける",
              onAction: () => blocker.reset(),
            },
          ]}
        >
          <Modal.Section>
            <Text as="p">
              保存されていない変更があります。このページを離れると、変更内容が失われる可能性があります。
            </Text>
          </Modal.Section>
        </Modal>
      )}
    </Page>
  );
}
