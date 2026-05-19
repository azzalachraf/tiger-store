import "server-only";

import { promises as fs } from "fs";
import path from "path";
import { products as seedProducts } from "@/data/products";
import { AdminOrder, Product, SiteSettings } from "@/lib/types";

type AdminStore = {
  products: Product[];
  orders: AdminOrder[];
  settings: SiteSettings;
};

const storePath = path.join(process.cwd(), "data", "admin-store.json");

const defaultSettings: SiteSettings = {
  whatsappNumber: "+213 556 97 45 93",
  instagramUrl: "https://www.instagram.com/tigerr_store_dz/",
  facebookUrl: "https://www.facebook.com/people/Tiger-Store/61589903873726/",
  domainText: "digitaldz.shop",
  baridiMobRip: "00799999004414930471",
  ccpDetails: "Payment details will be confirmed after order submission.",
  redotPayDetails: "Payment details will be confirmed after order submission.",
  promoHeadings: [
    "كل ما تحتاجه من اشتراكات رقمية في مكان واحد",
    "أفضل الأسعار في السوق بطرق دفع مختلفة",
    "خدمة سريعة واستجابة فورية ودعم بعد البيع",
    "تابعنا على حساباتنا الرسمية في منصات التواصل الاجتماعي",
  ],
  footerDisclaimer:
    "Tiger Store is an independent digital subscription provider and is not officially affiliated with the brands listed.",
};

const defaultStore: AdminStore = {
  products: seedProducts,
  orders: [],
  settings: defaultSettings,
};

export async function readAdminStore(): Promise<AdminStore> {
  try {
    const raw = await fs.readFile(storePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<AdminStore>;
    return {
      products: parsed.products?.length ? parsed.products : defaultStore.products,
      orders: parsed.orders ?? [],
      settings: { ...defaultSettings, ...parsed.settings },
    };
  } catch {
    await writeAdminStore(defaultStore);
    return defaultStore;
  }
}

export async function writeAdminStore(store: AdminStore) {
  await fs.mkdir(path.dirname(storePath), { recursive: true });
  await fs.writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
}

export async function getProducts() {
  return (await readAdminStore()).products;
}

export async function getProductById(id: string) {
  return (await getProducts()).find((product) => product.id === id);
}

export async function getProductBySlug(slug: string) {
  return (await getProducts()).find((product) => product.slug === slug);
}

export async function saveProduct(product: Product) {
  const store = await readAdminStore();
  const exists = store.products.some((item) => item.id === product.id);
  store.products = exists
    ? store.products.map((item) => (item.id === product.id ? product : item))
    : [product, ...store.products];
  await writeAdminStore(store);
}

export async function deleteProduct(id: string) {
  const store = await readAdminStore();
  store.products = store.products.filter((product) => product.id !== id);
  await writeAdminStore(store);
}

export async function getOrders() {
  return (await readAdminStore()).orders;
}

export async function saveOrder(order: AdminOrder) {
  const store = await readAdminStore();
  const exists = store.orders.some((item) => item.id === order.id);
  store.orders = exists
    ? store.orders.map((item) => (item.id === order.id ? order : item))
    : [order, ...store.orders];
  await writeAdminStore(store);
}

export async function getSettings() {
  return (await readAdminStore()).settings;
}

export async function saveSettings(settings: SiteSettings) {
  const store = await readAdminStore();
  store.settings = settings;
  await writeAdminStore(store);
}
