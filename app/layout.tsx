import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MetaPixelProvider } from "@/components/MetaPixelProvider";
import { PageTracker } from "@/components/PageTracker";
import { PerformanceProvider } from "@/components/PerformanceProvider";
import { ThemeBootstrap } from "@/components/ThemeBootstrap";
import "./globals.css";

const description =
  "Tiger Store يوفر اشتراكات رقمية في الجزائر مثل ChatGPT Plus و Gemini Pro و Canva Pro و CapCut Pro و Adobe Creative Cloud والمزيد.";

export const metadata: Metadata = {
  metadataBase: new URL("https://tiger-storedz.com"),
  title: {
    default: "Tiger Store - اشتراكات رقمية في الجزائر",
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
    "tiger-storedz.com",
  ],
  alternates: {
    canonical: "https://tiger-storedz.com",
  },
  icons: {
    icon: [{ url: "/icon.png", sizes: "512x512", type: "image/png" }],
    shortcut: "/icon.png",
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Tiger Store - اشتراكات رقمية في الجزائر",
    description,
    url: "https://tiger-storedz.com",
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
    title: "Tiger Store - اشتراكات رقمية في الجزائر",
    description,
    images: ["/products/12_ChatGPT_Plus.webp"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" dir="ltr" data-performance-tier="standard" data-motion="enhanced" suppressHydrationWarning>
      <head><ThemeBootstrap /></head>
      <body>
        <PerformanceProvider>
          {children}
          <MetaPixelProvider />
          <PageTracker />
        </PerformanceProvider>
      </body>
    </html>
  );
}
