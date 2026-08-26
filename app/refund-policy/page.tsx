import { StaticPage } from "@/components/StaticPage";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Refund and Support Policy",
  description: "Review Tiger Store’s approach to support and activation-related issues for digital subscription orders.",
  path: "/refund-policy",
});

const content = {
  eyebrow: "Refund",
  title: "Refund and Support Policy",
  description: "Digital products are handled based on activation status and order confirmation.",
  sections: [
    { title: "Before activation", body: "Orders can be reviewed before activation depending on their current status." },
    { title: "After activation", body: "After activation, support or replacement may be provided for confirmed activation issues." },
    { title: "Support cases", body: "Tiger Store will review activation-related issues and provide a suitable solution when possible." },
  ],
};

export default function RefundPolicyPage() {
  return (
    <StaticPage
      ar={{
        eyebrow: "سياسة الاسترجاع",
        title: "سياسة الاسترجاع والدعم",
        description: "تتم معالجة المنتجات الرقمية حسب حالة التفعيل وتأكيد الطلب.",
        sections: [
          { title: "قبل التفعيل", body: "يمكن مراجعة الطلب قبل التفعيل حسب حالته." },
          { title: "بعد التفعيل", body: "بعد التفعيل يتم توفير الدعم أو الاستبدال عند وجود مشكلة مؤكدة في التفعيل." },
          { title: "حالات الدعم", body: "يراجع Tiger Store مشاكل التفعيل ويوفر الحل المناسب عند الإمكان." },
        ],
      }}
      en={content}
    />
  );
}
