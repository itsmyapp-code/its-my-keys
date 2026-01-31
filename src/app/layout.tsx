import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google"; // Keep generic fonts for now or switch to premium later
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Its My Keys",
  description: "Asset and Key Tracking System",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

import { AppLayout } from "@/components/layout/AppLayout";
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";
import { CookieBanner } from "@/components/common/CookieBanner";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <CookieConsentProvider>
            <AppLayout>
              {children}
            </AppLayout>
            <CookieBanner />
            {/* Example usage - only loads if consent granted. Replace empty string with real ID when available */}
            <GoogleAnalytics gaId="" />
          </CookieConsentProvider>
        </Providers>
      </body>
    </html>
  );
}
