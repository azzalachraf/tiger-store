import { StaticPage } from "@/components/StaticPage";
import { createPageMetadata, serializeJsonLd } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Frequently Asked Questions",
  description: "Find clear answers about Tiger Store ordering, payment methods, activation, and customer support.",
  path: "/faq",
});

const faqSections = [
  {
    title: "How do I receive the subscription?",
    body: "After your order and payment are confirmed, activation details are prepared according to the selected product and plan.",
  },
  {
    title: "How long does activation take?",
    body: "Activation is usually fast, but timing can vary depending on product availability and the selected subscription.",
  },
  {
    title: "Is there a guarantee?",
    body: "Yes. Tiger Store provides after-sale support and helps resolve activation problems when they occur.",
  },
  {
    title: "What should I do after payment?",
    body: "Keep your payment proof and make sure your information is correct, especially the activation email.",
  },
  {
    title: "Do I need an account?",
    body: "No customer account is required. You can choose a product and complete the order directly.",
  },
  {
    title: "Is payment secure?",
    body: "Tiger Store supports BaridiMob, Binance, and RedotPay. The correct details are shown during checkout.",
  },
];

const faqJsonLd = serializeJsonLd({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqSections.map((section) => ({
    "@type": "Question",
    name: section.title,
    acceptedAnswer: { "@type": "Answer", text: section.body },
  })),
});

export default function FaqPage() {
  return (
    <>
      <StaticPage
      ar={{
        eyebrow: "الأسئلة الشائعة",
        title: "الأسئلة الشائعة",
        description: "إجابات مختصرة وواضحة حول الطلب، الدفع، التفعيل، والدعم.",
        sections: [
          {
            title: "كيف أستلم الاشتراك؟",
            body: "بعد تأكيد الطلب والدفع، يتم تجهيز تفاصيل التفعيل حسب نوع المنتج والخطة المختارة.",
          },
          {
            title: "كم يستغرق التفعيل؟",
            body: "غالبا يكون التفعيل سريعا، وقد يختلف الوقت حسب توفر المنتج ونوع الاشتراك.",
          },
          {
            title: "هل يوجد ضمان؟",
            body: "نعم، نوفر دعما بعد البيع ومساعدة في حال حدوث مشكلة في التفعيل.",
          },
          {
            title: "ماذا أفعل بعد الدفع؟",
            body: "احتفظ بإثبات الدفع وتأكد من صحة معلوماتك، خاصة البريد الإلكتروني المخصص للتفعيل.",
          },
          {
            title: "هل أحتاج إلى حساب؟",
            body: "لا تحتاج إلى حساب عميل في الموقع. يمكنك اختيار المنتج وإكمال الطلب مباشرة.",
          },
          {
            title: "هل الدفع آمن؟",
            body: "طرق الدفع المعتمدة في المتجر هي BaridiMob وBinance وRedotPay مع عرض التفاصيل المناسبة أثناء إتمام الطلب.",
          },
        ],
      }}
      en={{
        eyebrow: "FAQ",
        title: "Frequently Asked Questions",
        description: "Clear answers about ordering, payment, activation, and support.",
        sections: faqSections,
      }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd }} />
    </>
  );
}
