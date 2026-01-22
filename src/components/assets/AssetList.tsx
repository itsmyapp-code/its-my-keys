"use client";

import React, { useEffect, useState, useMemo } from "react";
import Fuse from "fuse.js";
import { useAuth } from "@/contexts/AuthContext";
import { AssetService } from "@/lib/services/AssetService";
import { Asset, AssetType, AssetStatus } from "@/types";
import { AssetActionModal } from "./AssetActionModal";

export function AssetList() {
    const { profile } = useAuth();
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Modal State
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Fetch logic
    const fetchAssets = async () => {
        if (!profile?.orgId) return;
        try {
            const data = await AssetService.getAssetsByOrg(profile.orgId);
            setAssets(data);
        } catch (err) {
            console.error("Failed to fetch assets", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssets();
    }, [profile?.orgId]);

    // Fuse.js Setup
    const fuse = useMemo(() => {
        return new Fuse(assets, {
            keys: ["name", "qrCode", "searchKeywords", "status", "metaData.serialNumber", "metaData.registrationPlate"],
            threshold: 0.3,
        });
    }, [assets]);

    const displayAssets = useMemo(() => {
        if (searchQuery.trim()) {
            return fuse.search(searchQuery).map((r) => r.item);
        }
        return assets;
    }, [assets, searchQuery, fuse]);

    // Grouping
    const grouped = useMemo(() => ({
        [AssetType.KEY]: displayAssets.filter(a => a.type === AssetType.KEY || !a.type),
        [AssetType.IT_DEVICE]: displayAssets.filter(a => a.type === AssetType.IT_DEVICE),
        [AssetType.VEHICLE]: displayAssets.filter(a => a.type === AssetType.VEHICLE),
        [AssetType.RENTAL]: displayAssets.filter(a => a.type === AssetType.RENTAL),
    }), [displayAssets]);

    const handleAction = (asset: Asset) => {
        setSelectedAsset(asset);
        setIsModalOpen(true);
    };

    const handleModalSuccess = () => {
        fetchAssets();
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500 animate-pulse">Loading assets...</div>;
    }

    return (
        <div className="space-y-8 pb-20">
            {/* Search */}
            <div className="sticky top-0 bg-background/95 backdrop-blur-md z-10 py-4 border-b border-border/50">
                <div className="relative w-full max-w-xl">
                    <input
                        type="text"
                        placeholder="Search keys, serials, plates..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-lg bg-secondary border border-transparent focus:border-ring focus:ring-2 focus:ring-ring/20 outline-none transition shadow-sm"
                    />
                    <svg className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>

            {/* Keys Section */}
            {(grouped[AssetType.KEY].length > 0) && (
                <section>
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-white">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600 text-lg">🔑</span>
                        Keys
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {grouped[AssetType.KEY].map((asset) => (
                            <AssetCard key={asset.id} asset={asset} onAction={() => handleAction(asset)} />
                        ))}
                    </div>
                </section>
            )}

            {/* IT Section */}
            {(grouped[AssetType.IT_DEVICE].length > 0) && (
                <section>
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-white">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 text-lg">💻</span>
                        IT Devices
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {grouped[AssetType.IT_DEVICE].map((asset) => (
                            <AssetCard key={asset.id} asset={asset} onAction={() => handleAction(asset)} />
                        ))}
                    </div>
                </section>
            )}

            {/* Vehicles Section */}
            {(grouped[AssetType.VEHICLE].length > 0) && (
                <section>
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-white">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600 text-lg">🚗</span>
                        Vehicles
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {grouped[AssetType.VEHICLE].map((asset) => (
                            <AssetCard key={asset.id} asset={asset} onAction={() => handleAction(asset)} />
                        ))}
                    </div>
                </section>
            )}

            {/* Rentals Section */}
            {(grouped[AssetType.RENTAL].length > 0) && (
                <section>
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-white">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-green-600 text-lg">🏠</span>
                        Rentals
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {grouped[AssetType.RENTAL].map((asset) => (
                            <AssetCard key={asset.id} asset={asset} onAction={() => handleAction(asset)} />
                        ))}
                    </div>
                </section>
            )}

            {displayAssets.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-center text-gray-400">
                    <div className="text-4xl mb-4">🔍</div>
                    <p className="text-lg font-medium text-foreground">No assets found</p>
                    <p className="text-sm">Try adjusting your search or create a new asset.</p>
                </div>
            )}

            {/* Action Modal */}
            {selectedAsset && (
                <AssetActionModal
                    asset={selectedAsset}
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={handleModalSuccess}
                />
            )}
        </div>
    );
}

