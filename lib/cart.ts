import { CartItem, Product, ProductPriceOption } from "@/lib/types";

export const CART_STORAGE_KEY = "tiger-store-cart";
export const ORDERS_STORAGE_KEY = "tiger-store-orders";

export function getProductOffers(product: Product): ProductPriceOption[] {
  if (product.priceOptions?.length) {
    return product.priceOptions;
  }

  return [
    {
      id: `${product.id}:default`,
      label: product.duration,
      labelAr: product.durationAr,
      price: product.price,
      oldPrice: product.oldPrice,
      duration: product.duration,
      durationAr: product.durationAr,
    },
  ];
}

export function getCartItemId(productId: string, optionId: string) {
  return `${productId}:${optionId}`;
}

export function createCartItem(product: Product, offer: ProductPriceOption, quantity = 1): CartItem {
  return {
    id: getCartItemId(product.id, offer.id),
    productId: product.id,
    slug: product.slug,
    name: product.name,
    nameAr: product.nameAr,
    image: product.image,
    option: offer.label,
    optionId: offer.id,
    optionAr: offer.labelAr,
    duration: offer.duration,
    durationAr: offer.durationAr,
    price: offer.price,
    quantity,
  };
}

export function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function writeCart(items: CartItem[]) {
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("tiger-store-cart-updated"));
}

export function addCartItem(item: CartItem) {
  const current = readCart();
  const existing = current.find((entry) => entry.id === item.id);

  const next = existing
    ? current.map((entry) =>
        entry.id === item.id ? { ...entry, quantity: entry.quantity + item.quantity } : entry,
      )
    : [...current, item];

  writeCart(next);
  return next;
}

export function getCartSubtotal(items: CartItem[]) {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
}
