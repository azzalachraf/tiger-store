"use client";

import Image from "next/image";
import Link from "next/link";
import { Category, Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/useLocale";

type CategoryShowcaseProps = {
  categories: Category[];
  products: Product[];
  className?: string;
};

const showcaseGroups = [
  {
    title: "AI Tools",
    titleAr: "أدوات الذكاء الاصطناعي",
    href: "/categories/ai",
    categoryIds: ["AI"],
    productSlugs: ["gemini-pro", "chatgpt-plus", "grok-ai", "claude-pro", "lovable-pro"],
  },
  {
    title: "Creative Studio",
    titleAr: "التصميم والمونتاج",
    href: "/categories/design",
    categoryIds: ["Design", "Video Editing"],
    productSlugs: ["adobe-creative-cloud", "canva-pro", "capcut-pro"],
  },
  {
    title: "Learning Hub",
    titleAr: "التعلم",
    href: "/categories/education",
    categoryIds: ["Education"],
    productSlugs: ["coursera", "duolingo-premium", "gemini-pro", "canva-pro"],
  },
  {
    title: "Social Media",
    titleAr: "التواصل الاجتماعي",
    href: "/categories/social-media",
    categoryIds: ["Social Media"],
    productSlugs: ["snap-plus"],
  },
  {
    title: "Premium Access",
    titleAr: "اشتراكات بريميوم",
    href: "/shop?featured=true",
    categoryIds: ["AI", "Design"],
    productSlugs: ["chatgpt-plus", "claude-pro", "adobe-creative-cloud"],
  },
  {
    title: "Professional Growth",
    titleAr: "أدوات احترافية",
    href: "/categories/architecture",
    categoryIds: ["Architecture", "Education"],
    productSlugs: ["autocad", "revit-2026", "duolingo-premium"],
  },
  {
    title: "Software & Apps",
    titleAr: "برامج وتطبيقات",
    href: "/categories/software",
    categoryIds: ["Software", "VPN", "Video Editing"],
    productSlugs: ["hma-vpn", "capcut-pro", "lovable-pro"],
  },
];
export function CategoryShowcase({ categories, products, className }: CategoryShowcaseProps) {
  const { locale: activeLocale } = useLocale();
  const availableCategories = new Set(categories.map((category) => category.id));
  const fallbackProducts = products.slice(0, 3);

  const groups = showcaseGroups
    .filter((group) => group.categoryIds.some((id) => availableCategories.has(id)))
    .map((group) => {
      const preferred = group.productSlugs
        .map((slug) => products.find((product) => product.slug === slug))
        .filter(Boolean) as Product[];
      const byCategory = products.filter((product) => group.categoryIds.includes(product.category));
      const merged = [...preferred, ...byCategory].filter(
        (product, index, list) => list.findIndex((entry) => entry.id === product.id) === index,
      );

      return {
        ...group,
        products: (merged.length ? merged : fallbackProducts).slice(0, 3),
      };
    });

  return (
    <section className={cn("mx-auto max-w-[1440px] px-3 py-6 sm:px-5 lg:px-8", className)}>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-tiger-gold">
            {activeLocale === "ar" ? "الأقسام" : "Categories"}
          </p>
          <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">
            {activeLocale === "ar" ? "ابدأ من نوع الاشتراك الذي تحتاجه" : activeLocale === "fr" ? "Parcourir les catégories" : "Browse categories"}
          </h2>
        </div>
        <Link href="/categories" className="shrink-0 text-sm font-black text-tiger-gold">
          {activeLocale === "ar" ? "عرض الكل" : activeLocale === "fr" ? "Voir tout" : "View all"}
        </Link>
      </div>

      <div className="scrollbar-none -mx-3 flex gap-4 overflow-x-auto border-y border-white/8 bg-[#181818] px-3 py-5 lg:mx-0 lg:grid lg:grid-cols-7 lg:overflow-visible lg:rounded-md lg:border lg:px-4">
        {groups.map((group) => (
          <Link
            key={group.title}
            href={group.href}
            className="motion-card group min-w-[150px] rounded-md border border-white/8 bg-[#111] p-3 text-center shadow-[0_14px_30px_rgba(0,0,0,0.28)] hover:border-tiger-ember/55 hover:bg-[#1d1d1d] lg:min-w-0"
          >
            <div className="relative mx-auto h-[112px] w-[116px]">
              <div className="absolute bottom-2 left-1/2 h-9 w-24 -translate-x-1/2 rounded-full bg-tiger-ember/20 blur-sm" />
              <div className="absolute bottom-0 left-1/2 h-8 w-24 -translate-x-1/2 rounded-2xl bg-[linear-gradient(135deg,#ff7a18,#f6c65b)] opacity-90" />
              {group.products.map((product, index) => (
                <div
                  key={product.id}
                  className={cn(
                    "absolute bottom-4 overflow-hidden rounded-xl border border-white/15 bg-black shadow-[0_14px_24px_rgba(0,0,0,0.45)] transition-transform duration-150",
                    index === 0 && "left-1/2 z-30 h-[92px] w-[74px] -translate-x-1/2 group-hover:scale-[1.04]",
                    index === 1 && "left-2 z-20 h-[78px] w-[62px] -rotate-[4deg] group-hover:-translate-x-1 group-hover:-rotate-[7deg]",
                    index === 2 && "right-2 z-10 h-[78px] w-[62px] rotate-[4deg] group-hover:translate-x-1 group-hover:rotate-[7deg]",
                  )}
                >
                  <Image src={product.image} alt={product.name} fill sizes="90px" className="object-contain p-0.5" />
                </div>
              ))}
            </div>
            <h3 className="mt-2 text-sm font-black leading-5 text-white">{activeLocale === "ar" ? group.titleAr : group.title}</h3>
          </Link>
        ))}
      </div>
    </section>
  );
}
