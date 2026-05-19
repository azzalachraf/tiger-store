export type Locale = "ar" | "en";

export type DisplayCurrency = "DZD" | "USD";

export type LocalizedText = {
  ar: string;
  en: string;
};

export type Currency = "DZD";

export type ProductCategory =
  | "AI"
  | "Architecture"
  | "VPN"
  | "Video Editing"
  | "Design"
  | "Education"
  | "Software";

export type ProductPriceOption = {
  label: string;
  labelAr: string;
  price: number;
  oldPrice?: number;
  duration: string;
  durationAr: string;
  available?: boolean;
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
  optionAr: string;
  duration: string;
  durationAr: string;
  price: number;
  quantity: number;
};

export type PaymentMethodId = "BaridiMob" | "CCP" | "RedotPay";

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

export type AdminOrderStatus = "pending" | "paid" | "delivered" | "cancelled";

export type AdminOrder = {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  products: CartItem[];
  paymentMethod: PaymentMethodId;
  total: number;
  notes?: string;
  status: AdminOrderStatus;
  createdAt: string;
  adminNotes?: string;
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
