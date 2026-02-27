import { describe, it, expect } from "vitest";
import { generateReturnHtml } from "../templates/return";
import type { ReturnFormData } from "../validation/return";

const baseFormData: ReturnFormData = {
  businessName: "株式会社テスト",
  email: "test@example.com",
  phone: "03-1234-5678",
  siteUrl: "https://example.com",
  returnDeadline: "商品到着後7日以内",
  returnCondition: "unused_only",
  shippingCost: "customer",
  exchangePolicy: "available",
  refundMethod: "original_payment",
  refundTiming: "返品商品到着確認後、5営業日以内",
  defectiveHandling: "不良品の場合は送料当店負担で交換いたします。",
  returnProcess: "1. お問い合わせフォームからご連絡\n2. 返品承認後、商品を返送\n3. 確認後に返金処理",
  nonReturnableItems: "",
  contactMethod: "メール (support@example.com)",
};

describe("generateReturnHtml", () => {
  it("generates HTML with correct structure", () => {
    const html = generateReturnHtml(baseFormData);
    expect(html).toContain("返品・交換ポリシー");
    expect(html).toContain("<h1");
    expect(html).toContain("<h2");
  });

  it("includes business name", () => {
    const html = generateReturnHtml(baseFormData);
    expect(html).toContain("株式会社テスト");
  });

  it("includes contact information", () => {
    const html = generateReturnHtml(baseFormData);
    expect(html).toContain("test@example.com");
    expect(html).toContain("03-1234-5678");
    expect(html).toContain("https://example.com");
  });

  it("renders return deadline", () => {
    const html = generateReturnHtml(baseFormData);
    expect(html).toContain("商品到着後7日以内");
  });

  it("renders return condition label", () => {
    const html = generateReturnHtml(baseFormData);
    expect(html).toContain("未使用・未開封のみ");
  });

  it("renders defective_only return condition", () => {
    const html = generateReturnHtml({
      ...baseFormData,
      returnCondition: "defective_only",
    });
    expect(html).toContain("不良品のみ");
  });

  it("renders both return condition", () => {
    const html = generateReturnHtml({
      ...baseFormData,
      returnCondition: "both",
    });
    expect(html).toContain("両方対応");
  });

  it("renders no_returns condition", () => {
    const html = generateReturnHtml({
      ...baseFormData,
      returnCondition: "no_returns",
    });
    expect(html).toContain("返品不可");
  });

  it("renders shipping cost label", () => {
    const html = generateReturnHtml(baseFormData);
    expect(html).toContain("お客様負担");
  });

  it("renders store shipping cost", () => {
    const html = generateReturnHtml({
      ...baseFormData,
      shippingCost: "store",
    });
    expect(html).toContain("当店負担");
  });

  it("renders defective_store shipping cost", () => {
    const html = generateReturnHtml({
      ...baseFormData,
      shippingCost: "defective_store",
    });
    expect(html).toContain("不良品は当店負担");
  });

  it("renders exchange policy label", () => {
    const html = generateReturnHtml(baseFormData);
    expect(html).toContain("交換対応可能");
  });

  it("renders refund method label", () => {
    const html = generateReturnHtml(baseFormData);
    expect(html).toContain("元の支払方法に返金");
  });

  it("renders bank_transfer refund method", () => {
    const html = generateReturnHtml({
      ...baseFormData,
      refundMethod: "bank_transfer",
    });
    expect(html).toContain("銀行振込");
  });

  it("renders store_credit refund method", () => {
    const html = generateReturnHtml({
      ...baseFormData,
      refundMethod: "store_credit",
    });
    expect(html).toContain("ストアクレジット");
  });

  it("renders flexible refund method", () => {
    const html = generateReturnHtml({
      ...baseFormData,
      refundMethod: "flexible",
    });
    expect(html).toContain("柔軟に対応");
  });

  it("renders refund timing", () => {
    const html = generateReturnHtml(baseFormData);
    expect(html).toContain("5営業日以内");
  });

  it("renders defective handling section", () => {
    const html = generateReturnHtml(baseFormData);
    expect(html).toContain("不良品について");
    expect(html).toContain("不良品の場合は送料当店負担で交換いたします");
  });

  it("renders return process section", () => {
    const html = generateReturnHtml(baseFormData);
    expect(html).toContain("返品・交換の手順");
    expect(html).toContain("お問い合わせフォームからご連絡");
  });

  it("converts newlines to br in return process", () => {
    const html = generateReturnHtml(baseFormData);
    expect(html).toContain("<br>");
  });

  it("includes non-returnable items section when provided", () => {
    const html = generateReturnHtml({
      ...baseFormData,
      nonReturnableItems: "セール品、名入れ商品",
    });
    expect(html).toContain("返品・交換をお受けできない場合");
    expect(html).toContain("セール品、名入れ商品");
  });

  it("excludes non-returnable items section when empty", () => {
    const html = generateReturnHtml(baseFormData);
    expect(html).not.toContain("返品・交換をお受けできない場合");
  });

  it("includes contact method", () => {
    const html = generateReturnHtml(baseFormData);
    expect(html).toContain("support@example.com");
  });

  it("uses table layout for conditions", () => {
    const html = generateReturnHtml(baseFormData);
    expect(html).toContain("<table");
    expect(html).toContain("<th");
    expect(html).toContain("<td");
  });

  it("escapes XSS in business name", () => {
    const html = generateReturnHtml({
      ...baseFormData,
      businessName: '<script>alert("xss")</script>',
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes XSS in phone", () => {
    const html = generateReturnHtml({
      ...baseFormData,
      phone: '" onmouseover="alert(1)',
    });
    expect(html).toContain("&quot;");
  });

  it("escapes XSS in defective handling", () => {
    const html = generateReturnHtml({
      ...baseFormData,
      defectiveHandling: '<img src=x onerror=alert(1)>',
    });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("escapes XSS in non-returnable items", () => {
    const html = generateReturnHtml({
      ...baseFormData,
      nonReturnableItems: '<script>alert("xss")</script>',
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("includes inline styles for consistent rendering", () => {
    const html = generateReturnHtml(baseFormData);
    expect(html).toContain("style=");
    expect(html).toContain("max-width:800px");
  });
});
