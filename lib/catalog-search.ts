import type { Product } from "@/lib/types";

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().trim();
}

const aliases: Record<string, string[]> = {
  "snapchat-plus": ["snap", "snab", "snapchat", "snapchat+", "سناب", "سنابشات"],
  "gemini-pro": ["gemini", "gimini", "gemni", "jiminy", "جيميني", "جيمناي"],
  "chatgpt-plus": ["gpt", "chat gpt", "chatgpt", "شات جي بي تي"],
  "capcut-pro": ["capcut", "cap cut", "كاب كات", "كابكات"],
  "canva-pro": ["canva", "كانفا"],
};

function distance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const saved = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = saved;
    }
  }
  return row[b.length];
}

export function findCatalogProducts(products: Product[], query: string) {
  const needle = normalized(query);
  if (!needle) return products;

  return products.filter((product) => [...[product.name, product.nameAr, product.slug, product.category, product.categoryAr], ...(aliases[product.slug] ?? [])]
    .map(normalized)
    .some((value) => value.startsWith(needle) || value.includes(` ${needle}`) || value.split(/[\s-]+/).some((word) => word.startsWith(needle) || (needle.length >= 4 && distance(word, needle) <= (needle.length >= 7 ? 2 : 1)))));
}
