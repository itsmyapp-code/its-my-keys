"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { InventoryProvider } from "@/contexts/InventoryContext";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <InventoryProvider>
                {children}
            </InventoryProvider>
        </AuthProvider>
    );
}
