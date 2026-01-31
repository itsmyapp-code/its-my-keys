"use client";

import React, { useState } from "react";
import { Asset } from "@/types";
import { AssetService } from "@/lib/services/AssetService";

interface QuickSetupModalProps {
    asset: Asset;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function QuickSetupModal({ asset, isOpen, onClose, onSuccess }: QuickSetupModalProps) {
    const [name, setName] = useState(asset.name || "");
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await AssetService.updateAsset(asset.id, {
                name: name,
                isSetupComplete: true
            });
            onSuccess();
        } catch (error) {
            console.error("Failed to setup asset", error);
            alert("Error saving asset: " + error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800 animate-in fade-in zoom-in-95 duration-200">
                <div className="text-center mb-6">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 mb-4 animate-bounce">
                        <span className="text-2xl">✨</span>
                    </div>
                    <h2 className="text-xl font-bold dark:text-white">New Key Detected!</h2>
                    <p className="text-sm text-gray-500 mt-2 dark:text-gray-400">
                        This is a fresh key from your starter pack. Give it a name to activate it.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Name / Identifier
                        </label>
                        <input
                            type="text"
                            required
                            autoFocus
                            className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-lg text-center font-bold text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            placeholder="e.g. Front Door"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        <p className="text-xs text-center text-gray-400 mt-1">
                            QR Code: <span className="font-mono">{asset.qrCode || asset.metaData?.keyCode}</span>
                        </p>
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
                        >
                            Later
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !name.trim()}
                            className="flex-1 rounded-lg bg-blue-600 px-5 py-2.5 text-center text-sm font-bold text-white hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700"
                        >
                            {loading ? "Activating..." : "Save & Activate"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