function AssetCard({ asset, onAction }: { asset: Asset; onAction: () => void }) {
    const isAvailable = asset.status === AssetStatus.AVAILABLE;
    const meta = asset.metaData || {};

    return (
        <div className="group relative bg-card border border-border p-5 rounded-xl shadow-sm hover:shadow-lg hover:border-ring/30 transition-all duration-300 flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                    {/* Primary Identifier */}
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-foreground text-lg leading-tight">
                            {asset.type === AssetType.VEHICLE ? (meta.registrationPlate || asset.name) : asset.name}
                        </h3>
                        {/* Status Badge */}
                        <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold rounded-full ${getStatusColor(asset.status)}`}>
                            {asset.status.replace('_', ' ')}
                        </span>
                    </div>

                    {/* Secondary Type-Specific Info */}
                    {asset.type === AssetType.KEY && (
                        <div className="text-sm text-gray-500">{meta.location || "Unknown Location"}</div>
                    )}
                    {asset.type === AssetType.IT_DEVICE && (
                        <div className="text-sm text-gray-500">{meta.modelName || "Std Device"}</div>
                    )}
                    {asset.type === AssetType.VEHICLE && (
                        <div className="text-sm text-gray-500">{meta.make} {meta.model}</div>
                    )}
                    {asset.type === AssetType.RENTAL && (
                        <div className="text-sm text-gray-500">{meta.unitNumber || "Unit N/A"}</div>
                    )}
                </div>
            </div>

            {/* Metadata Badges / Details */}
            <div className="space-y-2 mb-4 flex-grow">
                {/* Key Code */}
                {asset.type === AssetType.KEY && meta.keyCode && (
                    <span className="inline-block px-2 py-0.5 bg-secondary rounded text-xs font-mono font-medium text-purple-600 dark:text-purple-400">
                        {meta.keyCode}
                    </span>
                )}
                {/* Serial/Tag */}
                {asset.type === AssetType.IT_DEVICE && (meta.serialNumber || meta.assetTag) && (
                    <div className="flex flex-wrap gap-2 text-xs">
                        {meta.assetTag && <span className="bg-secondary px-1.5 py-0.5 rounded font-mono">Tag: {meta.assetTag}</span>}
                        {meta.serialNumber && <span className="text-gray-500">SN: {meta.serialNumber}</span>}
                    </div>
                )}
                {/* Vehicle Driver */}
                {asset.type === AssetType.VEHICLE && (
                    <div className="text-xs text-gray-500">
                        Using by: <span className="text-foreground font-medium">{meta.assignedDriver || "Unassigned"}</span>
                    </div>
                )}
                {/* Rental Tenant */}
                {asset.type === AssetType.RENTAL && (
                    <div className="text-xs text-gray-500">
                        Tenant: <span className="text-foreground font-medium">{meta.tenantName || "Vacant"}</span>
                    </div>
                )}

                {/* Checked Out Status */}
                {asset.status === AssetStatus.CHECKED_OUT && (
                    <div className="mt-2 text-xs p-2 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded text-orange-800 dark:text-orange-200">
                        <span className="font-semibold">Holder:</span> {meta.currentHolder || "Unknown"}
                    </div>
                )}
            </div>

            {/* Action Button */}
            <div className="mt-auto pt-4 border-t border-border/50">
                <button
                    onClick={onAction}
                    className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors shadow-sm
                        ${isAvailable
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-secondary text-foreground hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700'
                        }
                    `}
                >
                    {isAvailable ? "Check Out / Manage" : "Update / Return"}
                </button>
            </div>
        </div>
    );
}

function getStatusColor(status: AssetStatus) {
    switch (status) {
        case AssetStatus.AVAILABLE: return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
        case AssetStatus.CHECKED_OUT: return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
        case AssetStatus.MISSING: return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
        default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
    }
}
