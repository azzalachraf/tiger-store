export { default } from "@/app/shop/page";

import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Products",
  description: "Browse Tiger Store products from the primary shop catalog.",
  path: "/shop",
  robots: { index: false, follow: true },
});
