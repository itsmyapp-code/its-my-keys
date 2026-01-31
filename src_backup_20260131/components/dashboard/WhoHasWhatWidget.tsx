"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AssetService } from "@/lib/services/AssetService";
import { Asset, AssetStatus, AssetType } from "@/types";

export function WhoHasWhatWidget() {
    const { profile } = useAuth();
    const [checkedOutAssets, setCheckedOutAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);

    // Group by type or holder
    const [viewMode, setViewMode] = useState<"LIST" | "SUMMARY">("LIST");

    useEffect(() => {
        if (!profile?.orgId) return;

        const fetch = async () => {
            // In a real app, use a specific query for status == CHECKED_OUT
            // For now, client-side filtering of all assets (Prototype Speed)
            const all = await AssetService.getAssetsByOrg(profile.orgId);
            setCheckedOutAssets(all.filter(a => a.status === AssetStatus.CHECKED_OUT));
            setLoading(false);
        };
        fetch();
    }, [profile?.orgId]);

    if (loading) return <div className="h-48 rounded-xl bg-secondary/50 animate-pulse"></div>;

    const totalCount = checkedOutAssets.length;
    const keyCount = checkedOutAssets.filter(a => a.type === AssetType.KEY).length;
    const deviceCount = checkedOutAssets.filter(a => a.type === AssetType.IT_DEVICE).length;

    return (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-bold text-foreground">Who Has What?</h2>
                    <p className="text-sm text-gray-500">Active loans and assignments</p>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-extrabold text-primary">{totalCount}</div>
                    <div className="text-xs text-gray-400">Items Out</div>
                </div>
            </div>

            {/* Summary Chips */}
            <div className="flex gap-2 mb-4">
                {keyCount > 0 && <span className="px-2 py-1 text-xs font-semibold bg-amber-100 text-amber-700 rounded-md">{keyCount} Keys</span>}
                {deviceCount > 0 && <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded-md">{deviceCount} Devices</span>}
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {checkedOutAssets.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                        No items are currently checked out.
                    </div>
                ) : (
                    checkedOutAssets.map(asset => (
                        <div key={asset.id} className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                    {getInitials(asset.metaData.currentHolder)}
                                </div>
                                <div>
                                    <div className="text-sm font-semibold text-foreground">{asset.metaData.currentHolder || "Unknown"}</div>
                                    <div className="text-xs text-gray-500">{asset.name}</div>
                                </div>
                            </div>
                            <span className="text-xs text-gray-400">{timeSince(asset.updatedAt)}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function getInitials(name?: string) {
    if (!name) return "?";
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

function timeSince(timestamp: any) {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "m";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "min";
    return "now";
}
