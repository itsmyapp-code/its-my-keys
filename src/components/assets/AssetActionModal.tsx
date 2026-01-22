"use client";

import React, { useState } from "react";
import { Asset, AssetStatus } from "@/types";
import { AssetService } from "@/lib/services/AssetService";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
    asset: Asset;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function AssetActionModal({ asset, isOpen, onClose, onSuccess }: Props) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [recipient, setRecipient] = useState("");
    const [notes, setNotes] = useState("");
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleCheckOut = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            await AssetService.checkOut(asset.id, user.uid, user.email || "Unknown", recipient, notes);
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckIn = async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            await AssetService.checkIn(asset.id, user.uid, user.email || "Unknown", notes);
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-card border border-border rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-4 border-b border-border flex justify-between items-center bg-secondary/50">
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">
                            {asset.status === AssetStatus.AVAILABLE ? "Check Out Asset" : "Return Asset"}
                        </h3>
                        <p className="text-sm text-gray-500">{asset.name}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-foreground">
                        ✕
                    </button>
                </div>

                {/* content */}
                <div className="p-6 space-y-4">
                    {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</div>}

                    {asset.status === AssetStatus.AVAILABLE ? (
                        <form onSubmit={handleCheckOut} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Handed To (Name/ID)</label>
                                <input
                                    autoFocus
                                    required
                                    type="text"
                                    value={recipient}
                                    onChange={e => setRecipient(e.target.value)}
                                    className="w-full p-2 rounded-md bg-input border border-border focus:ring-2 focus:ring-ring outline-none"
                                    placeholder="e.g. John Doe, Agent 47"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Notes (Optional)</label>
                                <input
                                    type="text"
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    className="w-full p-2 rounded-md bg-input border border-border focus:ring-2 focus:ring-ring outline-none"
                                    placeholder="Time out, expected return..."
                                />
                            </div>
                            <div className="pt-2 flex gap-3">
                                <button type="button" onClick={onClose} className="flex-1 py-2 text-sm font-medium text-gray-500 hover:bg-secondary rounded-md">Cancel</button>
                                <button type="submit" disabled={loading} className="flex-1 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50">
                                    {loading ? "Processing..." : "Confirm Check Out"}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-md text-sm text-amber-800 dark:text-amber-200">
                                Currently held by: <strong>{asset.metaData?.currentHolder || "Unknown"}</strong>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Notes (Optional)</label>
                                <input
                                    type="text"
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    className="w-full p-2 rounded-md bg-input border border-border focus:ring-2 focus:ring-ring outline-none"
                                    placeholder="Condition notes, issues..."
                                />
                            </div>
                            <div className="pt-2 flex gap-3">
                                <button type="button" onClick={onClose} className="flex-1 py-2 text-sm font-medium text-gray-500 hover:bg-secondary rounded-md">Cancel</button>
                                <button onClick={handleCheckIn} disabled={loading} className="flex-1 py-2 text-sm font-medium bg-green-600 text-white rounded-md hover:opacity-90 disabled:opacity-50">
                                    {loading ? "Processing..." : "Confirm Return"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
