import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MetaPixelProvider } from "@/components/MetaPixelProvider";
import { PageTracker } from "@/components/PageTracker";
import "./globals.css";

const description =
  "Tiger Store يوفر اشتراكات مثل ChatGPT Plus, Gemini Pro, Canva Pro, CapCut Pro, Adobe Creative Cloud والمزيد.";

export const metadata: Metadata = {
  metadataBase: new URL("https://digitaldz.shop"),
  title: {
    default: "Home - Tiger Store",
    template: "%s - Tiger Store",
  },
  description,
  keywords: [
    "اشتراكات",
    "Tiger Store",
    "ChatGPT Plus",
    "Canva Pro",
    "CapCut Pro",
    "Adobe Creative Cloud",
    "Gemini Pro",
    "digitaldz.shop",
  ],
  alternates: {
    canonical: "https://digitaldz.shop",
  },
  icons: {
    icon: [{ url: "/icon.png", sizes: "512x512", type: "image/png" }],
    shortcut: "/icon.png",
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Home - Tiger Store",
    description,
    url: "https://digitaldz.shop",
    siteName: "Tiger Store",
    images: [
      {
        url: "/logo/tiger-store-brand.png",
        width: 640,
        height: 640,
        alt: "Tiger Store logo",
      },
      {
        url: "/products/12_ChatGPT_Plus.webp",
        width: 720,
        height: 540,
        alt: "Tiger Store digital subscription preview",
      },
    ],
    locale: "ar_DZ",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Home - Tiger Store",
    description,
    images: ["/products/12_ChatGPT_Plus.webp"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ar-DZ" dir="rtl" className="dark">
      <body>
        {children}
        <MetaPixelProvider />
        <PageTracker />
      </body>
    </html>
  );
}
