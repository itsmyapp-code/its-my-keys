"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { doc, getDoc, setDoc, getDocs, collection, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { AssetService } from "@/lib/services/AssetService";

const SettingsPage = () => {
    const { user, profile } = useAuth();
    const [orgName, setOrgName] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    // Maintenance State
    const [auditMsg, setAuditMsg] = useState("");
    const [deleteAllLoading, setDeleteAllLoading] = useState(false);

    // Fetch Org Details
    useEffect(() => {
        const fetchOrg = async () => {
            if (!profile?.orgId) {
                setLoading(false);
                return;
            }
            try {
                const ref = doc(db, "organizations", profile.orgId);
                const snap = await getDoc(ref);
                if (snap.exists()) {
                    const data = snap.data();
                    setOrgName(data.name || "My Organization");
                } else {
                    setOrgName("My Organization");
                }
            } catch (err) {
                console.error("Failed to fetch org details", err);
            } finally {
                setLoading(false);
            }
        };
        fetchOrg();
    }, [profile?.orgId]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.orgId) {
            setMessage("Error: No Organization ID found.");
            return;
        }
        setSaving(true);
        setMessage("");

        try {
            const ref = doc(db, "organizations", profile.orgId);
            await setDoc(ref, {
                name: orgName,
            }, { merge: true });
            setMessage("Settings saved successfully.");
        } catch (err) {
            console.error(err);
            setMessage("Failed to save settings.");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAllAssets = async () => {
        if (!profile?.orgId) return;
        // 1. Initial Confirm
        if (!confirm("⚠️ DANGER: This will delete ALL assets, keys, and history for your organization.\n\nThis action cannot be undone.\n\nAre you sure you want to proceed?")) return;

        // 2. Secondary Confirmation
        const confirmation = prompt("To confirm deletion, please type 'DELETE' in the box below:");
        if (confirmation !== "DELETE") {
            alert("Deletion cancelled. Text did not match.");
            return;
        }

        setDeleteAllLoading(true);
        try {
            await AssetService.deleteAllAssets(profile.orgId);
            alert("All assets have been deleted.");
            window.location.reload(); // Reload to clear state/cache
        } catch (err: any) {
            console.error(err);
            alert("Failed to delete assets: " + err.message);
        } finally {
            setDeleteAllLoading(false);
        }
    };

    const handleExportData = async () => {
        if (!profile?.orgId) return;
        setAuditMsg("Exporting data...");
        try {
            // 1. Fetch Assets
            const assetsQ = query(collection(db, "assets"), where("orgId", "==", profile.orgId));
            const assetsSnap = await getDocs(assetsQ);
            const assets = assetsSnap.docs.map(d => d.data());

            // 2. Fetch Logs (Optional, but useful for full backup)
            const logsQ = query(collection(db, "logs"), where("orgId", "==", profile.orgId));
            const logsSnap = await getDocs(logsQ);
            const logs = logsSnap.docs.map(d => d.data());

            // 3. Construct JSON
            const exportData = {
                exportedAt: new Date().toISOString(),
                org_id: profile.orgId,
                stats: {
                    asset_count: assets.length,
                    log_count: logs.length
                },
                assets,
                logs
            };

            // 4. Download File
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `itsmykeys-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setAuditMsg(`Export complete! ${assets.length} assets, ${logs.length} logs.`);

        } catch (err: any) {
            console.error(err);
            setAuditMsg("Export failed: " + err.message);
        }
    };

    if (loading) return <div className="p-8">Loading settings...</div>;

    return (
        <div className="mx-auto max-w-2xl p-6">
            <h1 className="mb-8 text-2xl font-bold dark:text-white">Property Settings</h1>

            {/* Profile Section */}
            <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Your Profile</h2>
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                        {user?.email?.[0].toUpperCase() || "U"}
                    </div>
                    <div>
                        <p className="font-medium text-gray-900 dark:text-white">{user?.displayName || "User"}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
                        <p className="mt-1 text-xs text-gray-400">UID: {user?.uid}</p>
                    </div>
                </div>
            </div>

            {/* Organization Settings */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">General Settings</h2>
                <form onSubmit={handleSave} className="space-y-6">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
                            Property / Organization Name
                        </label>
                        <input
                            type="text"
                            value={orgName}
                            onChange={(e) => setOrgName(e.target.value)}
                            className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            placeholder="e.g. Sunset Apartments"
                        />
                    </div>

                    {message && (
                        <div className={`rounded-lg p-3 text-sm font-medium ${message.includes("success")
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                            }`}>
                            {message}
                        </div>
                    )}

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={saving}
                            className="rounded-lg bg-blue-700 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700"
                        >
                            {saving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>

            {/* Maintenance & Data Zone */}
            <div className="mt-8 grid gap-6">
                {/* Data Export */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Data Export</h2>
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500">Download a full JSON backup of all Assets and Logs.</p>
                        <button
                            onClick={handleExportData}
                            className="px-4 py-2 text-sm font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300"
                        >
                            Export JSON
                        </button>
                    </div>
                </div>

                {/* Maintenance Zone */}
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm dark:border-red-900/30 dark:bg-red-900/10">
                    <h2 className="mb-2 text-lg font-semibold text-red-700 dark:text-red-400">Maintenance Zone</h2>
                    <div className="flex flex-col gap-3">
                        {/* Delete All Data */}
                        <div className="flex items-center justify-between p-3 bg-red-100 rounded-lg border border-red-200 dark:bg-red-900/40 dark:border-red-800">
                            <div>
                                <h4 className="font-bold text-red-800 dark:text-red-300">Reset Data</h4>
                                <p className="text-xs text-red-700 dark:text-red-400">Permanently delete ALL assets and keys. Start fresh.</p>
                            </div>
                            <button
                                onClick={handleDeleteAllAssets}
                                disabled={deleteAllLoading}
                                className="px-3 py-1.5 text-xs font-bold text-white bg-red-600 border border-red-700 rounded shadow-sm hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500"
                            >
                                {deleteAllLoading ? "Deleting..." : "DELETE ALL DATA"}
                            </button>
                        </div>

                        {auditMsg && (
                            <div className="text-xs font-mono p-2 bg-gray-100 rounded dark:bg-gray-800 dark:text-gray-300">
                                {auditMsg}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
