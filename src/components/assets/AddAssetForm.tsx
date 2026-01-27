"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AssetService } from "@/lib/services/AssetService";
import { AssetType, AssetStatus } from "@/types";

export function AddAssetForm({ onSuccess }: { onSuccess?: () => void }) {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [name, setName] = useState("");
    const [type, setType] = useState<AssetType>(AssetType.KEY);
    const [qrCode, setQrCode] = useState("");

    // Polymorphic Metadata
    const [metadata, setMetadata] = useState<Record<string, any>>({});

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!profile?.orgId) {
            setError("User organization not found.");
            return;
        }

        setLoading(true);

        try {
            await AssetService.createAsset({
                orgId: profile.orgId,
                name,
                type,
                status: AssetStatus.AVAILABLE, // Default
                qrCode: qrCode || undefined,
                metaData: metadata,
            });

            // Reset Form
            setName("");
            setQrCode("");
            setMetadata({});
            if (onSuccess) onSuccess();
        } catch (err: any) {
            console.error(err);
            setError("Failed to create asset. " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleMetadataChange = (key: string, value: any) => {
        setMetadata(prev => ({ ...prev, [key]: value }));
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 p-6 bg-card border border-border rounded-lg shadow-sm">
            <div>
                <h2 className="text-xl font-semibold text-foreground">Add New Asset</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Enter the details of the asset you want to track.</p>
            </div>

            {error && (
                <div className="p-3 bg-red-100 border border-red-200 text-red-700 rounded-md text-sm">
                    {error}
                </div>
            )}

            {/* Common Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Asset Name</label>
                    <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full p-2 rounded-md bg-input border border-border focus:ring-2 focus:ring-ring outline-none transition"
                        placeholder="e.g. Front Door Key"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Asset Type</label>
                    <select
                        value={type}
                        onChange={(e) => setType(e.target.value as AssetType)}
                        className="w-full p-2 rounded-md bg-input border border-border focus:ring-2 focus:ring-ring outline-none transition"
                    >
                        {Object.values(AssetType).map((t) => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Dynamic Fields */}
            <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                    {type === AssetType.KEY ? "Key Details" :
                        type === AssetType.IT_DEVICE ? "Device Specs" :
                            type === AssetType.VEHICLE ? "Vehicle Details" :
                                type === AssetType.RENTAL ? "Property Details" : "Details"}
                </h3>

                {type === AssetType.KEY && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Door / Location</label>
                            <input
                                type="text"
                                className="w-full p-2 rounded-md bg-input border border-border focus:ring-2 focus:ring-ring outline-none"
                                placeholder="e.g. Main Entrance"
                                onChange={(e) => handleMetadataChange("location", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Key Code / Tag ID</label>
                            <input
                                type="text"
                                className="w-full p-2 rounded-md bg-input border border-border focus:ring-2 focus:ring-ring outline-none"
                                placeholder="e.g. K-101"
                                onChange={(e) => handleMetadataChange("keyCode", e.target.value)}
                            />
                        </div>
                    </div>
                )}

                {type === AssetType.IT_DEVICE && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Serial Number</label>
                            <input
                                type="text"
                                className="w-full p-2 rounded-md bg-input border border-border focus:ring-2 focus:ring-ring outline-none"
                                placeholder="Required for warranty"
                                onChange={(e) => handleMetadataChange("serialNumber", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Model</label>
                            <input
                                type="text"
                                className="w-full p-2 rounded-md bg-input border border-border focus:ring-2 focus:ring-ring outline-none"
                                placeholder="e.g. MacBook Pro M3"
                                onChange={(e) => handleMetadataChange("model", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Asset Tag</label>
                            <input
                                type="text"
                                className="w-full p-2 rounded-md bg-input border border-border focus:ring-2 focus:ring-ring outline-none"
                                placeholder="e.g. IT-009"
                                onChange={(e) => handleMetadataChange("assetTag", e.target.value)}
                            />
                        </div>
                    </div>
                )}

                {type === AssetType.VEHICLE && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Registration Plate</label>
                            <input
                                type="text"
                                className="w-full p-2 rounded-md bg-input border border-border focus:ring-2 focus:ring-ring outline-none uppercase"
                                placeholder="e.g. AB12 CDE"
                                onChange={(e) => handleMetadataChange("registrationPlate", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Make</label>
                            <input
                                type="text"
                                className="w-full p-2 rounded-md bg-input border border-border focus:ring-2 focus:ring-ring outline-none"
                                placeholder="e.g. Ford"
                                onChange={(e) => handleMetadataChange("make", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Model</label>
                            <input
                                type="text"
                                className="w-full p-2 rounded-md bg-input border border-border focus:ring-2 focus:ring-ring outline-none"
                                placeholder="e.g. Transit Custom"
                                onChange={(e) => handleMetadataChange("model", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">VIN / Chassis</label>
                            <input
                                type="text"
                                className="w-full p-2 rounded-md bg-input border border-border focus:ring-2 focus:ring-ring outline-none"
                                placeholder="Optional"
                                onChange={(e) => handleMetadataChange("vin", e.target.value)}
                            />
                        </div>
                    </div>
                )}

                {type === AssetType.RENTAL && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Unit Number / Address</label>
                            <input
                                type="text"
                                className="w-full p-2 rounded-md bg-input border border-border focus:ring-2 focus:ring-ring outline-none"
                                placeholder="e.g. Flat 4B or 12 High St"
                                onChange={(e) => handleMetadataChange("unitNumber", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Current Tenant</label>
                            <input
                                type="text"
                                className="w-full p-2 rounded-md bg-input border border-border focus:ring-2 focus:ring-ring outline-none"
                                placeholder="e.g. Sarah Jones"
                                onChange={(e) => handleMetadataChange("tenantName", e.target.value)}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Optional QR Code */}
            <div className="space-y-2 pt-2">
                <label className="text-sm font-medium text-gray-400">QR Code / Barcode (Optional)</label>
                <input
                    type="text"
                    value={qrCode}
                    onChange={(e) => setQrCode(e.target.value)}
                    className="w-full p-2 rounded-md bg-input border border-border focus:ring-2 focus:ring-ring outline-none font-mono text-xs"
                    placeholder="Scan or type ID..."
                />
            </div>

            <div className="pt-4">
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 px-4 bg-primary text-primary-foreground font-medium rounded-md hover:opacity-90 transition disabled:opacity-50"
                >
                    {loading ? "Creating..." : "Create Asset"}
                </button>
            </div>
        </form>
    );
}
