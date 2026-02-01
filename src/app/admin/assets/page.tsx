"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ProfileSetup } from "@/components/auth/ProfileSetup";
import { AssetList } from "@/components/assets/AssetList";
import { WhoHasWhatWidget } from "@/components/dashboard/WhoHasWhatWidget";

export default function AdminAssetsPage() {
    const { profile, loading } = useAuth();
    const [refreshKey, setRefreshKey] = useState(0);

    if (loading) return <div className="p-10 text-center animate-pulse">Loading Asset System...</div>;

    if (!profile?.orgId) {
        return (
            <div className="container mx-auto max-w-7xl p-6">
                <ProfileSetup />
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-7xl p-6 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">Asset Management</h1>
                    <p className="text-gray-500 mt-1">Universal Asset Operating System</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Stats */}
                <div className="space-y-8 lg:col-span-1">
                    <WhoHasWhatWidget />
                </div>

                {/* Right Column: List */}
                <div className="lg:col-span-2">
                    <h2 className="text-xl font-semibold mb-4">Asset Inventory</h2>
                    <AssetList key={refreshKey} />
                </div>
            </div>
        </div>
    );
}
