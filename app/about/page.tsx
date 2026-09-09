import { StaticPage } from "@/components/StaticPage";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "About Tiger Store",
  description: "Learn how Tiger Store helps customers in Algeria order digital subscriptions through a clear guest checkout flow.",
  path: "/about",
});

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
      fr={{
        eyebrow: "À propos",
        title: "Tiger Store — abonnements numériques",
        description: "Tiger Store est une boutique indépendante d’abonnements numériques destinée aux clients en Algérie.",
        sections: [
          { title: "Notre offre", body: "Des abonnements numériques pour l’IA, le design, l’architecture, l’apprentissage, le montage vidéo et les logiciels." },
          { title: "Comment commander", items: ["Choisissez un produit.", "Sélectionnez une offre.", "Choisissez un mode de paiement.", "Ajoutez le justificatif et confirmez la commande."] },
          { title: "Indépendance", body: "Tiger Store est une boutique indépendante et n’est pas officiellement affiliée aux marques présentées." },
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
