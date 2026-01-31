"use client";

import React, { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useInventory } from "@/contexts/InventoryContext";
import { AssetService } from "@/lib/services/AssetService";
import { AssetType, AssetStatus } from "@/types";
import { QRScannerModal } from "@/components/common/QRScannerModal";

export function AddAssetForm({ onSuccess }: { onSuccess?: () => void }) {
    const { profile, organization } = useAuth();
    const { assets } = useInventory();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [name, setName] = useState("");
    const [type, setType] = useState<AssetType>(AssetType.KEY);
    const [qrCode, setQrCode] = useState("");

    // Polymorphic Metadata
    const [metadata, setMetadata] = useState<Record<string, any>>({});
    const [isScannerOpen, setIsScannerOpen] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!profile?.orgId) {
            setError("User organization not found.");
            return;
        }

        // Pilot Constraint Check
        if (organization?.accountType === 'TRIAL_PILOT') {
            if (assets.length >= 30) {
                setError("Trial Limit Reached. You are limited to 30 keys during the pilot phase. Contact support to upgrade.");
                return;
            }
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

    const nameInputRef = useRef<HTMLInputElement>(null);

    const handleQrKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent form submit
            nameInputRef.current?.focus();
        }
    };

    const handleMetadataChange = (key: string, value: any) => {
        setMetadata(prev => ({ ...prev, [key]: value }));
    };

    const handleScan = (code: string) => {
        setQrCode(code);
        // Slight delay to allow modal to close completely before focus
        setTimeout(() => {
            nameInputRef.current?.focus();
        }, 100);
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
            {/* QR Code Scanned First */}
            <div className="space-y-2 pb-4 border-b border-border mb-4">
                <label className="text-sm font-medium text-blue-600 dark:text-blue-400">Scan QR Code / Barcode (Start Here)</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={qrCode}
                        onChange={(e) => setQrCode(e.target.value)}
                        onKeyDown={handleQrKeyDown}
                        autoFocus
                        className="w-full p-2 rounded-md bg-blue-50/50 border border-blue-200 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm dark:bg-blue-900/20 dark:border-blue-800"
                        placeholder="Scan tag to quick-add..."
                    />
                    <button
                        type="button"
                        onClick={() => setIsScannerOpen(true)}
                        className="shrink-0 rounded-md border border-blue-200 bg-blue-50 p-2 text-blue-600 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/40 dark:text-blue-400 dark:hover:bg-blue-900/60"
                        title="Open Camera"
                    >
                        📸
                    </button>
                </div>
            </div>

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
                        ref={nameInputRef}
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



            <div className="pt-4">
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 px-4 bg-primary text-primary-foreground font-medium rounded-md hover:opacity-90 transition disabled:opacity-50"
                >
                    {loading ? "Creating..." : "Create Asset"}
                </button>
            </div>

            <QRScannerModal
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                onScan={handleScan}
            />
        </form>
    );
}
