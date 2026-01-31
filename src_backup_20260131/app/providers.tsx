"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { InventoryProvider } from "@/contexts/InventoryContext";
import { useEffect } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        if (typeof window !== "undefined" && "serviceWorker" in navigator) {
            navigator.serviceWorker
                .register("/sw.js")
                .then((reg) => console.log("SW registered:", reg))
                .catch((err) => console.error("SW registration failed:", err));
        }
    }, []);

    return (
        <AuthProvider>
            <InventoryProvider>
                {children}
            </InventoryProvider>
        </AuthProvider>
    );
}
