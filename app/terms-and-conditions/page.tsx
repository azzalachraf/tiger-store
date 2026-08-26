import { StaticPage } from "@/components/StaticPage";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Terms and Conditions",
  description: "Read Tiger Store’s terms for digital subscription ordering, payment review, and activation.",
  path: "/terms-and-conditions",
});

export default function TermsPage() {
  return (
    <StaticPage
      ar={{
        eyebrow: "Terms",
        title: "Terms and Conditions",
        description: "Using the site means accepting the ordering, payment, and activation process shown.",
        sections: [
          { title: "Ordering", body: "Orders are created from the cart and confirmed after checkout." },
          { title: "Pricing", body: "Prices and availability may change depending on current offers." },
          { title: "Independence", body: "Tiger Store is independent and not officially affiliated with the listed brands." },
        ],
      }}
      en={{
        eyebrow: "Terms",
        title: "Terms and Conditions",
        description: "Using the site means accepting the ordering, payment, and activation process shown.",
        sections: [
          { title: "Ordering", body: "Orders are created from the cart and confirmed after checkout." },
          { title: "Pricing", body: "Prices and availability may change depending on current offers." },
          { title: "Independence", body: "Tiger Store is independent and not officially affiliated with the listed brands." },
        ],
      }}
    />
  );
}
