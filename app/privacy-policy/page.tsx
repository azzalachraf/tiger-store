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
        eyebrow: "الخصوصية",
        title: "سياسة الخصوصية",
        description: "نطلب فقط البيانات اللازمة لتأكيد الطلب وتفعيل الاشتراك.",
        sections: [
          { title: "البيانات", body: "الاسم، رقم الهاتف، معلومات التفعيل، وصل الدفع وملاحظات الطلب إن وجدت." },
          { title: "الاستخدام", body: "نستخدم البيانات لتأكيد الطلب، تجهيز التفعيل وتقديم الدعم." },
        ],
      }}
      fr={{
        eyebrow: "Confidentialité",
        title: "Politique de confidentialité",
        description: "Nous demandons uniquement les données nécessaires à la confirmation de la commande et à l’activation.",
        sections: [
          { title: "Données", body: "Nom, numéro de téléphone, informations d’activation, justificatif de paiement et notes éventuelles." },
          { title: "Utilisation", body: "Ces données servent à confirmer la commande, préparer l’activation et assurer l’assistance." },
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
