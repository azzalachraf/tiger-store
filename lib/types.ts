export type Locale = "ar" | "en" | "fr";

export type DisplayCurrency = "DZD" | "USD";

export type LocalizedText = {
  ar: string;
  en: string;
};

export type Currency = "DZD";

export type ProductCategory = string;

export type ProductPriceOption = {
  id: string;
  label: string;
  labelAr: string;
  price: number;
  oldPrice?: number;
  duration: string;
  durationAr: string;
  available?: boolean;
  compatibilityAr?: string;
  compatibilityEn?: string;
};

export type ProductDetails = {
  activationTimeAr: string;
  activationTimeEn: string;
  activationMethodAr?: string;
  activationMethodEn?: string;
  warrantyAr?: string;
  warrantyEn?: string;
  accountTypeAr?: string;
  accountTypeEn?: string;
  creditsAr?: string;
  creditsEn?: string;
  storageAr?: string;
  storageEn?: string;
  compatibilityAr?: string;
  compatibilityEn?: string;
  noticeAr?: string;
  noticeEn?: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  nameAr: string;
  category: ProductCategory;
  categoryAr: string;
  price: number;
  oldPrice?: number;
  currency: Currency;
  duration: string;
  durationAr: string;
  shortDescriptionAr: string;
  shortDescriptionEn: string;
  featuresAr: string[];
  featuresEn: string[];
  activationTypeAr: string;
  activationTypeEn: string;
  image: string;
  available: boolean;
  featured: boolean;
  priceOptions?: ProductPriceOption[];
  details?: ProductDetails;
  faqs?: { questionAr: string; questionEn: string; answerAr: string; answerEn: string }[];
};

export type Category = {
  id: string;
  name: LocalizedText;
};

export type PaymentMethod = {
  id: string;
  name: string;
  description: LocalizedText;
};

export type CartItem = {
  id: string;
  productId: string;
  slug: string;
  name: string;
  nameAr: string;
  image: string;
  option: string;
  optionId: string;
  optionAr: string;
  duration: string;
  durationAr: string;
  price: number;
  quantity: number;
};

/** Payment methods available for new orders. */
export type PaymentMethodId = "BaridiMob" | "Binance" | "RedotPay" | "Flexy";

/** CCP remains parseable solely for historic orders created before the payment update. */
export type StoredPaymentMethodId = PaymentMethodId | "CCP";

export type LocalOrder = {
  id: string;
  createdAt: string;
  items: CartItem[];
  total: number;
  paymentMethod: PaymentMethodId;
  customer: {
    name: string;
    phone: string;
    email: string;
    notes?: string;
  };
  status: "submitted";
  source: "localStorage";
};

export type AdminOrderStatus = "pending" | "paid" | "delivered" | "cancelled" | "refunded";

export type AdminOrder = {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  products: CartItem[];
  paymentMethod: StoredPaymentMethodId;
  total: number;
  notes?: string;
  status: AdminOrderStatus;
  createdAt: string;
  adminNotes?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  referrer?: string;
  receiptPath?: string;
  receiptUploadedAt?: string;
};

export type AdminAccountStatus = "Available" | "Sold" | "Expired" | "Problem";

export type AdminAccount = {
  id: string;
  email: string;
  emailPassword: string;
  chatgptPassword: string;
  dateCreated: string;
  price: number;
  notes?: string;
  status: AdminAccountStatus;
  updatedAt: string;
};

export type SiteSettings = {
  whatsappNumber: string;
  instagramUrl: string;
  facebookUrl: string;
  domainText: string;
  baridiMobRip: string;
  ccpDetails: string;
  redotPayDetails: string;
  promoHeadings: string[];
  footerDisclaimer: string;
};

/* ------------------------------------------------------------------ */
/*  Analytics & Marketing Types                                       */
/* ------------------------------------------------------------------ */

export type AnalyticsDateRange =
  | "today"
  | "7d"
  | "30d"
  | "90d"
  | "year"
  | "all";

export type MarketingConfig = {
  id: string;
  meta_pixel_id: string;
  meta_pixel_enabled: boolean;
  meta_capi_token: string;
  meta_capi_enabled: boolean;
  updated_at: string;
};

export type PageEvent = {
  id: string;
  event_type: string;
  page_url: string;
  product_id?: string;
  session_id?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
  created_at: string;
};

export type CustomerProfile = {
  email: string;
  name: string;
  totalSpent: number;
  orderCount: number;
  firstOrder: string;
  lastOrder: string;
  averageOrderValue: number;
  isReturning: boolean;
};

/* ------------------------------------------------------------------ */
/*  Private operations foundation                                     */
/* ------------------------------------------------------------------ */

export type TelegramRole = "pending" | "admin" | "owner";
export type TelegramInterfaceLocale = "ar" | "en";

export type TelegramOperator = {
  telegramUserId: string;
  username?: string;
  firstName?: string;
  interfaceLocale: TelegramInterfaceLocale;
  role: TelegramRole;
  registrationId: string;
  approvedByTelegramUserId?: string;
  approvedAt?: string;
  lastSeenAt: string;
  createdAt: string;
};

export type OperationEntityType = "telegram_user" | "order" | "warranty" | "inventory" | "payment" | "commission" | "adjustment" | "advertising_spend" | "setting";

export type WarrantyCertificateStatus = "active" | "claimed" | "replaced" | "refunded" | "cancelled" | "expired";

export type PaymentRecordStatus = "pending" | "verified" | "rejected" | "refunded";
export type CommissionStatus = "pending" | "approved" | "paid" | "void";

export type SnapchatOperationStatus = "active" | "completed" | "cancelled";
export type SnapchatPlanMonths = 1 | 2 | 3 | 6 | 12;
export type SnapchatRedeemCardType = "try_24" | "try_48" | "inr_100" | "try_115" | "try_229" | "inr_199" | "inr_298";

export type FunnelStep = {
  label: string;
  count: number;
  percentage: number;
  dropOff: number;
};
