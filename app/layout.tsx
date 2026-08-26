import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MetaPixelProvider } from "@/components/MetaPixelProvider";
import { PageTracker } from "@/components/PageTracker";
import { PerformanceProvider } from "@/components/PerformanceProvider";
import { ThemeBootstrap } from "@/components/ThemeBootstrap";
import { DEFAULT_OG_IMAGE, SITE_URL } from "@/lib/seo";
import "./globals.css";

const description =
  "Digital subscriptions for customers in Algeria, with clear guest checkout and local payment methods.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Tiger Store | Digital Subscriptions in Algeria",
    template: "%s - Tiger Store",
  },
  description,
  icons: {
    icon: [{ url: "/icon.png", sizes: "512x512", type: "image/png" }],
    shortcut: "/icon.png",
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Tiger Store | Digital Subscriptions in Algeria",
    description,
    url: "/",
    siteName: "Tiger Store",
    images: [{ url: DEFAULT_OG_IMAGE, alt: "Tiger Store digital subscriptions" }],
    locale: "ar_DZ",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tiger Store | Digital Subscriptions in Algeria",
    description,
    images: [DEFAULT_OG_IMAGE],
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
