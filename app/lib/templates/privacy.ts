import { html, safeHtml } from "../sanitize";
import type { PrivacyFormData } from "../validation/privacy";
import { COLLECTED_INFO_OPTIONS, PURPOSE_OF_USE_OPTIONS } from "../validation/privacy";

/**
 * Generate the HTML for a プライバシーポリシー (Privacy Policy) page.
 * All user input is auto-escaped via the `html` tagged template literal.
 */
export function generatePrivacyHtml(data: PrivacyFormData): string {
  const collectedInfoLabels = data.collectedInfo
    .map((key) => {
      const found = COLLECTED_INFO_OPTIONS.find((o) => o.value === key);
      return found ? found.label : key;
    });

  const collectedInfoList = collectedInfoLabels
    .map((label) => html`<li>${label}</li>`)
    .join("\n");

  const otherCollectedInfo = data.collectedInfoOther
    ? html`<li>${data.collectedInfoOther}</li>`
    : "";

  const purposeLabels = data.purposeOfUse
    .map((key) => {
      const found = PURPOSE_OF_USE_OPTIONS.find((o) => o.value === key);
      return found ? found.label : key;
    });

  const purposeList = purposeLabels
    .map((label) => html`<li>${label}</li>`)
    .join("\n");

  const otherPurpose = data.purposeOfUseOther
    ? html`<li>${data.purposeOfUseOther}</li>`
    : "";

  const thirdPartySharingText = getThirdPartySharingText(data.thirdPartySharing, data.thirdPartySharingDetail);

  const cookieSection = data.useCookies === "yes"
    ? html`
    <h2 style="${safeHtml(H2_STYLE)}">Cookieの使用について</h2>
    <p style="${safeHtml(P_STYLE)}">当サイトでは、ユーザー体験の向上のためCookieを使用しています。${data.cookieDetail ? safeHtml(nlToBr(data.cookieDetail)) : "ブラウザの設定でCookieを無効にすることも可能ですが、一部のサービスが正常に利用できなくなる場合があります。"}</p>`
    : "";

  const analyticsSection = data.useAnalytics === "yes"
    ? html`
    <h2 style="${safeHtml(H2_STYLE)}">アクセス解析ツールについて</h2>
    <p style="${safeHtml(P_STYLE)}">当サイトでは、${data.analyticsTools || "アクセス解析ツール"}を使用しています。これらのツールはトラフィックデータの収集のためにCookieを使用しています。このデータは匿名で収集されており、個人を特定するものではありません。</p>`
    : "";

  return html`<div style="max-width:800px;margin:0 auto;">
  <h1 style="font-size:1.5em;margin-bottom:20px;">プライバシーポリシー</h1>

  <p style="${safeHtml(P_STYLE)}">${data.businessName}（以下「当社」といいます）は、お客様の個人情報の保護を重要な責務と考え、以下のとおりプライバシーポリシーを定め、個人情報の適切な管理・保護に努めます。</p>

  <h2 style="${safeHtml(H2_STYLE)}">1. 収集する個人情報</h2>
  <p style="${safeHtml(P_STYLE)}">当社は、以下の個人情報を収集することがあります。</p>
  <ul style="${safeHtml(UL_STYLE)}">
    ${safeHtml(collectedInfoList)}
    ${safeHtml(otherCollectedInfo)}
  </ul>

  <h2 style="${safeHtml(H2_STYLE)}">2. 個人情報の利用目的</h2>
  <p style="${safeHtml(P_STYLE)}">収集した個人情報は、以下の目的で利用いたします。</p>
  <ul style="${safeHtml(UL_STYLE)}">
    ${safeHtml(purposeList)}
    ${safeHtml(otherPurpose)}
  </ul>

  <h2 style="${safeHtml(H2_STYLE)}">3. 個人情報の第三者提供</h2>
  <p style="${safeHtml(P_STYLE)}">${safeHtml(thirdPartySharingText)}</p>

  ${safeHtml(cookieSection)}

  ${safeHtml(analyticsSection)}

  <h2 style="${safeHtml(H2_STYLE)}">4. 個人情報の保存期間</h2>
  <p style="${safeHtml(P_STYLE)}">${safeHtml(nlToBr(data.retentionPeriod))}</p>

  <h2 style="${safeHtml(H2_STYLE)}">5. セキュリティ対策</h2>
  <p style="${safeHtml(P_STYLE)}">${safeHtml(nlToBr(data.securityMeasures))}</p>

  <h2 style="${safeHtml(H2_STYLE)}">6. お客様の権利</h2>
  <p style="${safeHtml(P_STYLE)}">お客様は、当社が保有するご自身の個人情報について、開示・訂正・削除・利用停止を請求する権利を有します。ご請求の際は、下記のお問い合わせ先までご連絡ください。</p>

  <h2 style="${safeHtml(H2_STYLE)}">7. プライバシーポリシーの変更</h2>
  <p style="${safeHtml(P_STYLE)}">当社は、必要に応じて本プライバシーポリシーを変更することがあります。変更した場合は、当サイトにてお知らせいたします。</p>

  <h2 style="${safeHtml(H2_STYLE)}">8. お問い合わせ</h2>
  <p style="${safeHtml(P_STYLE)}">個人情報の取り扱いに関するお問い合わせは、以下までご連絡ください。</p>
  <p style="${safeHtml(P_STYLE)}">
    ${data.businessName}<br>
    代表者: ${data.representativeName}<br>
    所在地: ${data.address}<br>
    メール: ${data.email}<br>
    URL: ${data.siteUrl}
  </p>

  <p style="${safeHtml(P_STYLE)}">お問い合わせ方法: ${safeHtml(nlToBr(data.contactMethod))}</p>
</div>`;
}

function getThirdPartySharingText(type: string, detail: string): string {
  switch (type) {
    case "none":
      return "当社は、法令に基づく場合を除き、お客様の個人情報を第三者に提供することはありません。";
    case "with_consent":
      return "当社は、お客様の同意を得た場合、および法令に基づく場合に限り、個人情報を第三者に提供することがあります。";
    case "partial":
      return detail
        ? nlToBr(detail)
        : "当社は、業務委託先に対して必要な範囲で個人情報を提供する場合があります。その際、委託先との間で適切な契約を締結し、個人情報の管理を徹底いたします。";
    default:
      return "当社は、法令に基づく場合を除き、お客様の個人情報を第三者に提供することはありません。";
  }
}

const H2_STYLE = "font-size:1.2em;margin-top:24px;margin-bottom:12px;border-bottom:1px solid #ddd;padding-bottom:8px;";
const P_STYLE = "margin-bottom:12px;line-height:1.8;";
const UL_STYLE = "margin-bottom:12px;padding-left:24px;line-height:1.8;";

function nlToBr(text: string): string {
  const escaped = html`${text}`;
  return escaped.replace(/\n/g, "<br>");
}
