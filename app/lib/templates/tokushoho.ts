import { html, safeHtml } from "../sanitize";
import type { TokushohoFormData } from "../validation/wizard";
import { PAYMENT_METHODS } from "../../types/wizard";

/**
 * Generate the HTML for a 特定商取引法に基づく表記 (Tokushoho) page.
 * All user input is auto-escaped via the `html` tagged template literal.
 */
export function generateTokushohoHtml(data: TokushohoFormData): string {
  const paymentMethodLabels = data.paymentMethods
    .map((method) => {
      const found = PAYMENT_METHODS.find((m) => m.value === method);
      return found ? found.label : method;
    })
    .join("、");

  const addressContent =
    data.addressDisclosure === "public"
      ? html`〒${data.postalCode} ${data.address}`
      : "請求があった場合、遅滞なく開示いたします。";

  const phoneContent =
    data.addressDisclosure === "public"
      ? data.phone
      : "請求があった場合、遅滞なく開示いたします。";

  const quantityRow = data.quantityLimit
    ? html`<tr><th style="${safeHtml(TH_STYLE)}">販売数量の制限</th><td style="${safeHtml(TD_STYLE)}">${data.quantityLimit}</td></tr>`
    : "";

  const deliveryNotesRow = data.deliveryNotes
    ? html`<tr><th style="${safeHtml(TH_STYLE)}">引き渡し時期の特記事項</th><td style="${safeHtml(TD_STYLE)}">${safeHtml(nlToBr(data.deliveryNotes))}</td></tr>`
    : "";

  return html`<div style="max-width:800px;margin:0 auto;">
  <h1 style="font-size:1.5em;margin-bottom:20px;">特定商取引法に基づく表記</h1>
  <table style="width:100%;border-collapse:collapse;">
    <tbody>
      <tr>
        <th style="${safeHtml(TH_STYLE)}">販売業者</th>
        <td style="${safeHtml(TD_STYLE)}">${data.businessName}</td>
      </tr>
      <tr>
        <th style="${safeHtml(TH_STYLE)}">運営責任者</th>
        <td style="${safeHtml(TD_STYLE)}">${data.representativeName}</td>
      </tr>
      <tr>
        <th style="${safeHtml(TH_STYLE)}">所在地</th>
        <td style="${safeHtml(TD_STYLE)}">${safeHtml(addressContent)}</td>
      </tr>
      <tr>
        <th style="${safeHtml(TH_STYLE)}">電話番号</th>
        <td style="${safeHtml(TD_STYLE)}">${phoneContent}</td>
      </tr>
      <tr>
        <th style="${safeHtml(TH_STYLE)}">メールアドレス</th>
        <td style="${safeHtml(TD_STYLE)}">${data.email}</td>
      </tr>
      <tr>
        <th style="${safeHtml(TH_STYLE)}">販売価格</th>
        <td style="${safeHtml(TD_STYLE)}">${safeHtml(nlToBr(data.sellingPrice))}</td>
      </tr>
      <tr>
        <th style="${safeHtml(TH_STYLE)}">商品代金以外の必要料金</th>
        <td style="${safeHtml(TD_STYLE)}">${safeHtml(nlToBr(data.additionalFees))}</td>
      </tr>
      <tr>
        <th style="${safeHtml(TH_STYLE)}">支払方法</th>
        <td style="${safeHtml(TD_STYLE)}">${paymentMethodLabels}</td>
      </tr>
      <tr>
        <th style="${safeHtml(TH_STYLE)}">支払時期</th>
        <td style="${safeHtml(TD_STYLE)}">${safeHtml(nlToBr(data.paymentTiming))}</td>
      </tr>
      <tr>
        <th style="${safeHtml(TH_STYLE)}">商品の引渡時期</th>
        <td style="${safeHtml(TD_STYLE)}">${safeHtml(nlToBr(data.deliveryTime))}</td>
      </tr>
      ${safeHtml(deliveryNotesRow)}
      <tr>
        <th style="${safeHtml(TH_STYLE)}">返品・交換について</th>
        <td style="${safeHtml(TD_STYLE)}">${safeHtml(nlToBr(data.returnPolicy))}</td>
      </tr>
      <tr>
        <th style="${safeHtml(TH_STYLE)}">返品期限</th>
        <td style="${safeHtml(TD_STYLE)}">${data.returnDeadline}</td>
      </tr>
      <tr>
        <th style="${safeHtml(TH_STYLE)}">返品送料</th>
        <td style="${safeHtml(TD_STYLE)}">${data.returnShippingCost}</td>
      </tr>
      <tr>
        <th style="${safeHtml(TH_STYLE)}">商品の不良について</th>
        <td style="${safeHtml(TD_STYLE)}">${safeHtml(nlToBr(data.defectiveItemPolicy))}</td>
      </tr>
      ${safeHtml(quantityRow)}
    </tbody>
  </table>
</div>`;
}

// Inline styles for consistent rendering across Shopify themes
const TH_STYLE =
  "border:1px solid #ddd;padding:12px 16px;background:#f8f8f8;font-weight:bold;text-align:left;vertical-align:top;width:30%;white-space:nowrap;";
const TD_STYLE =
  "border:1px solid #ddd;padding:12px 16px;vertical-align:top;";

/**
 * Convert newlines to <br> tags in escaped text.
 * The input text must already be HTML-escaped via the html`` tag.
 */
function nlToBr(text: string): string {
  // First escape the text, then replace newlines
  const escaped = html`${text}`;
  return escaped.replace(/\n/g, "<br>");
}
