"use client";

import React, { useState } from "react";
import { Asset, AssetStatus } from "@/types";
import { AssetService } from "@/lib/services/AssetService";
import { useAuth } from "@/contexts/AuthContext";
import { Timestamp } from "firebase/firestore";

interface Props {
    asset: Asset;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function AssetActionModal({ asset, isOpen, onClose, onSuccess }: Props) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<'ACTION' | 'EDIT'>('ACTION'); // Toggle between Action and Edit

    // Action State
    const [recipient, setRecipient] = useState("");
    const [notes, setNotes] = useState("");
    const [dueDate, setDueDate] = useState(""); // ISO String from input
    const [error, setError] = useState<string | null>(null);

    // Edit State
    const [editName, setEditName] = useState(asset.name);
    const [editMeta, setEditMeta] = useState<Record<string, any>>(asset.metaData || {});

    // Sync state when asset changes
    React.useEffect(() => {
        setEditName(asset.name);
        setEditMeta(asset.metaData || {});
        setMode('ACTION');
        setError(null);
        setDueDate(""); // Reset due date
        setRecipient("");
        setNotes("");
    }, [asset]);

    if (!isOpen) return null;

    const handleCheckOut = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const dueTimestamp = dueDate ? Timestamp.fromDate(new Date(dueDate)) : null;
            await AssetService.checkOut(asset.id, user.uid, user.email || "Unknown", recipient, notes, dueTimestamp);
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

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await AssetService.updateAsset(asset.id, {
                name: editName,
                metaData: editMeta
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            setError("Update failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleMetaChange = (key: string, value: string) => {
        setEditMeta(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-card border border-border rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-4 border-b border-border flex justify-between items-center bg-secondary/50">
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">
                            {mode === 'EDIT' ? "Edit Asset Details" : (asset.status === AssetStatus.AVAILABLE ? "Check Out Asset" : "Return Asset")}
                        </h3>
                        {mode !== 'EDIT' && <p className="text-sm text-gray-500">{asset.name}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setMode(mode === 'ACTION' ? 'EDIT' : 'ACTION')}
                            className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-white transition"
                        >
                            {mode === 'ACTION' ? 'Edit Details' : 'Back to Actions'}
                        </button>
                        <button onClick={onClose} className="text-gray-400 hover:text-foreground">
                            ✕
                        </button>
                    </div>
                </div>

                {/* content */}
                <div className="p-6 space-y-4">
                    {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</div>}

                    {mode === 'EDIT' ? (
                        /* EDIT MODE */
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Asset Name</label>
                                <input
                                    type="text"
                                    required
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    className="w-full p-2 rounded-md bg-input border border-border focus:ring-2 focus:ring-ring outline-none"
                                />
                            </div>

                            {/* Dynamic Fields based on Type */}
                            {asset.type === 'VEHICLE' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">Registration Plate</label>
                                        <input
                                            type="text"
                                            value={editMeta.registrationPlate || ''}
                                            onChange={e => handleMetaChange('registrationPlate', e.target.value)}
                                            className="w-full p-2 rounded-md bg-input border border-border focus:ring-2 focus:ring-ring outline-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-1">Make</label>
                                            <input type="text" value={editMeta.make || ''} onChange={e => handleMetaChange('make', e.target.value)} className="w-full p-2 rounded-md bg-input border border-border" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-1">Model</label>
                                            <input type="text" value={editMeta.model || ''} onChange={e => handleMetaChange('model', e.target.value)} className="w-full p-2 rounded-md bg-input border border-border" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">Assigned Driver</label>
                                        <input
                                            type="text"
                                            value={editMeta.assignedDriver || ''}
                                            onChange={e => handleMetaChange('assignedDriver', e.target.value)}
                                            className="w-full p-2 rounded-md bg-input border border-border focus:ring-2 focus:ring-ring outline-none"
                                            placeholder="Standard driver when not checked out"
                                        />
                                    </div>
                                </>
                            )}

                            {asset.type === 'RENTAL' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">Unit Number</label>
                                        <input
                                            type="text"
                                            value={editMeta.unitNumber || ''}
                                            onChange={e => handleMetaChange('unitNumber', e.target.value)}
                                            className="w-full p-2 rounded-md bg-input border border-border focus:ring-2 focus:ring-ring outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">Tenant Name</label>
                                        <input
                                            type="text"
                                            value={editMeta.tenantName || ''}
                                            onChange={e => handleMetaChange('tenantName', e.target.value)}
                                            className="w-full p-2 rounded-md bg-input border border-border focus:ring-2 focus:ring-ring outline-none"
                                        />
                                    </div>
                                </>
                            )}

                            {asset.type === 'IT_DEVICE' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">Model Name</label>
                                        <input
                                            type="text"
                                            value={editMeta.modelName || ''}
                                            onChange={e => handleMetaChange('modelName', e.target.value)}
                                            className="w-full p-2 rounded-md bg-input border border-border focus:ring-2 focus:ring-ring outline-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-1">Serial Number</label>
                                            <input type="text" value={editMeta.serialNumber || ''} onChange={e => handleMetaChange('serialNumber', e.target.value)} className="w-full p-2 rounded-md bg-input border border-border" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-1">Asset Tag</label>
                                            <input type="text" value={editMeta.assetTag || ''} onChange={e => handleMetaChange('assetTag', e.target.value)} className="w-full p-2 rounded-md bg-input border border-border" />
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Generic Location (All Types can have location) */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Location / Area</label>
                                <input
                                    type="text"
                                    value={editMeta.location || ''}
                                    onChange={e => handleMetaChange('location', e.target.value)}
                                    className="w-full p-2 rounded-md bg-input border border-border focus:ring-2 focus:ring-ring outline-none"
                                />
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button type="button" onClick={() => setMode('ACTION')} className="flex-1 py-2 text-sm font-medium text-gray-500 hover:bg-secondary rounded-md">Cancel Edit</button>
                                <button type="submit" disabled={loading} className="flex-1 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:opacity-90 disabled:opacity-50">
                                    {loading ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    ) : (
                        /* ACTION MODE (Existing) */
                        asset.status === AssetStatus.AVAILABLE ? (
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

                                {/* NEW: Time Back */}
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">Expected Return Time (Optional)</label>
                                    <input
                                        type="datetime-local"
                                        value={dueDate}
                                        onChange={e => setDueDate(e.target.value)}
                                        className="w-full p-2 rounded-md bg-input border border-border focus:ring-2 focus:ring-ring outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">Notes (Optional)</label>
                                    <input
                                        type="text"
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        className="w-full p-2 rounded-md bg-input border border-border focus:ring-2 focus:ring-ring outline-none"
                                        placeholder="Condition, job ref..."
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
                                    <p>Currently held by: <strong>{asset.metaData?.currentHolder || "Unknown"}</strong></p>
                                    {asset.metaData?.dueDate && (
                                        <p className="mt-1 text-xs opacity-80">
                                            Expected Back: {new Date(asset.metaData.dueDate.seconds * 1000).toLocaleString()}
                                        </p>
                                    )}
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
                        ))}
                </div>
            </div>
        </div>
    );
}
