export type BusinessType = "corporation" | "individual";
export type AddressDisclosure = "public" | "on_request";
export type PageType = "tokushoho" | "privacy" | "terms" | "return";
export type PageStatus = "draft" | "published" | "deleted_on_shopify";

export interface TokushohoFormData {
  // Step 1: Business Info
  businessName: string;
  representativeName: string;
  postalCode: string;
  address: string;
  phone: string;
  email: string;
  businessType: BusinessType;
  addressDisclosure: AddressDisclosure;

  // Step 2: Sales Conditions - Payment
  sellingPrice: string;
  additionalFees: string;
  paymentMethods: string[];
  paymentTiming: string;

  // Step 2: Sales Conditions - Delivery
  deliveryTime: string;
  deliveryNotes: string;

  // Step 2: Sales Conditions - Returns
  returnPolicy: string;
  returnDeadline: string;
  returnShippingCost: string;
  defectiveItemPolicy: string;

  // Optional
  quantityLimit: string;
}

export interface WizardState {
  currentStep: number;
  formData: Partial<TokushohoFormData>;
  isDirty: boolean;
}

export const PAYMENT_METHODS = [
  { value: "credit_card", label: "クレジットカード" },
  { value: "bank_transfer", label: "銀行振込" },
  { value: "convenience_store", label: "コンビニ決済" },
  { value: "cash_on_delivery", label: "代金引換" },
  { value: "deferred_payment", label: "後払い決済" },
  { value: "paypay", label: "PayPay" },
  { value: "amazon_pay", label: "Amazon Pay" },
  { value: "rakuten_pay", label: "楽天ペイ" },
  { value: "apple_pay", label: "Apple Pay" },
  { value: "google_pay", label: "Google Pay" },
] as const;

export const TEMPLATE_TEXTS = {
  sellingPrice: "各商品ページに記載の価格（税込）",
  additionalFees: "送料：全国一律○○円（税込○○円以上ご購入で送料無料）\n消費税：商品価格に含む",
  paymentTiming: {
    credit_card: "クレジットカード：ご注文時にカード会社の規定に基づきご請求",
    bank_transfer: "銀行振込：ご注文後7日以内にお振込み（前払い）",
    convenience_store: "コンビニ決済：ご注文後7日以内にお支払い（前払い）",
    cash_on_delivery: "代金引換：商品お届け時にお支払い",
    deferred_payment: "後払い決済：商品到着後、請求書記載の期日までにお支払い",
    paypay: "PayPay：ご注文時に即時決済",
    amazon_pay: "Amazon Pay：ご注文時に即時決済",
    rakuten_pay: "楽天ペイ：ご注文時に即時決済",
    apple_pay: "Apple Pay：ご注文時に即時決済",
    google_pay: "Google Pay：ご注文時に即時決済",
  },
  deliveryTime: "ご注文確認後、3〜5営業日以内に発送いたします。",
  returnPolicy: "商品到着後7日以内に、未使用・未開封の場合に限りお受けいたします。\nお客様のご都合による返品の場合、返送料はお客様のご負担となります。",
  returnDeadline: "商品到着後7日以内",
  returnShippingCost: {
    customer: "お客様負担",
    seller: "当店負担",
    defect_seller: "不良品の場合は当店負担、お客様都合の場合はお客様負担",
  },
  defectiveItemPolicy: "商品の不良・破損・誤送の場合は、商品到着後7日以内にご連絡ください。\n送料当店負担にて交換または返金いたします。",
} as const;
