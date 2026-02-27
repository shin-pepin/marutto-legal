import { html, safeHtml, nlToBr, getLabelFromOptions } from "../sanitize";
import type { ReturnFormData } from "../validation/return";
import {
  RETURN_CONDITION_OPTIONS,
  SHIPPING_COST_OPTIONS,
  EXCHANGE_OPTIONS,
  REFUND_METHOD_OPTIONS,
} from "../validation/return";

/**
 * Generate the HTML for a 返品・交換ポリシー (Return Policy) page.
 * All user input is auto-escaped via the `html` tagged template literal.
 */
export function generateReturnHtml(data: ReturnFormData): string {
  const returnConditionLabel = getLabelFromOptions(RETURN_CONDITION_OPTIONS, data.returnCondition);
  const shippingCostLabel = getLabelFromOptions(SHIPPING_COST_OPTIONS, data.shippingCost);
  const exchangeLabel = getLabelFromOptions(EXCHANGE_OPTIONS, data.exchangePolicy);
  const refundMethodLabel = getLabelFromOptions(REFUND_METHOD_OPTIONS, data.refundMethod);

  const isNoReturns = data.returnCondition === "no_returns";

  const nonReturnableSection = data.nonReturnableItems
    ? html`
    <h2 style="${safeHtml(H2_STYLE)}">返品・交換をお受けできない場合</h2>
    <p style="${safeHtml(P_STYLE)}">${safeHtml(nlToBr(data.nonReturnableItems))}</p>`
    : "";

  const refundSection = !isNoReturns ? html`
  <h2 style="${safeHtml(H2_STYLE)}">返金について</h2>
  <table style="${safeHtml(TABLE_STYLE)}">
    <tr>
      <th style="${safeHtml(TH_STYLE)}">返金方法</th>
      <td style="${safeHtml(TD_STYLE)}">${refundMethodLabel}</td>
    </tr>
    <tr>
      <th style="${safeHtml(TH_STYLE)}">返金タイミング</th>
      <td style="${safeHtml(TD_STYLE)}">${data.refundTiming}</td>
    </tr>
  </table>

  <h2 style="${safeHtml(H2_STYLE)}">不良品について</h2>
  <p style="${safeHtml(P_STYLE)}">${safeHtml(nlToBr(data.defectiveHandling))}</p>

  <h2 style="${safeHtml(H2_STYLE)}">返品・交換の手順</h2>
  <p style="${safeHtml(P_STYLE)}">${safeHtml(nlToBr(data.returnProcess))}</p>` : "";

  return html`<div style="max-width:800px;margin:0 auto;">
  <h1 style="font-size:1.5em;margin-bottom:20px;">返品・交換ポリシー</h1>

  <p style="${safeHtml(P_STYLE)}">${data.businessName}（以下「当店」といいます）では、お客様に安心してお買い物いただけるよう、以下の返品・交換ポリシーを定めております。</p>

  <h2 style="${safeHtml(H2_STYLE)}">返品・交換の条件</h2>
  <table style="${safeHtml(TABLE_STYLE)}">
    ${safeHtml(!isNoReturns && data.returnDeadline ? html`<tr>
      <th style="${safeHtml(TH_STYLE)}">返品期限</th>
      <td style="${safeHtml(TD_STYLE)}">${data.returnDeadline}</td>
    </tr>` : "")}
    <tr>
      <th style="${safeHtml(TH_STYLE)}">返品条件</th>
      <td style="${safeHtml(TD_STYLE)}">${returnConditionLabel}</td>
    </tr>
    <tr>
      <th style="${safeHtml(TH_STYLE)}">返送料</th>
      <td style="${safeHtml(TD_STYLE)}">${shippingCostLabel}</td>
    </tr>
    <tr>
      <th style="${safeHtml(TH_STYLE)}">交換対応</th>
      <td style="${safeHtml(TD_STYLE)}">${exchangeLabel}</td>
    </tr>
  </table>

  ${safeHtml(refundSection)}

  ${safeHtml(nonReturnableSection)}

  <h2 style="${safeHtml(H2_STYLE)}">お問い合わせ</h2>
  <p style="${safeHtml(P_STYLE)}">返品・交換に関するお問い合わせは、以下までご連絡ください。</p>
  <p style="${safeHtml(P_STYLE)}">
    ${data.businessName}<br>
    メール: ${data.email}<br>
    電話: ${data.phone}<br>
    URL: ${data.siteUrl}
  </p>
  <p style="${safeHtml(P_STYLE)}">お問い合わせ方法: ${safeHtml(nlToBr(data.contactMethod))}</p>
</div>`;
}

const H2_STYLE = "font-size:1.2em;margin-top:24px;margin-bottom:12px;border-bottom:1px solid #ddd;padding-bottom:8px;";
const P_STYLE = "margin-bottom:12px;line-height:1.8;";
const TABLE_STYLE = "width:100%;border-collapse:collapse;margin-bottom:20px;";
const TH_STYLE = "text-align:left;padding:10px 12px;border:1px solid #ddd;background:#f8f8f8;width:30%;vertical-align:top;font-weight:600;";
const TD_STYLE = "padding:10px 12px;border:1px solid #ddd;vertical-align:top;";

