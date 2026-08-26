import { StaticPage } from "@/components/StaticPage";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Privacy Policy",
  description: "Read how Tiger Store uses the details needed to review orders, prepare activation, and provide support.",
  path: "/privacy-policy",
});

export default function PrivacyPolicyPage() {
  return (
    <StaticPage
      ar={{
        eyebrow: "Privacy",
        title: "Privacy Policy",
        description: "We request only the data needed to confirm orders and activate subscriptions.",
        sections: [
          { title: "Data", body: "Name, phone number, activation email, and optional order notes." },
          { title: "Use", body: "Data is used to confirm orders, prepare activation, and provide support." },
        ],
      }}
      en={{
        eyebrow: "Privacy",
        title: "Privacy Policy",
        description: "We request only the data needed to confirm orders and activate subscriptions.",
        sections: [
          { title: "Data", body: "Name, phone number, activation email, and optional order notes." },
          { title: "Use", body: "Data is used to confirm orders, prepare activation, and provide support." },
        ],
      }}
    />
  );
}
