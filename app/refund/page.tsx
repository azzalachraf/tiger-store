export { default } from "@/app/refund-policy/page";

import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Refund Policy",
  description: "Tiger Store refund and support policy information.",
  path: "/refund-policy",
  robots: { index: false, follow: true },
});
