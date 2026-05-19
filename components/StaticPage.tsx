"use client";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/useLocale";

type StaticSection = {
  title: string;
  body?: string;
  items?: string[];
};

type StaticPageContent = {
  eyebrow: string;
  title: string;
  description: string;
  sections: StaticSection[];
};

type StaticPageProps = {
  ar: StaticPageContent;
  en: StaticPageContent;
};

export function StaticPage({ ar, en }: StaticPageProps) {
  const { locale, toggleLocale } = useLocale();
  const content = locale === "ar" ? ar : en;

  return (
    <>
      <Header />
      <main className="store-shell min-h-screen px-3 py-8 sm:px-5 sm:py-10 lg:px-8" dir={locale === "ar" ? "rtl" : "ltr"}>
        <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="font-bold text-tiger-gold">{content.eyebrow}</p>
            <h1 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">{content.title}</h1>
            <p className="mt-3 max-w-3xl leading-8 text-white/65">{content.description}</p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={toggleLocale}>
            {locale === "ar" ? "EN" : "AR"}
          </Button>
        </div>

        <div className="grid gap-4">
          {content.sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-white/10 bg-white/[0.045] p-5 shadow-card">
              <h2 className="text-xl font-extrabold text-white">{section.title}</h2>
              {section.body ? <p className="mt-3 leading-8 text-white/65">{section.body}</p> : null}
              {section.items?.length ? (
                <ul className="mt-3 grid gap-2 leading-8 text-white/65">
                  {section.items.map((item) => (
                    <li key={item} className="rounded-xl border border-white/10 bg-black/30 px-4 py-2">
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
