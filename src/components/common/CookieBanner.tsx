"use client";

import React from "react";
import { useCookieConsent } from "@/contexts/CookieConsentContext";
import Link from "next/link";

export function CookieBanner() {
    const { consent, acceptAll, rejectNonEssential } = useCookieConsent();

    // If consent is already determined, don't show banner
    if (consent !== null) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] border-t border-gray-200 dark:bg-gray-900 dark:border-gray-800">
            <div className="mx-auto max-w-7xl flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex-1 text-sm text-gray-600 dark:text-gray-300">
                    <p>
                        We use cookies to enhance your experience, analyze site traffic, and serve tailored content.
                        By managing your preferences, you control how your data is used.
                        Read our <Link href="/privacy-policy" className="underline hover:text-blue-600">Privacy Policy</Link> and <Link href="/terms" className="underline hover:text-blue-600">Terms of Service</Link>.
                    </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <button
                        onClick={rejectNonEssential}
                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
                    >
                        Reject Non-Essential
                    </button>
                    <button
                        onClick={acceptAll}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:ring-offset-gray-900"
                    >
                        Accept All
                    </button>
                </div>
            </div>
        </div>
    );
}
