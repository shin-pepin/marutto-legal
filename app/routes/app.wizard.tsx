import { useState, useCallback, useEffect, useRef } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher, useBlocker } from "@remix-run/react";
import {
  Page,
  Layout,
  BlockStack,
  Button,
  InlineStack,
  Banner,
  Modal,
  Text,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { WizardStepper } from "../components/wizard/WizardStepper";
import { Step1BusinessInfo } from "../components/wizard/Step1BusinessInfo";
import { Step2SalesConditions } from "../components/wizard/Step2SalesConditions";
import { Step3PreviewPublish } from "../components/wizard/Step3PreviewPublish";
import { CompletionScreen } from "../components/wizard/CompletionScreen";
import { validateStep, tokushohoFormSchema, normalizePostalCode } from "../lib/validation/wizard";
import { generateTokushohoHtml } from "../lib/templates/tokushoho";
import { ensureStore } from "../lib/db/store.server";
import {
  getLegalPage,
  upsertLegalPageDraft,
  publishLegalPage,
  OptimisticLockError,
} from "../lib/db/legalPage.server";
import { createPage, updatePage, getPage } from "../lib/shopify/pages.server";
import type { TokushohoFormData } from "../types/wizard";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  await ensureStore(shop);

  const existingPage = await getLegalPage(shop, "tokushoho");

  let formData: Partial<TokushohoFormData> = {};
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
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const formPayload = await request.formData();
  const intent = formPayload.get("intent") as string;

  const MAX_FORM_DATA_SIZE = 100_000; // 100KB

  if (intent === "save-draft") {
    const formDataJson = formPayload.get("formData") as string;
    if (formDataJson && formDataJson.length > MAX_FORM_DATA_SIZE) {
      return json({ success: false, intent: "save-draft", error: "Form data too large" }, { status: 400 });
    }
    const versionStr = formPayload.get("version") as string | null;
    const expectedVersion = versionStr ? parseInt(versionStr, 10) : undefined;
    try {
      const updated = await upsertLegalPageDraft(shop, "tokushoho", formDataJson, expectedVersion);
      return json({ success: true, intent: "save-draft", newVersion: updated.version });
    } catch (error) {
      if (error instanceof OptimisticLockError) {
        return json({ success: false, intent: "save-draft", error: error.message }, { status: 409 });
      }
      throw error;
    }
  }

  if (intent === "publish") {
    const formDataJson = formPayload.get("formData") as string;
    if (formDataJson && formDataJson.length > MAX_FORM_DATA_SIZE) {
      return json({ success: false, intent: "publish", error: "Form data too large" }, { status: 400 });
    }
    let formData: unknown;
    try {
      formData = JSON.parse(formDataJson);
    } catch {
      return json({ success: false, intent: "publish", error: "Invalid form data" }, { status: 400 });
    }

    // Validate full form
    const validation = tokushohoFormSchema.safeParse(formData);
    if (!validation.success) {
      return json({
        success: false,
        intent: "publish",
        errors: validation.error.flatten().fieldErrors,
      });
    }

    // Normalize data
    const normalized = {
      ...validation.data,
      postalCode: normalizePostalCode(validation.data.postalCode),
    };

    // Generate HTML
    const contentHtml = generateTokushohoHtml(normalized);

    // Check if we're updating or creating
    const existingPage = await getLegalPage(shop, "tokushoho");
    let shopifyPageId: string;
    let pageHandle: string | undefined;

    if (existingPage?.shopifyPageId) {
      // Check if page still exists on Shopify
      const page = await getPage(admin, existingPage.shopifyPageId);
      if (page) {
        // Update existing page
        await updatePage(admin, existingPage.shopifyPageId, {
          bodyHtml: contentHtml,
        });
        shopifyPageId = existingPage.shopifyPageId;
        pageHandle = page.handle;
      } else {
        // Page was deleted on Shopify, create new
        const result = await createPage(admin, {
          title: "特定商取引法に基づく表記",
          handle: "legal",
          bodyHtml: contentHtml,
          published: false,
        });
        shopifyPageId = result.pageId;
        pageHandle = result.handle;
      }
    } else {
      // Create new page
      const result = await createPage(admin, {
        title: "特定商取引法に基づく表記",
        handle: "legal",
        bodyHtml: contentHtml,
        published: false,
      });
      shopifyPageId = result.pageId;
      pageHandle = result.handle;
    }

    // Save to DB with optimistic lock
    const versionStr = formPayload.get("version") as string | null;
    const expectedVersion = versionStr ? parseInt(versionStr, 10) : undefined;
    try {
      const published = await publishLegalPage(shop, "tokushoho", {
        shopifyPageId,
        contentHtml,
        formData: formDataJson,
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
  const { formData: initialFormData, existingPage, shop } =
    useLoaderData<typeof loader>();

  const fetcher = useFetcher<typeof action>();
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] =
    useState<Partial<TokushohoFormData>>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    payment: true,
    delivery: true,
    returns: true,
  });
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

  const isPublishing =
    fetcher.state !== "idle" &&
    fetcher.formData?.get("intent") === "publish";

  // T1-6: Block navigation when form has unsaved changes
  const blocker = useBlocker(isDirty && !publishSuccess);

  // Handle auto-save debounce
  const autoSave = useCallback(
    (data: Partial<TokushohoFormData>) => {
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
      // Clear error for this field
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
    const validation = validateStep(currentStep, formData);
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
    setErrors({});

    // Save on step completion
    const fd = new FormData();
    fd.append("intent", "save-draft");
    fd.append("formData", JSON.stringify(formData));
    if (pageVersion !== undefined) {
      fd.append("version", String(pageVersion));
    }
    fetcherRef.current.submit(fd, { method: "POST" });

    setCurrentStep((prev) => Math.min(prev + 1, 3));
  }, [currentStep, formData, pageVersion]);

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
      // Mark as not dirty after successful save
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

  // Generate preview HTML for step 3
  let previewHtml = "";
  if (currentStep === 3) {
    const fullValidation = tokushohoFormSchema.safeParse(formData);
    if (fullValidation.success) {
      previewHtml = generateTokushohoHtml(fullValidation.data);
    }
  }

  const isUpdate = !!existingPage?.shopifyPageId;

  return (
    <Page>
      <TitleBar title="特商法ページ作成" />
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            <Banner tone="warning">
              <p>
                本アプリは法的助言を提供するものではありません。生成されたページの内容については、必要に応じて専門家にご確認ください。
              </p>
            </Banner>

            <WizardStepper currentStep={currentStep} />

            {publishSuccess ? (
              <CompletionScreen
                isUpdate={isUpdate}
                shopifyPageId={publishResult?.shopifyPageId}
                pageHandle={publishResult?.pageHandle}
                shop={shop}
              />
            ) : (
              <>
                {fetcher.data?.intent === "publish" &&
                  !fetcher.data.success &&
                  ((fetcher.data as Record<string, unknown>).errors ? (
                    <Banner tone="critical">
                      <p>入力内容にエラーがあります。修正してください。</p>
                    </Banner>
                  ) : (fetcher.data as Record<string, unknown>).error ? (
                    <Banner tone="critical">
                      <p>{String((fetcher.data as Record<string, unknown>).error)}</p>
                    </Banner>
                  ) : null)}

                {currentStep === 1 && (
                  <Step1BusinessInfo
                    formData={formData}
                    errors={errors}
                    onChange={handleFieldChange}
                  />
                )}

                {currentStep === 2 && (
                  <Step2SalesConditions
                    formData={formData}
                    errors={errors}
                    onChange={handleFieldChange}
                    openSections={openSections}
                    onToggleSection={handleToggleSection}
                  />
                )}

                {currentStep === 3 && (
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
                    {currentStep < 3 && (
                      <Button variant="primary" onClick={handleNext}>
                        次へ
                      </Button>
                    )}
                  </div>
                </InlineStack>
              </>
            )}
          </BlockStack>
        </Layout.Section>
      </Layout>

      {/* T1-6: Exit confirmation modal */}
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
