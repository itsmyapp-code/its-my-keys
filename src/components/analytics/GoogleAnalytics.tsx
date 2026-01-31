"use client";

import Script from "next/script";
import { useCookieConsent } from "@/contexts/CookieConsentContext";

export function GoogleAnalytics({ gaId }: { gaId: string }) {
    const { consent } = useCookieConsent();

    // Only load if consent is explicitly granted because "Accept" was clicked
    if (consent !== "granted") return null;

    if (!gaId) return null;

    return (
        <>
            <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
                strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
                {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', '${gaId}');
        `}
            </Script>
        </>
    );
}
