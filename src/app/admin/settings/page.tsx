"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

const SettingsPage = () => {
    const { user, profile } = useAuth();
    const [orgName, setOrgName] = useState("");
    const [visibility, setVisibility] = useState({
        keys: true,
        itDevices: true,
        vehicles: true,
        rentals: true
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

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
                    if (data.settings?.dashboardVisibility) {
                        setVisibility(data.settings.dashboardVisibility);
                    }
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
                settings: {
                    dashboardVisibility: visibility
                }
            }, { merge: true });
            setMessage("Settings saved successfully.");
        } catch (err) {
            console.error(err);
            setMessage("Failed to save settings.");
        } finally {
            setSaving(false);
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
        </div>
    );
};

export default SettingsPage;
