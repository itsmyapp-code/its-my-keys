"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type ConsentStatus = "granted" | "denied" | null;

interface CookieConsentContextType {
    consent: ConsentStatus;
    acceptAll: () => void;
    rejectNonEssential: () => void;
    resetConsent: () => void;
}

const CookieConsentContext = createContext<CookieConsentContextType>({
    consent: null,
    acceptAll: () => { },
    rejectNonEssential: () => { },
    resetConsent: () => { },
});

export const useCookieConsent = () => useContext(CookieConsentContext);

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
    const [consent, setConsent] = useState<ConsentStatus>(null);

    useEffect(() => {
        const stored = localStorage.getItem("cookie_consent");
        if (stored === "granted" || stored === "denied") {
            setConsent(stored as ConsentStatus);
        }
    }, []);

    const acceptAll = () => {
        setConsent("granted");
        localStorage.setItem("cookie_consent", "granted");
        // Here you would trigger GTM or GA initialization if not using a wrapper component
    };

    const rejectNonEssential = () => {
        setConsent("denied");
        localStorage.setItem("cookie_consent", "denied");
        // Ensure scripts are disabled/removed if possible (though wrapper component is better)
    };

    const resetConsent = () => {
        setConsent(null);
        localStorage.removeItem("cookie_consent");
    };

    return (
        <CookieConsentContext.Provider value={{ consent, acceptAll, rejectNonEssential, resetConsent }}>
            {children}
        </CookieConsentContext.Provider>
    );
}
