export { default } from "@/app/terms-and-conditions/page";

import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Terms",
  description: "Tiger Store terms and conditions information.",
  path: "/terms-and-conditions",
  robots: { index: false, follow: true },
});
