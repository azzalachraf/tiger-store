import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MetaPixelProvider } from "@/components/MetaPixelProvider";
import { PageTracker } from "@/components/PageTracker";
import "./globals.css";

const description =
  "Tiger Store يوفر اشتراكات رقمية في الجزائر مثل ChatGPT Plus, Gemini Pro, Canva Pro, CapCut Pro, Adobe Creative Cloud والمزيد.";

export const metadata: Metadata = {
  metadataBase: new URL("https://digitaldz.shop"),
  title: {
    default: "Home - Tiger Store",
    template: "%s - Tiger Store",
  },
  description,
  keywords: [
    "اشتراكات رقمية الجزائر",
    "Tiger Store",
    "ChatGPT Plus Algeria",
    "Canva Pro Algeria",
    "CapCut Pro Algeria",
    "Adobe Creative Cloud Algeria",
    "Gemini Pro Algeria",
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
        url: "/logo/tiger-store.webp",
        width: 240,
        height: 240,
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

