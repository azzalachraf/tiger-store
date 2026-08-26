import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { Noto_Sans_Arabic } from "next/font/google";
import { LocaleProvider } from "@/components/LocaleProvider";
import { MetaPixelProvider } from "@/components/MetaPixelProvider";
import { PageTracker } from "@/components/PageTracker";
import { PerformanceProvider } from "@/components/PerformanceProvider";
import { ThemeBootstrap } from "@/components/ThemeBootstrap";
import { DEFAULT_OG_IMAGE, SITE_URL } from "@/lib/seo";
import "./globals.css";

const arabic = Noto_Sans_Arabic({ subsets: ["arabic"], display: "swap", variable: "--font-arabic" });
const description = "اشتراكات رقمية للعملاء في الجزائر مع طلب ضيف واضح وطرق دفع محلية.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Tiger Store | اشتراكات رقمية في الجزائر",
    template: "%s - Tiger Store",
  },
  description,
  icons: {
    icon: [{ url: "/icon.png", sizes: "512x512", type: "image/png" }],
    shortcut: "/icon.png",
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Tiger Store | اشتراكات رقمية في الجزائر",
    description,
    url: "/",
    siteName: "Tiger Store",
    images: [{ url: DEFAULT_OG_IMAGE, alt: "اشتراكات Tiger Store الرقمية" }],
    locale: "ar_DZ",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tiger Store | اشتراكات رقمية في الجزائر",
    description,
    images: [DEFAULT_OG_IMAGE],
  },
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const savedLocale = (await cookies()).get("tiger-store-locale")?.value;
  const locale = savedLocale === "en" || savedLocale === "fr" ? savedLocale : "ar";
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} data-performance-tier="standard" data-motion="enhanced" suppressHydrationWarning>
      <head><ThemeBootstrap /></head>
      <body className={arabic.variable}>
        <LocaleProvider locale={locale}>
        <PerformanceProvider>
          {children}
          <MetaPixelProvider />
          <PageTracker />
        </PerformanceProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
