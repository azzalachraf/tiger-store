import { StaticPage } from "@/components/StaticPage";

export const metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <StaticPage
      ar={{
        eyebrow: "About",
        title: "Tiger Store للاشتراكات الرقمية",
        description: "Tiger Store متجر مستقل للاشتراكات الرقمية في الجزائر، مع تجربة شراء بسيطة وواضحة.",
        sections: [
          { title: "ماذا نوفر؟", body: "Digital subscriptions for AI, design, architecture, education, video editing, and security." },
          { title: "طريقة الطلب", items: ["Choose a product.", "Add it to cart.", "Choose a payment method.", "Confirm order and activation."] },
          { title: "تنبيه", body: "Tiger Store is independent and not officially affiliated with the listed brands." },
        ],
      }}
      en={{
        eyebrow: "About",
        title: "Tiger Store Digital Subscriptions",
        description: "Tiger Store is an independent digital subscription marketplace for customers in Algeria.",
        sections: [
          { title: "What we offer", body: "Digital subscriptions across AI, design, architecture, education, video editing, and security." },
          { title: "How it works", items: ["Choose a product.", "Add it to cart.", "Choose a payment method.", "Confirm payment and activation."] },
          { title: "Disclaimer", body: "Tiger Store is independent and not officially affiliated with the listed brands." },
        ],
      }}
    />
  );
}
