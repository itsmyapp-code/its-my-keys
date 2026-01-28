"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useInventory } from "@/contexts/InventoryContext";
import { AssetService } from "@/lib/services/AssetService";
import { Timestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { AssetStatus, AssetType } from "@/types";
import { QRScannerModal } from "@/components/common/QRScannerModal";

export default function AddKeyPage() {
    const router = useRouter();
    const { assets } = useInventory();
    const { user, profile } = useAuth(); // Get profile

    const [formData, setFormData] = useState({
        keyId: "",
        assetName: "",
        area: "",
        qrCode: "",
    });

    const [isScannerOpen, setIsScannerOpen] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Auto-fill area if asset is selected (simple autocomplete logic)
    useEffect(() => {
        const existingAsset = assets.find(a => a.name.toLowerCase() === formData.assetName.toLowerCase());
        if (existingAsset && !formData.area) {
            setFormData(prev => ({ ...prev, area: existingAsset.area || "" }));
        }
    }, [formData.assetName, assets, formData.area]);

    const keyIdInputRef = useRef<HTMLInputElement>(null);

    const handleQrKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            // Auto-fill Key ID with the scanned code
            setFormData(prev => ({ ...prev, keyId: e.currentTarget.value }));
            keyIdInputRef.current?.focus();
        }
    };

    const handleScan = (code: string) => {
        setFormData(prev => ({
            ...prev,
            qrCode: code,
            keyId: code,
            assetName: code // Auto-fill Asset Name too per user request
        }));
        setTimeout(() => {
            keyIdInputRef.current?.focus();
        }, 100);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.orgId) {
            setError("Organization ID not found. Please sign in again.");
            return;
        }

        setError("");
        setSuccess("");
        setLoading(true);

        try {
            if (!formData.keyId || !formData.assetName) {
                throw new Error("Key ID and Door/Asset Name are required.");
            }

            // 1. Find or Create Asset
            let assetId = "";
            const existingAsset = assets.find(a => a.name.toLowerCase() === formData.assetName.toLowerCase());

            if (existingAsset) {
                assetId = existingAsset.id;
            } else {
                // Create new asset using AssetService
                const newAsset = await AssetService.createAsset({
                    orgId: profile.orgId,
                    name: formData.assetName,
                    area: formData.area || "General",
                    type: AssetType.FACILITY, // Default to FACILITY for key parents (doors, buildings) so they don't appear as Rentals
                    status: AssetStatus.AVAILABLE,
                    metaData: {},
                    totalKeys: 1
                });
                assetId = newAsset.id;
            }

            // 2. Create Key using AssetService
            await AssetService.createAsset({
                orgId: profile.orgId,
                name: formData.keyId,
                type: AssetType.KEY,
                status: AssetStatus.AVAILABLE,
                area: formData.area || (existingAsset?.area || "General"),
                metaData: {
                    keyCode: formData.keyId,
                    assetId: assetId,
                    location: formData.area || (existingAsset?.area || "General"),
                    loanType: "STANDARD",
                },
                qrCode: formData.qrCode || undefined
            });

            setSuccess(`Successfully added Key ${formData.keyId}`);
            setFormData({ keyId: "", assetName: "", area: "", qrCode: "" }); // Reset
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to create key.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mx-auto max-w-2xl p-6">
            <h1 className="mb-8 text-2xl font-bold dark:text-white">Add New Key</h1>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <form onSubmit={handleSubmit} className="space-y-6">


                    {/* QR Code Scanned First */}
                    <div className="space-y-2 pb-4 border-b border-gray-200 dark:border-gray-700">
                        <label className="text-sm font-medium text-blue-600 dark:text-blue-400">Scan QR Code / Barcode (Start Here)</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={formData.qrCode}
                                onChange={e => setFormData({ ...formData, qrCode: e.target.value })}
                                onKeyDown={handleQrKeyDown}
                                autoFocus
                                className="block w-full rounded-lg border border-blue-200 bg-blue-50/50 p-2.5 font-mono text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-blue-800 dark:bg-blue-900/20 dark:text-white"
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

                    {/* Key ID */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
                            Key ID / Tag Number <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.keyId}
                            onChange={e => setFormData({ ...formData, keyId: e.target.value })}
                            placeholder="e.g. 104-A"
                            className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            ref={keyIdInputRef}
                        />
                    </div>

                    {/* Asset Name (Datalist for Autocomplete) */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
                            Door / Asset Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            list="assets-list"
                            value={formData.assetName}
                            onChange={e => setFormData({ ...formData, assetName: e.target.value })}
                            placeholder="e.g. Main Entrance"
                            className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                        <datalist id="assets-list">
                            {assets.map(a => (
                                <option key={a.id} value={a.name} />
                            ))}
                        </datalist>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Select existing or type new name to create.
                        </p>
                    </div>

                    {/* Area */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
                            Area / Location
                        </label>
                        <input
                            type="text"
                            value={formData.area}
                            onChange={e => setFormData({ ...formData, area: e.target.value })}
                            placeholder="e.g. Block A"
                            className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                    </div>

                    {/* Feedback Messages */}
                    {error && (
                        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-400">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            {success}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-blue-700 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700"
                    >
                        {loading ? "Adding Key..." : "Add Key"}
                    </button>
                </form>
            </div>

            <QRScannerModal
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                onScan={handleScan}
            />
        </div>
    );
}
