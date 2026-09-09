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
        eyebrow: "الشروط",
        title: "الشروط والأحكام",
        description: "استخدام الموقع يعني قبول طريقة الطلب والدفع والتفعيل الموضحة فيه.",
        sections: [
          { title: "الطلب", body: "يختار العميل المنتج والخطة، يرسل معلوماته ويرفع وصل الدفع لإتمام الطلب." },
          { title: "الأسعار", body: "الأسعار والتوفر المعروضان عند الطلب هما المعتمدان." },
          { title: "الاستقلالية", body: "Tiger Store متجر مستقل وغير تابع رسمياً للعلامات المذكورة." },
        ],
      }}
      fr={{
        eyebrow: "Conditions",
        title: "Conditions générales",
        description: "L’utilisation du site implique l’acceptation du processus de commande, de paiement et d’activation présenté.",
        sections: [
          { title: "Commande", body: "Le client choisit un produit et une offre, renseigne ses informations puis ajoute le justificatif de paiement." },
          { title: "Prix", body: "Les prix et la disponibilité affichés au moment de la commande font foi." },
          { title: "Indépendance", body: "Tiger Store est une boutique indépendante et n’est pas officiellement affiliée aux marques présentées." },
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
