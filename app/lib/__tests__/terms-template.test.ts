import { describe, it, expect } from "vitest";
import { generateTermsHtml } from "../templates/terms";
import type { TermsFormData } from "../validation/terms";

const baseFormData: TermsFormData = {
  businessName: "株式会社テスト",
  serviceName: "テストサービス",
  siteUrl: "https://example.com",
  email: "test@example.com",
  registrationRequirement: "所定の方法で利用登録を申請してください。",
  prohibitedActions: ["illegal", "ip_infringement", "defamation"],
  prohibitedActionsOther: "",
  intellectualProperty: "本サービスに関する知的財産権はすべて当社に帰属します。",
  disclaimer: "当社は損害について一切の責任を負いません。",
  serviceInterruption: "メンテナンス時にサービスを中断する場合があります。",
  termsChangePolicy: "当社は必要に応じて本規約を変更します。",
  jurisdiction: "tokyo",
  jurisdictionOther: "",
  contactMethod: "メール (support@example.com)",
};

describe("generateTermsHtml", () => {
  it("generates HTML with correct structure", () => {
    const html = generateTermsHtml(baseFormData);
    expect(html).toContain("利用規約");
    expect(html).toContain("<h1");
    expect(html).toContain("<h2");
  });

  it("includes business name and service name", () => {
    const html = generateTermsHtml(baseFormData);
    expect(html).toContain("株式会社テスト");
    expect(html).toContain("テストサービス");
  });

  it("includes contact information", () => {
    const html = generateTermsHtml(baseFormData);
    expect(html).toContain("test@example.com");
    expect(html).toContain("https://example.com");
  });

  it("renders prohibited actions as list items", () => {
    const html = generateTermsHtml(baseFormData);
    expect(html).toContain("法令または公序良俗に違反する行為");
    expect(html).toContain("知的財産権を侵害する行為");
    expect(html).toContain("他者の名誉・信用を毀損する行為");
  });

  it("includes other prohibited actions when provided", () => {
    const html = generateTermsHtml({
      ...baseFormData,
      prohibitedActionsOther: "スパム行為",
    });
    expect(html).toContain("スパム行為");
  });

  it("excludes other prohibited actions when empty", () => {
    const html = generateTermsHtml(baseFormData);
    const listItems = html.match(/<li>/g) || [];
    expect(listItems.length).toBe(3); // 3 selected prohibited actions
  });

  it("includes registration requirement", () => {
    const html = generateTermsHtml(baseFormData);
    expect(html).toContain("所定の方法で利用登録を申請してください");
  });

  it("includes intellectual property section", () => {
    const html = generateTermsHtml(baseFormData);
    expect(html).toContain("知的財産権");
    expect(html).toContain("本サービスに関する知的財産権はすべて当社に帰属します");
  });

  it("includes disclaimer section", () => {
    const html = generateTermsHtml(baseFormData);
    expect(html).toContain("免責事項");
    expect(html).toContain("一切の責任を負いません");
  });

  it("includes service interruption section", () => {
    const html = generateTermsHtml(baseFormData);
    expect(html).toContain("サービスの中断・停止");
  });

  it("includes terms change policy section", () => {
    const html = generateTermsHtml(baseFormData);
    expect(html).toContain("規約の変更");
  });

  it("renders Tokyo jurisdiction", () => {
    const html = generateTermsHtml(baseFormData);
    expect(html).toContain("東京地方裁判所");
  });

  it("renders Osaka jurisdiction", () => {
    const html = generateTermsHtml({
      ...baseFormData,
      jurisdiction: "osaka",
    });
    expect(html).toContain("大阪地方裁判所");
  });

  it("renders custom jurisdiction when 'other' with detail", () => {
    const html = generateTermsHtml({
      ...baseFormData,
      jurisdiction: "other",
      jurisdictionOther: "横浜地方裁判所",
    });
    expect(html).toContain("横浜地方裁判所");
  });

  it("includes contact method", () => {
    const html = generateTermsHtml(baseFormData);
    expect(html).toContain("support@example.com");
  });

  it("renders all prohibited action options correctly", () => {
    const html = generateTermsHtml({
      ...baseFormData,
      prohibitedActions: [
        "illegal", "ip_infringement", "defamation", "unauthorized_access",
        "commercial_use", "service_disruption", "impersonation", "antisocial",
      ],
    });
    expect(html).toContain("法令または公序良俗に違反する行為");
    expect(html).toContain("知的財産権を侵害する行為");
    expect(html).toContain("他者の名誉・信用を毀損する行為");
    expect(html).toContain("不正アクセスまたはその試み");
    expect(html).toContain("無断での商用利用");
    expect(html).toContain("サービスの運営を妨害する行為");
    expect(html).toContain("他者へのなりすまし");
    expect(html).toContain("反社会的勢力への利益供与");
  });

  it("escapes XSS in business name", () => {
    const html = generateTermsHtml({
      ...baseFormData,
      businessName: '<script>alert("xss")</script>',
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes XSS in service name", () => {
    const html = generateTermsHtml({
      ...baseFormData,
      serviceName: '<img src=x onerror=alert(1)>',
    });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("escapes XSS in other prohibited actions", () => {
    const html = generateTermsHtml({
      ...baseFormData,
      prohibitedActionsOther: '<script>alert("xss")</script>',
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes XSS in jurisdiction other", () => {
    const html = generateTermsHtml({
      ...baseFormData,
      jurisdiction: "other",
      jurisdictionOther: '" onmouseover="alert(1)',
    });
    expect(html).toContain("&quot;");
  });

  it("includes inline styles for consistent rendering", () => {
    const html = generateTermsHtml(baseFormData);
    expect(html).toContain("style=");
    expect(html).toContain("max-width:800px");
  });

  it("uses ordered list for prohibited actions", () => {
    const html = generateTermsHtml(baseFormData);
    expect(html).toContain("<ol");
  });
});
