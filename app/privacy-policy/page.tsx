import { StaticPage } from "@/components/StaticPage";

export const metadata = {
  title: "Privacy",
};

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
