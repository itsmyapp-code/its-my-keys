"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import Fuse from "fuse.js";
import { Asset, KeyItem } from "@/types";
import { subscribeToAssets, subscribeToKeys } from "@/lib/firestore/services";
import { useAuth } from "./AuthContext";

// Hardcoded Organization ID for single-tenant / mvp scope
// In a real multi-tenant app, this would come from the user's profile or URL params.
const CURRENT_ORG_ID = "DEMO_ORG_1";

interface InventoryContextType {
    assets: Asset[];
    keys: KeyItem[];
    loading: boolean;
    search: (query: string) => SearchResult;
    refresh: () => void;
}

interface SearchResult {
    assets: Asset[];
    keys: KeyItem[];
}

const InventoryContext = createContext<InventoryContextType>({
    assets: [],
    keys: [],
    loading: true,
    search: () => ({ assets: [], keys: [] }),
    refresh: () => { },
});

export const useInventory = () => useContext(InventoryContext);

export function InventoryProvider({ children }: { children: React.ReactNode }) {
    const { user, profile } = useAuth();
    const [assets, setAssets] = useState<Asset[]>([]);
    const [keys, setKeys] = useState<KeyItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Subscriptions
    useEffect(() => {
        if (!user || !profile?.orgId) {
            setLoading(false);
            return;
        }

        setLoading(true);

        const unsubAssets = subscribeToAssets(profile.orgId, (data) => {
            setAssets(data);
        }, (err) => {
            console.error("Asset Subscription Failed:", err);
        });

        const unsubKeys = subscribeToKeys(profile.orgId, (data) => {
            setKeys(data);
            setLoading(false);
        }, (err) => {
            console.error("Key Subscription Failed:", err);
            setLoading(false);
        });

        return () => {
            unsubAssets();
            unsubKeys();
        };
    }, [user, profile?.orgId]);

    // Fuse.js Indices
    const fuseAssets = useMemo(() => new Fuse(assets, {
        keys: ["name", "area"],
        threshold: 0.3,
    }), [assets]);

    const fuseKeys = useMemo(() => new Fuse(keys, {
        keys: ["assetName", "area", "id", "currentHolder", "status", "qrCode", "searchKeywords"],
        threshold: 0.3,
    }), [keys]);

    const search = (query: string): SearchResult => {
        if (!query) return { assets, keys };

        const assetResults = fuseAssets.search(query).map(r => r.item);
        const keyResults = fuseKeys.search(query).map(r => r.item);

        return { assets: assetResults, keys: keyResults };
    };

    const refresh = () => {
        // No-op for Firestore subscriptions as they update automatically
    };

    return (
        <InventoryContext.Provider value={{ assets, keys, loading, search, refresh }}>
            {children}
        </InventoryContext.Provider>
    );
}
