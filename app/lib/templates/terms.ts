import { html, safeHtml, nlToBr, getLabelFromOptions, escapeHtml } from "../sanitize";
import type { TermsFormData } from "../validation/terms";
import { PROHIBITED_ACTIONS_OPTIONS, JURISDICTION_OPTIONS } from "../validation/terms";

/**
 * Generate the HTML for a 利用規約 (Terms of Service) page.
 * All user input is auto-escaped via the `html` tagged template literal.
 */
export function generateTermsHtml(data: TermsFormData): string {
  const prohibitedList = data.prohibitedActions
    .map((key) => {
      const found = PROHIBITED_ACTIONS_OPTIONS.find((o) => o.value === key);
      return found ? found.label : key;
    })
    .map((label) => html`<li>${label}</li>`)
    .join("\n");

  const otherProhibited = data.prohibitedActionsOther
    ? html`<li>${data.prohibitedActionsOther}</li>`
    : "";

  const jurisdictionLabel = data.jurisdiction === "other" && data.jurisdictionOther
    ? escapeHtml(data.jurisdictionOther)
    : getLabelFromOptions(JURISDICTION_OPTIONS, data.jurisdiction);

  return html`<div style="max-width:800px;margin:0 auto;">
  <h1 style="font-size:1.5em;margin-bottom:20px;">利用規約</h1>

  <p style="${safeHtml(P_STYLE)}">この利用規約（以下「本規約」といいます）は、${data.businessName}（以下「当社」といいます）が提供する${data.serviceName}（以下「本サービス」といいます）の利用条件を定めるものです。ユーザーの皆さまには、本規約に同意いただいた上で、本サービスをご利用いただきます。</p>

  <h2 style="${safeHtml(H2_STYLE)}">第1条（適用）</h2>
  <p style="${safeHtml(P_STYLE)}">本規約は、ユーザーと当社との間の本サービスの利用に関わる一切の関係に適用されるものとします。</p>

  <h2 style="${safeHtml(H2_STYLE)}">第2条（利用登録）</h2>
  <p style="${safeHtml(P_STYLE)}">${safeHtml(nlToBr(data.registrationRequirement))}</p>

  <h2 style="${safeHtml(H2_STYLE)}">第3条（禁止事項）</h2>
  <p style="${safeHtml(P_STYLE)}">ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。</p>
  <ol style="${safeHtml(OL_STYLE)}">
    ${safeHtml(prohibitedList)}
    ${safeHtml(otherProhibited)}
  </ol>

  <h2 style="${safeHtml(H2_STYLE)}">第4条（知的財産権）</h2>
  <p style="${safeHtml(P_STYLE)}">${safeHtml(nlToBr(data.intellectualProperty))}</p>

  <h2 style="${safeHtml(H2_STYLE)}">第5条（免責事項）</h2>
  <p style="${safeHtml(P_STYLE)}">${safeHtml(nlToBr(data.disclaimer))}</p>

  <h2 style="${safeHtml(H2_STYLE)}">第6条（サービスの中断・停止）</h2>
  <p style="${safeHtml(P_STYLE)}">${safeHtml(nlToBr(data.serviceInterruption))}</p>

  <h2 style="${safeHtml(H2_STYLE)}">第7条（規約の変更）</h2>
  <p style="${safeHtml(P_STYLE)}">${safeHtml(nlToBr(data.termsChangePolicy))}</p>

  <h2 style="${safeHtml(H2_STYLE)}">第8条（準拠法・裁判管轄）</h2>
  <p style="${safeHtml(P_STYLE)}">本規約の解釈にあたっては、日本法を準拠法とします。本サービスに関して紛争が生じた場合には、${safeHtml(jurisdictionLabel)}を第一審の専属的合意管轄裁判所とします。</p>

  <h2 style="${safeHtml(H2_STYLE)}">第9条（お問い合わせ）</h2>
  <p style="${safeHtml(P_STYLE)}">本規約に関するお問い合わせは、以下までご連絡ください。</p>
  <p style="${safeHtml(P_STYLE)}">
    ${data.businessName}<br>
    サービス名: ${data.serviceName}<br>
    メール: ${data.email}<br>
    URL: ${data.siteUrl}
  </p>
  <p style="${safeHtml(P_STYLE)}">お問い合わせ方法: ${safeHtml(nlToBr(data.contactMethod))}</p>
</div>`;
}

const H2_STYLE = "font-size:1.2em;margin-top:24px;margin-bottom:12px;border-bottom:1px solid #ddd;padding-bottom:8px;";
const P_STYLE = "margin-bottom:12px;line-height:1.8;";
const OL_STYLE = "margin-bottom:12px;padding-left:24px;line-height:1.8;";

