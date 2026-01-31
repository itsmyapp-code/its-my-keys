"use client";

import React, { useState } from "react";
import { KeyItem, LoanType } from "@/types";
import { updateKeyStatus, reportKeyMissing } from "@/lib/firestore/services";
import { AssetService } from "@/lib/services/AssetService"; // Import Service
import { Timestamp } from "firebase/firestore";
import { QRScannerModal } from "@/components/common/QRScannerModal";

interface KeyActionModalProps {
    keyItem: KeyItem | null;
    isOpen: boolean;
    onClose: () => void;
    orgId: string;
}

export function KeyActionModal({ keyItem, isOpen, onClose, orgId }: KeyActionModalProps) {
    const [parentAsset, setParentAsset] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Fetch Parent Asset Info
    React.useEffect(() => {
        const fetchParent = async () => {
            if (keyItem?.metaData?.assetId) {
                try {
                    const snap = await AssetService.getAsset(keyItem.metaData.assetId);
                    if (snap) {
                        setParentAsset(snap);
                    }
                } catch (e) { console.error(e); }
            }
        };
        // actually let's just stick to displaying what we have first, fetching might be slow/complex for this step without checking service
        // checking service first
    }, [keyItem]);

    // Better approach: Just use what we have, or if we really need it, Use AssetService.getAsset if available.
    const [holderName, setHolderName] = useState("");
    const [holderCompany, setHolderCompany] = useState(""); // New field
    const [duration, setDuration] = useState<string>("1_HOUR"); // 1_HOUR, 4_HOURS, EOD, INDEFINITE
    const [isReportingMissing, setIsReportingMissing] = useState(false);
    const [missingReason, setMissingReason] = useState("");

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState("");
    const [editQrCode, setEditQrCode] = useState("");
    const [isEditScannerOpen, setIsEditScannerOpen] = useState(false);

    // Initialize edit state when entering edit mode
    const startEditing = () => {
        setEditName(keyItem?.name || "");
        setEditQrCode(keyItem?.qrCode || keyItem?.metaData?.keyCode || "");
        setIsEditing(true);
    };

    const cancelEditing = () => {
        setIsEditing(false);
        setEditName("");
        setEditQrCode("");
    };

    const handleSaveEdit = async () => {
        if (!keyItem) return;
        setLoading(true);
        try {
            await AssetService.updateAsset(keyItem.id, {
                name: editName,
                qrCode: editQrCode,
                // Also update metadata keyCode if it exists or is being added
                metaData: {
                    ...keyItem.metaData,
                    keyCode: editQrCode || keyItem.metaData?.keyCode
                }
            });
            // Ideally we'd update local state, but closing/refreshing works too (context updates)
            setIsEditing(false);
            onClose(); // Close modal to force refresh/clear state
        } catch (err: any) {
            console.error("Error updating key:", err);
            alert("Failed to update key: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !keyItem) return null;

    const isAvailable = keyItem.status === "AVAILABLE";
    const isMissing = keyItem.status === "MISSING";
    const meta = keyItem.metaData || {};

    const assetLabel = keyItem.type === "VEHICLE" ? "Vehicle" :
        keyItem.type === "IT_DEVICE" ? "Device" :
            keyItem.type === "RENTAL" ? "Unit" : "Key";

    const handleDelete = async () => {
        if (!confirm(`Are you sure you want to remove this ${assetLabel.toLowerCase()}? This action cannot be undone.`)) return;

        setLoading(true);
        try {
            await AssetService.deleteAsset(keyItem.id);
            onClose();
        } catch (err: any) {
            console.error("Error deleting asset:", err);
            alert(`Failed to delete ${assetLabel.toLowerCase()}: ` + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckOut = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!holderName) return;

        setLoading(true);
        try {
            let dueDate: Timestamp | null = null;
            const now = new Date();
            let selectedLoanType: LoanType = "STANDARD";

            switch (duration) {
                case "1_HOUR":
                    now.setHours(now.getHours() + 1);
                    dueDate = Timestamp.fromDate(now);
                    selectedLoanType = "1_HOUR"; // Use Check Out Type
                    break;
                case "4_HOURS":
                    now.setHours(now.getHours() + 4);
                    dueDate = Timestamp.fromDate(now);
                    selectedLoanType = "4_HOURS";
                    break;
                case "EOD":
                    now.setHours(23, 59, 59, 999);
                    dueDate = Timestamp.fromDate(now);
                    selectedLoanType = "EOD";
                    break;
                case "INDEFINITE":
                    dueDate = null;
                    selectedLoanType = "INDEFINITE";
                    break;
            }

            // Pass holderCompany
            await updateKeyStatus(orgId, keyItem.id, "CHECKED_OUT", holderName, holderCompany, selectedLoanType, dueDate);
            onClose();
            // Reset
            setHolderName("");
            setHolderCompany("");
            setDuration("1_HOUR");
        } catch (err) {
            console.error("Error checking out:", err);
            alert(`Failed to check out ${assetLabel.toLowerCase()}`);
        } finally {
            setLoading(false);
        }
    };

    const handleReturn = async () => {
        setLoading(true);
        try {
            await updateKeyStatus(orgId, keyItem.id, "AVAILABLE", null, null, "STANDARD", null);
            onClose();
        } catch (err) {
            console.error("Error returning:", err);
            alert(`Failed to return ${assetLabel.toLowerCase()}`);
        } finally {
            setLoading(false);
        }
    };

    const confirmReportMissing = async () => {
        if (!missingReason.trim()) return;

        setLoading(true);
        try {
            await reportKeyMissing(orgId, keyItem.id, meta.currentHolder, missingReason);
            onClose();
            setIsReportingMissing(false);
            setMissingReason("");
        } catch (err: any) {
            console.error("Error reporting missing:", err);
            alert(`Failed to report missing: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                    <h2 className={`text-xl font-bold ${isMissing ? "text-red-600" : "dark:text-white"}`}>
                        {isMissing ? `${assetLabel} Missing` : (isAvailable ? `Check Out ${assetLabel}` : `Return ${assetLabel} ${isAvailable ? '' : (meta.registrationPlate || meta.keyCode || keyItem.name)}`)}
                    </h2>
                    <div className="flex gap-2">
                        {!isEditing && !isMissing && (
                            <button onClick={startEditing} className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500" title="Edit Key Details">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                </svg>
                            </button>
                        )}
                        <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-700">
                            <svg className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Key Info Badge */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                            {/* Dynamic Icon/Text based on Type */}
                            <span className="font-bold text-xs">
                                {keyItem.type === 'VEHICLE' ? '🚗' :
                                    keyItem.type === 'IT_DEVICE' ? '💻' :
                                        (meta.keyCode || keyItem.id.substring(0, 4))}
                            </span>
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                {parentAsset ? parentAsset.name : (keyItem.name || "Unknown Key")}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {meta.location || parentAsset?.area || "Unknown Location"}
                                {meta.keyCode && <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-gray-600 dark:bg-gray-700 dark:text-gray-300">Tag: {meta.keyCode}</span>}
                            </p>
                        </div>
                    </div>
                </div>

                {/* CONTENT */}

                {isEditing ? (
                    /* EDIT FORM */
                    <div className="space-y-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Key Name / ID</label>
                            <input
                                type="text"
                                className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">QR Code / Tag</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    value={editQrCode}
                                    onChange={(e) => setEditQrCode(e.target.value)}
                                    placeholder="Scan to fill..."
                                />
                                <button
                                    type="button"
                                    onClick={() => setIsEditScannerOpen(true)}
                                    className="rounded-lg bg-gray-200 px-3 py-2 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                                >
                                    📷
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={cancelEditing}
                                className="w-full rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={loading || !editName.trim()}
                                className="w-full rounded-lg bg-blue-600 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700"
                            >
                                {loading ? "Saving..." : "Save Changes"}
                            </button>
                        </div>

                        <QRScannerModal
                            isOpen={isEditScannerOpen}
                            onClose={() => setIsEditScannerOpen(false)}
                            onScan={(code) => {
                                setEditQrCode(code);
                                setIsEditScannerOpen(false);
                            }}
                        />
                    </div>
                ) : isMissing ? (
                    /* MISSING VIEW */
                    <div className="space-y-4">
                        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-300 space-y-2">
                            <div className="flex justify-between">
                                <span className="font-bold">Missing Since:</span>
                                <span>{meta.missingSince ? meta.missingSince.toDate().toLocaleString() : "N/A"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-bold">Last Holder:</span>
                                <span>{meta.currentHolder || "Unknown"}</span>
                            </div>
                            <div className="pt-2 border-t border-red-200 dark:border-red-800">
                                <span className="font-bold block mb-1">Reason:</span>
                                <p className="italic">{meta.missingReason}</p>
                            </div>
                        </div>

                        <button
                            onClick={handleReturn}
                            disabled={loading}
                            className="w-full rounded-lg bg-green-600 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-300 disabled:opacity-50 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800"
                        >
                            {loading ? "Processing..." : `${assetLabel} Found - Return to Stock`}
                        </button>
                    </div>
                ) : isAvailable ? (
                    /* CHECK OUT FORM */
                    <form onSubmit={handleCheckOut} className="space-y-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Person Name</label>
                            <input
                                type="text"
                                required
                                className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                                placeholder="John Doe"
                                value={holderName}
                                onChange={(e) => setHolderName(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Company / Dept</label>
                            <input
                                type="text"
                                className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                                placeholder="e.g. Acme Corp / Maintenance"
                                value={holderCompany}
                                onChange={(e) => setHolderCompany(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Expected Duration</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button type="button" onClick={() => setDuration("1_HOUR")} className={`p-2 text-xs rounded-lg border font-medium ${duration === "1_HOUR" ? "bg-blue-100 border-blue-500 text-blue-700" : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500 text-gray-500 dark:text-white"}`}>1 Hour</button>
                                <button type="button" onClick={() => setDuration("4_HOURS")} className={`p-2 text-xs rounded-lg border font-medium ${duration === "4_HOURS" ? "bg-blue-100 border-blue-500 text-blue-700" : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500 text-gray-500 dark:text-white"}`}>4 Hours</button>
                                <button type="button" onClick={() => setDuration("EOD")} className={`p-2 text-xs rounded-lg border font-medium ${duration === "EOD" ? "bg-blue-100 border-blue-500 text-blue-700" : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500 text-gray-500 dark:text-white"}`}>End of Day</button>
                                <button type="button" onClick={() => setDuration("INDEFINITE")} className={`p-2 text-xs rounded-lg border font-medium ${duration === "INDEFINITE" ? "bg-blue-100 border-blue-500 text-blue-700" : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500 text-gray-500 dark:text-white"}`}>Indefinite</button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-lg bg-blue-600 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
                        >
                            {loading ? "Processing..." : "Confirm Check Out"}
                        </button>

                        <div className="pt-2 border-t border-gray-100 dark:border-gray-700 mt-4">
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="text-xs text-red-500 hover:text-red-700 underline"
                            >
                                Remove this {assetLabel.toLowerCase()} permanently
                            </button>
                        </div>
                    </form>
                ) : isReportingMissing ? (
                    /* MISSING REPORT FORM */
                    <div className="space-y-4">
                        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-300">
                            <p className="font-bold">Report Missing {assetLabel}</p>
                            <p>Please provide details about how this {assetLabel.toLowerCase()} was lost.</p>
                        </div>
                        <textarea
                            className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:ring-red-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            rows={3}
                            placeholder="e.g. Lost by contractor John Smith on site..."
                            value={missingReason}
                            onChange={(e) => setMissingReason(e.target.value)}
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsReportingMissing(false)}
                                className="w-full rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmReportMissing}
                                disabled={loading || !missingReason.trim()}
                                className="w-full rounded-lg bg-red-600 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-300 disabled:opacity-50 dark:bg-red-600 dark:hover:bg-red-700"
                            >
                                {loading ? "Reporting..." : "Confirm Missing"}
                            </button>
                        </div>
                    </div>
                ) : (
                    /* RETURN / ACTION MENU */
                    <div className="space-y-4">
                        <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 space-y-1">
                            <p>Current Holder: <span className="font-bold">{meta.currentHolder}</span></p>
                            <p>Time Out: <span className="font-medium">
                                {(() => {
                                    // Check root first (where service writes it), then metadata (legacy/fallback)
                                    const val = (keyItem as any).checkedOutAt || meta.checkedOutAt;

                                    if (!val) return "Unknown";
                                    // Handle Firestore Timestamp (has toDate)
                                    if (typeof val.toDate === 'function') return val.toDate().toLocaleString("en-GB");
                                    // Handle Serializable Timestamp ({ seconds, nanoseconds })
                                    if (val.seconds) return new Date(val.seconds * 1000).toLocaleString("en-GB");
                                    // Handle Date object
                                    if (val instanceof Date) return val.toLocaleString("en-GB");
                                    return "Unknown";
                                })()}
                            </span></p>
                            <p>Due: <span className="font-medium">{meta.dueDate ? meta.dueDate.toDate().toLocaleString("en-GB") : "Indefinite"}</span></p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={handleReturn}
                                disabled={loading}
                                className="col-span-2 rounded-lg bg-green-600 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-300 disabled:opacity-50 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800"
                            >
                                Return {assetLabel}
                            </button>
                            <button
                                onClick={() => setIsReportingMissing(true)}
                                disabled={loading}
                                className="rounded-lg border border-red-200 bg-white px-5 py-2.5 text-center text-sm font-medium text-red-600 hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:opacity-50 dark:border-red-900 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-900/20"
                            >
                                Report Missing
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={loading}
                                className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-center text-sm font-medium text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-100 disabled:opacity-50 dark:border-gray-700 dark:bg-transparent dark:text-gray-400 dark:hover:bg-gray-800"
                            >
                                Remove {assetLabel}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
