import { useState, useCallback, useEffect, useRef } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  BlockStack,
  Button,
  InlineStack,
  Banner,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { WizardStepper } from "../components/wizard/WizardStepper";
import { Step1BusinessInfo } from "../components/wizard/Step1BusinessInfo";
import { Step2SalesConditions } from "../components/wizard/Step2SalesConditions";
import { Step3PreviewPublish } from "../components/wizard/Step3PreviewPublish";
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
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  await ensureStore(shop);

  // Load existing form data if any
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
      await upsertLegalPageDraft(shop, "tokushoho", formDataJson, expectedVersion);
    } catch (error) {
      if (error instanceof OptimisticLockError) {
        return json({ success: false, intent: "save-draft", error: error.message }, { status: 409 });
      }
      throw error;
    }
    return json({ success: true, intent: "save-draft" });
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

    if (existingPage?.shopifyPageId) {
      // Check if page still exists on Shopify
      const page = await getPage(admin, existingPage.shopifyPageId);
      if (page) {
        // Update existing page
        await updatePage(admin, existingPage.shopifyPageId, {
          bodyHtml: contentHtml,
        });
        shopifyPageId = existingPage.shopifyPageId;
      } else {
        // Page was deleted on Shopify, create new
        const result = await createPage(admin, {
          title: "特定商取引法に基づく表記",
          handle: "legal",
          bodyHtml: contentHtml,
          published: false,
        });
        shopifyPageId = result.pageId;
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
    }

    // Save to DB with optimistic lock
    const versionStr = formPayload.get("version") as string | null;
    const expectedVersion = versionStr ? parseInt(versionStr, 10) : undefined;
    try {
      await publishLegalPage(shop, "tokushoho", {
        shopifyPageId,
        contentHtml,
        formData: formDataJson,
      }, expectedVersion);
    } catch (error) {
      if (error instanceof OptimisticLockError) {
        return json({ success: false, intent: "publish", error: error.message }, { status: 409 });
      }
      throw error;
    }

    return json({
      success: true,
      intent: "publish",
      shopifyPageId,
    });
  }

  return json({ success: false, intent: "unknown" });
};

export default function WizardPage() {
  const { formData: initialFormData, existingPage } =
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
  const [pageVersion, setPageVersion] = useState<number | undefined>(
    existingPage?.version,
  );
  const pageVersionRef = useRef(pageVersion);
  pageVersionRef.current = pageVersion;
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();

  const isPublishing =
    fetcher.state !== "idle" &&
    fetcher.formData?.get("intent") === "publish";

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

  // Handle action results
  useEffect(() => {
    if (fetcher.data?.success) {
      // Increment local version on successful save
      setPageVersion((prev) => (prev !== undefined ? prev + 1 : 1));
      if (fetcher.data.intent === "publish") {
        setPublishSuccess(true);
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
              <Banner
                tone="success"
                title={isUpdate ? "ページが更新されました" : "ページが作成されました"}
              >
                <p>
                  特定商取引法に基づく表記ページが正常に
                  {isUpdate ? "更新" : "作成（非公開）"}されました。
                  {!isUpdate && "Shopify管理画面の「オンラインストア > ページ」から公開設定を行ってください。"}
                </p>
              </Banner>
            ) : (
              <>
                {fetcher.data?.intent === "publish" &&
                  !fetcher.data.success &&
                  (fetcher.data as Record<string, unknown>).errors && (
                    <Banner tone="critical">
                      <p>入力内容にエラーがあります。修正してください。</p>
                    </Banner>
                  )}

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
    </Page>
  );
}
