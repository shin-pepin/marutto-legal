import { describe, it, expect } from "vitest";
import { generatePrivacyHtml } from "../templates/privacy";
import type { PrivacyFormData } from "../validation/privacy";

const baseFormData: PrivacyFormData = {
  businessName: "株式会社テスト",
  representativeName: "山田太郎",
  address: "東京都千代田区千代田1-1",
  email: "test@example.com",
  siteUrl: "https://example.com",
  collectedInfo: ["name", "email", "address"],
  collectedInfoOther: "",
  purposeOfUse: ["order_processing", "customer_support"],
  purposeOfUseOther: "",
  thirdPartySharing: "none",
  thirdPartySharingDetail: "",
  useCookies: "yes",
  cookieDetail: "",
  useAnalytics: "yes",
  analyticsTools: "Google Analytics",
  retentionPeriod: "サービス利用終了後1年間",
  securityMeasures: "SSL暗号化通信を使用しています。",
  contactMethod: "メール (support@example.com)",
};

describe("generatePrivacyHtml", () => {
  it("generates HTML with correct structure", () => {
    const html = generatePrivacyHtml(baseFormData);
    expect(html).toContain("プライバシーポリシー");
    expect(html).toContain("<h1");
    expect(html).toContain("<h2");
  });

  it("includes business name", () => {
    const html = generatePrivacyHtml(baseFormData);
    expect(html).toContain("株式会社テスト");
  });

  it("includes representative name", () => {
    const html = generatePrivacyHtml(baseFormData);
    expect(html).toContain("山田太郎");
  });

  it("includes contact information", () => {
    const html = generatePrivacyHtml(baseFormData);
    expect(html).toContain("東京都千代田区千代田1-1");
    expect(html).toContain("test@example.com");
    expect(html).toContain("https://example.com");
  });

  it("renders collected info as list items", () => {
    const html = generatePrivacyHtml(baseFormData);
    expect(html).toContain("氏名");
    expect(html).toContain("メールアドレス");
    expect(html).toContain("住所");
  });

  it("includes other collected info when provided", () => {
    const html = generatePrivacyHtml({
      ...baseFormData,
      collectedInfoOther: "SNSアカウント情報",
    });
    expect(html).toContain("SNSアカウント情報");
  });

  it("renders purpose of use as list items", () => {
    const html = generatePrivacyHtml(baseFormData);
    expect(html).toContain("ご注文の処理・配送");
    expect(html).toContain("お問い合わせへの対応");
  });

  it("includes other purpose of use when provided", () => {
    const html = generatePrivacyHtml({
      ...baseFormData,
      purposeOfUseOther: "マーケティングリサーチ",
    });
    expect(html).toContain("マーケティングリサーチ");
  });

  it("renders third-party sharing text for 'none'", () => {
    const html = generatePrivacyHtml(baseFormData);
    expect(html).toContain("第三者に提供することはありません");
  });

  it("renders third-party sharing text for 'with_consent'", () => {
    const html = generatePrivacyHtml({
      ...baseFormData,
      thirdPartySharing: "with_consent",
    });
    expect(html).toContain("お客様の同意を得た場合");
  });

  it("renders third-party sharing text for 'partial' with detail", () => {
    const html = generatePrivacyHtml({
      ...baseFormData,
      thirdPartySharing: "partial",
      thirdPartySharingDetail: "配送業者への委託のみ",
    });
    expect(html).toContain("配送業者への委託のみ");
  });

  it("renders third-party sharing default text for 'partial' without detail", () => {
    const html = generatePrivacyHtml({
      ...baseFormData,
      thirdPartySharing: "partial",
      thirdPartySharingDetail: "",
    });
    expect(html).toContain("業務委託先");
  });

  it("renders cookie section when useCookies is 'yes'", () => {
    const html = generatePrivacyHtml(baseFormData);
    expect(html).toContain("Cookieの使用について");
  });

  it("excludes cookie section when useCookies is 'no'", () => {
    const html = generatePrivacyHtml({
      ...baseFormData,
      useCookies: "no",
    });
    expect(html).not.toContain("Cookieの使用について");
  });

  it("includes custom cookie detail when provided", () => {
    const html = generatePrivacyHtml({
      ...baseFormData,
      useCookies: "yes",
      cookieDetail: "セッション管理に使用します",
    });
    expect(html).toContain("セッション管理に使用します");
  });

  it("renders analytics section when useAnalytics is 'yes'", () => {
    const html = generatePrivacyHtml(baseFormData);
    expect(html).toContain("アクセス解析ツールについて");
    expect(html).toContain("Google Analytics");
  });

  it("excludes analytics section when useAnalytics is 'no'", () => {
    const html = generatePrivacyHtml({
      ...baseFormData,
      useAnalytics: "no",
    });
    expect(html).not.toContain("アクセス解析ツールについて");
  });

  it("includes retention period", () => {
    const html = generatePrivacyHtml(baseFormData);
    expect(html).toContain("サービス利用終了後1年間");
  });

  it("includes security measures", () => {
    const html = generatePrivacyHtml(baseFormData);
    expect(html).toContain("SSL暗号化通信を使用しています。");
  });

  it("includes contact method", () => {
    const html = generatePrivacyHtml(baseFormData);
    expect(html).toContain("support@example.com");
  });

  it("includes customer rights section", () => {
    const html = generatePrivacyHtml(baseFormData);
    expect(html).toContain("お客様の権利");
    expect(html).toContain("開示・訂正・削除・利用停止");
  });

  it("includes policy change section", () => {
    const html = generatePrivacyHtml(baseFormData);
    expect(html).toContain("プライバシーポリシーの変更");
  });

  it("escapes XSS in business name", () => {
    const html = generatePrivacyHtml({
      ...baseFormData,
      businessName: '<script>alert("xss")</script>',
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes XSS in email", () => {
    const html = generatePrivacyHtml({
      ...baseFormData,
      email: '" onmouseover="alert(1)',
    });
    expect(html).toContain("&quot;");
    expect(html).not.toContain('" onmouseover="alert(1)');
  });

  it("escapes XSS in other collected info", () => {
    const html = generatePrivacyHtml({
      ...baseFormData,
      collectedInfoOther: '<img src=x onerror=alert(1)>',
    });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("includes inline styles for consistent rendering", () => {
    const html = generatePrivacyHtml(baseFormData);
    expect(html).toContain("style=");
    expect(html).toContain("max-width:800px");
  });

  it("renders all collected info options correctly", () => {
    const html = generatePrivacyHtml({
      ...baseFormData,
      collectedInfo: ["name", "email", "address", "phone", "birthday", "payment", "purchase_history", "ip_address", "cookie"],
    });
    expect(html).toContain("氏名");
    expect(html).toContain("メールアドレス");
    expect(html).toContain("住所");
    expect(html).toContain("電話番号");
    expect(html).toContain("生年月日");
    expect(html).toContain("決済情報");
    expect(html).toContain("購入履歴");
    expect(html).toContain("IPアドレス");
    expect(html).toContain("Cookie情報");
  });

  it("renders all purpose options correctly", () => {
    const html = generatePrivacyHtml({
      ...baseFormData,
      purposeOfUse: ["order_processing", "customer_support", "marketing", "service_improvement", "analytics", "legal", "fraud_prevention"],
    });
    expect(html).toContain("ご注文の処理・配送");
    expect(html).toContain("お問い合わせへの対応");
    expect(html).toContain("新商品・セール等のご案内");
    expect(html).toContain("サービスの改善・開発");
    expect(html).toContain("アクセス解析・統計情報の作成");
    expect(html).toContain("法令に基づく対応");
    expect(html).toContain("不正行為の防止");
  });
});
