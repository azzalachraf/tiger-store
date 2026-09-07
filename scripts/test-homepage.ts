import assert from "node:assert/strict";
import { products } from "../data/products";
import { homeProduct } from "../components/home/products";
import { homeCopy } from "../components/home/copy";
import type { Locale, Product } from "../lib/types";

const snapchat = products.find((product) => product.slug === "snapchat-plus")!;
const original = JSON.stringify(products);
const locales: Locale[] = ["ar", "fr", "en"];
for (const locale of locales) {
  const cards = products.map((product) => homeProduct(product, locale));
  assert.equal(cards.length, products.length, "Never drop products");
  assert.ok(cards.every((card) => card.href === `/products/${card.slug}`));
  assert.ok(cards.every((card) => card.name && card.category && card.duration));
  assert.ok(cards.every((card) => !/NaN|Infinity|undefined/.test(card.price)));
  assert.equal(homeProduct(snapchat, locale).price, "600 DA – 2,300 DA");
  assert.equal(homeProduct({ ...snapchat, available: false }, locale).available, false);
  assert.deepEqual(Object.keys(homeCopy[locale]), Object.keys(homeCopy.ar));
  assert.equal(homeCopy[locale].steps.length, 3);
  assert.equal(homeCopy[locale].questions.length, 5);
}
assert.equal(homeProduct(snapchat, "fr").duration, "1 mois – 12 mois");
assert.equal(homeProduct(snapchat, "ar").duration, "شهر واحد – 12 شهراً");
assert.equal(homeProduct(snapchat, "en").duration, "1 month – 12 months");

const unavailableOffers: Product = {
  ...snapchat,
  priceOptions: snapchat.priceOptions!.map((offer) => ({ ...offer, available: false })),
};
assert.equal(homeProduct(unavailableOffers, "en").available, false);
assert.equal(homeProduct(unavailableOffers, "en").price, "600 DA – 2,300 DA");
const singleOffer = {
  ...snapchat,
  priceOptions: snapchat.priceOptions!.map((offer, index) => ({ ...offer, available: index === 1 })),
};
assert.equal(homeProduct(singleOffer, "en").price, "1,600 DA");
assert.equal(homeProduct(singleOffer, "fr").duration, "3 mois");
assert.equal(homeProduct({ ...snapchat, priceOptions: [], price: 0 }, "en").available, false);
assert.equal(homeProduct({ ...snapchat, priceOptions: [], price: 0 }, "en").price, "—");
assert.equal(homeProduct({ ...snapchat, priceOptions: [], duration: "2 months" }, "ar").duration, "شهران");
assert.equal(homeProduct({ ...snapchat, priceOptions: [], duration: "3 years" }, "fr").duration, "3 ans");
assert.equal(JSON.stringify(products), original, "Homepage must not mutate product data");
console.log(`Homepage checks passed: ${products.length} products, 3 locales, availability, ranges, translations and immutable data.`);
