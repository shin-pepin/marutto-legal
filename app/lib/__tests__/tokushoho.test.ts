import { describe, it, expect } from "vitest";
import { generateTokushohoHtml } from "../templates/tokushoho";
import type { TokushohoFormData } from "../validation/wizard";

const baseFormData: TokushohoFormData = {
  businessName: "株式会社テスト",
  representativeName: "山田太郎",
  postalCode: "100-0001",
  address: "東京都千代田区千代田1-1",
  phone: "03-1234-5678",
  email: "test@example.com",
  businessType: "corporation",
  addressDisclosure: "public",
  sellingPrice: "各商品ページに記載の価格（税込）",
  additionalFees: "送料：全国一律660円",
  paymentMethods: ["credit_card", "bank_transfer"],
  paymentTiming: "クレジットカード：ご注文時\n銀行振込：ご注文後7日以内",
  deliveryTime: "3〜5営業日以内に発送",
  deliveryNotes: "",
  returnPolicy: "商品到着後7日以内",
  returnDeadline: "商品到着後7日以内",
  returnShippingCost: "お客様負担",
  defectiveItemPolicy: "不良品は交換対応",
  quantityLimit: "",
};

describe("generateTokushohoHtml", () => {
  it("generates HTML with correct structure", () => {
    const html = generateTokushohoHtml(baseFormData);
    expect(html).toContain("特定商取引法に基づく表記");
    expect(html).toContain("<table");
    expect(html).toContain("</table>");
  });

  it("includes business name", () => {
    const html = generateTokushohoHtml(baseFormData);
    expect(html).toContain("株式会社テスト");
  });

  it("includes representative name", () => {
    const html = generateTokushohoHtml(baseFormData);
    expect(html).toContain("山田太郎");
  });

  it("shows address when disclosure is public", () => {
    const html = generateTokushohoHtml(baseFormData);
    expect(html).toContain("〒100-0001");
    expect(html).toContain("東京都千代田区千代田1-1");
  });

  it("shows disclosure message when address is on_request", () => {
    const html = generateTokushohoHtml({
      ...baseFormData,
      addressDisclosure: "on_request",
    });
    expect(html).toContain("請求があった場合、遅滞なく開示いたします。");
    expect(html).not.toContain("東京都千代田区千代田1-1");
  });

  it("hides phone number when address is on_request", () => {
    const html = generateTokushohoHtml({
      ...baseFormData,
      addressDisclosure: "on_request",
    });
    expect(html).not.toContain("03-1234-5678");
    expect(html).toContain("請求があった場合、遅滞なく開示いたします。");
  });

  it("shows payment methods as labels", () => {
    const html = generateTokushohoHtml(baseFormData);
    expect(html).toContain("クレジットカード");
    expect(html).toContain("銀行振込");
  });

  it("converts newlines to br tags in multiline fields", () => {
    const html = generateTokushohoHtml(baseFormData);
    expect(html).toContain("<br>");
  });

  it("includes optional quantity limit when provided", () => {
    const html = generateTokushohoHtml({
      ...baseFormData,
      quantityLimit: "お一人様5個まで",
    });
    expect(html).toContain("販売数量の制限");
    expect(html).toContain("お一人様5個まで");
  });

  it("excludes quantity limit row when empty", () => {
    const html = generateTokushohoHtml(baseFormData);
    expect(html).not.toContain("販売数量の制限");
  });

  it("escapes XSS in business name", () => {
    const html = generateTokushohoHtml({
      ...baseFormData,
      businessName: '<script>alert("xss")</script>',
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes XSS in email", () => {
    const result = generateTokushohoHtml({
      ...baseFormData,
      email: '" onmouseover="alert(1)',
    });
    // The quotes are escaped, preventing attribute breakout
    expect(result).toContain("&quot; onmouseover=&quot;alert(1)");
    expect(result).not.toContain('" onmouseover="alert(1)');
  });

  it("escapes XSS in address", () => {
    const html = generateTokushohoHtml({
      ...baseFormData,
      address: '<img src=x onerror=alert(1)>',
    });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("escapes XSS in multiline fields", () => {
    const html = generateTokushohoHtml({
      ...baseFormData,
      returnPolicy: '<script>alert("xss")</script>\n正常なテキスト',
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("includes inline styles for consistent rendering", () => {
    const html = generateTokushohoHtml(baseFormData);
    expect(html).toContain("style=");
    expect(html).toContain("border:");
  });
});
