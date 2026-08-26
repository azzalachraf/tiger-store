export { default } from "@/app/privacy-policy/page";

import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Privacy",
  description: "Tiger Store privacy information for customer order details.",
  path: "/privacy-policy",
  robots: { index: false, follow: true },
});
