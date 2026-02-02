"use client";

import React, { useState, useEffect } from "react";
import { useInventory } from "@/contexts/InventoryContext";
import { KeyItem, Audit } from "@/types";
import { updateKeyAuditDate, createAudit, subscribeToAudits } from "@/lib/firestore/services";
import { Timestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function AuditPage() {
    const { assets, keys, loading } = useInventory();
    const { user, profile } = useAuth();

    // Tabs
    const [activeTab, setActiveTab] = useState<"NEW" | "HISTORY">("NEW");

    // Audit State
    const [auditStartedAt] = useState(Timestamp.now());
    const [submitting, setSubmitting] = useState(false);

    // Key Logic: Group keys by ShortCode (or ID if no ShortCode)
    const [groupedKeys, setGroupedKeys] = useState<Record<string, KeyItem[]>>({});
    const [enteredCounts, setEnteredCounts] = useState<Record<string, number>>({});

    // History State
    const [audits, setAudits] = useState<Audit[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // --- Data Prep for New Audit ---
    useEffect(() => {
        if (loading) return;
        const expectedKeys = keys.filter(k => k.status === "AVAILABLE");
        const groups: Record<string, KeyItem[]> = {};

        expectedKeys.forEach(k => {
            const code = k.metaData?.keyCode || k.id;
            if (!groups[code]) groups[code] = [];
            groups[code].push(k);
        });
        setGroupedKeys(groups);
    }, [keys, loading]);

    // --- Fetch History ---
    useEffect(() => {
        if (activeTab === "HISTORY" && profile?.orgId) {
            setLoadingHistory(true);
            const unsubscribe = subscribeToAudits(profile.orgId, (data) => {
                setAudits(data);
                setLoadingHistory(false);
            }, (err) => {
                console.error(err);
                setLoadingHistory(false);
            });
            return () => unsubscribe();
        }
    }, [activeTab, profile?.orgId]);


    // --- Handlers ---

    const handleCountChange = (code: string, countStr: string) => {
        const count = parseInt(countStr) || 0;
        setEnteredCounts(prev => ({ ...prev, [code]: count }));
    };

    const handleQuickVerify = (code: string) => {
        const expected = groupedKeys[code]?.length || 0;
        handleCountChange(code, expected.toString());
    }

    const generateAndDownloadPDF = (auditData: {
        date: Date,
        performedBy: string,
        totalExpected: number,
        totalCounted: number,
        missingKeys: string[] // IDs
    }) => {
        const doc = new jsPDF();
        doc.text("Audit Report", 14, 20);
        doc.setFontSize(10);
        doc.text(`Date: ${auditData.date.toLocaleString("en-GB")}`, 14, 30);
        doc.text(`Performed By: ${auditData.performedBy}`, 14, 35);
        doc.text(`Total Expected: ${auditData.totalExpected}`, 14, 45); // Note: Expected at time of audit usually not stored, so we might need to approximate or just show Missing
        doc.text(`Total Counted: ${auditData.totalCounted}`, 14, 50);

        if (auditData.missingKeys.length > 0) {
            doc.setTextColor(255, 0, 0);
            doc.text(`Missing Keys: ${auditData.missingKeys.length}`, 14, 60);
            doc.setTextColor(0, 0, 0);

            const missingData: (string | number | null)[][] = [];
            auditData.missingKeys.forEach(id => {
                // Try to find key in current inventory to get details
                // Note: If key was deleted since audit, this might be partial data
                const k = keys.find(key => key.id === id);
                if (k) {
                    // Try to resolve asset name
                    const assetName = assets.find(a => a.id === (k.metaData?.assetId))?.name || k.metaData?.assetId || '-';
                    missingData.push([k.metaData?.keyCode || k.id, k.id, assetName, k.area || k.metaData?.location || '-']);
                } else {
                    missingData.push(['Unknown', id, '-', '-']);
                }
            });

            autoTable(doc, {
                startY: 65,
                head: [['Key Code', 'Key ID', 'Asset', 'Area']],
                body: missingData,
                theme: 'striped'
            });
        } else {
            doc.setTextColor(0, 128, 0);
            doc.text("All keys accounted for.", 14, 60);
        }

        doc.save(`audit-report-${auditData.date.toISOString().slice(0, 10)}.pdf`);
    };

    const handleFinishAudit = async () => {
        if (!confirm("Are you sure you want to submit this audit? Missing items will be logged.")) return;

        setSubmitting(true);
        try {
            const missingKeys: string[] = [];
            let verifiedCount = 0;

            for (const [code, items] of Object.entries(groupedKeys)) {
                const entered = enteredCounts[code] || 0;
                verifiedCount += entered;

                const sortedItems = [...items].sort((a, b) => a.id.localeCompare(b.id));

                for (let i = 0; i < sortedItems.length; i++) {
                    const key = sortedItems[i];
                    if (i < entered) {
                        if (profile?.orgId) updateKeyAuditDate(profile.orgId, key.id).catch(console.error);
                    } else {
                        missingKeys.push(key.id);
                    }
                }
            }

            if (profile?.orgId) {
                await createAudit(profile.orgId, {
                    date: Timestamp.now(),
                    performedBy: user?.displayName || user?.email || "Unknown",
                    missingKeys
                });
            }

            const totalExpected = Object.values(groupedKeys).reduce((acc, curr) => acc + curr.length, 0);

            generateAndDownloadPDF({
                date: new Date(),
                performedBy: user?.displayName || user?.email || "Unknown",
                totalExpected,
                totalCounted: verifiedCount,
                missingKeys
            });

            alert(`Audit Submitted. ${missingKeys.length} keys marked as missing.`);
            window.location.reload();
        } catch (err) {
            console.error(err);
            alert("Failed to submit audit.");
        } finally {
            setSubmitting(false);
        }
    };



    if (loading) return <div className="p-10 text-center">Loading Inventory...</div>;

    const totalExpected = Object.values(groupedKeys).reduce((acc, curr) => acc + curr.length, 0);
    const totalEntered = Object.values(enteredCounts).reduce((acc, curr) => acc + curr, 0);

    return (
        <div className="mx-auto max-w-5xl space-y-6 p-6">
            <h1 className="text-3xl font-bold dark:text-white">Audit Center</h1>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab("NEW")}
                        className={`border-b-2 py-4 px-1 text-sm font-medium ${activeTab === "NEW"
                            ? "border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                            : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                            }`}
                    >
                        New Audit
                    </button>
                    <button
                        onClick={() => setActiveTab("HISTORY")}
                        className={`border-b-2 py-4 px-1 text-sm font-medium ${activeTab === "HISTORY"
                            ? "border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                            : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                            }`}
                    >
                        Previous Audits
                    </button>
                </nav>
            </div>

            {/* NEW AUDIT VIEW */}
            {activeTab === "NEW" && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500">Compare physical stock against system records.</p>
                        <div className="text-sm text-gray-500">
                            Session Started: {auditStartedAt.toDate().toLocaleTimeString()}
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="rounded-xl bg-gray-50 p-4 border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
                            <div className="text-2xl font-bold dark:text-white">{totalExpected}</div>
                            <div className="text-xs text-gray-500">Expected Keys</div>
                        </div>
                        <div className="rounded-xl bg-blue-50 p-4 border border-blue-100 dark:bg-blue-900/20 dark:border-blue-900/50">
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalEntered}</div>
                            <div className="text-xs text-blue-600 dark:text-blue-400">Counted So Far</div>
                        </div>
                        <div className={`rounded-xl p-4 border ${totalExpected === totalEntered
                            ? "bg-green-50 border-green-100 text-green-700 dark:bg-green-900/20 dark:border-green-900/50"
                            : "bg-orange-50 border-orange-100 text-orange-700 dark:bg-orange-900/20 dark:border-orange-900/50"
                            }`}>
                            <div className="text-2xl font-bold">{totalExpected - totalEntered}</div>
                            <div className="text-xs">Outstanding Discrepancy</div>
                        </div>
                    </div>

                    {/* Audit Table */}
                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden dark:border-gray-700 dark:bg-gray-800">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase dark:bg-gray-900/50 dark:text-gray-400">
                                <tr>
                                    <th className="px-6 py-3 w-1/4">Key ID / Code</th>
                                    <th className="px-6 py-3 w-1/3">Key Name</th>
                                    <th className="px-6 py-3 text-center">Expected</th>
                                    <th className="px-6 py-3 text-center">Counted</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {Object.entries(groupedKeys)
                                    .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
                                    .map(([code, items]) => {
                                        const expected = items.length;
                                        const entered = enteredCounts[code] || 0;
                                        const isMatch = entered === expected;
                                        const isOver = entered > expected;

                                        // Get human readable asset names
                                        const keyNames = Array.from(new Set(items.map(k => k.name))).join(", ");
                                        const parentAssets = Array.from(new Set(items.map(k => {
                                            if (k.metaData?.assetId) {
                                                const asset = assets.find(a => a.id === k.metaData?.assetId);
                                                return asset ? asset.name : null;
                                            }
                                            return null;
                                        }).filter(Boolean))).join(", ");

                                        const location = items[0]?.area || items[0]?.metaData?.location;

                                        return (
                                            <tr key={code} className={`transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${isMatch ? "bg-green-50/30 dark:bg-green-900/5" : ""}`}>
                                                <td className="px-6 py-4">
                                                    <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-sm font-bold text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                                        {code}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-gray-900 dark:text-white">{keyNames}</div>
                                                    {parentAssets && <div className="text-xs text-gray-500">Opens: {parentAssets}</div>}
                                                    {location && <div className="text-xs text-gray-500">Location: {location}</div>}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-lg font-semibold text-gray-600 dark:text-gray-400">{expected}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            className={`w-20 rounded-lg border text-center p-2 font-bold focus:ring-2 outline-none ${isMatch ? "border-green-500 text-green-600 bg-green-50 dark:bg-green-900/20" :
                                                                isOver ? "border-red-500 text-red-600 bg-red-50 dark:bg-red-900/20" :
                                                                    entered > 0 ? "border-orange-400 text-orange-600 bg-orange-50" :
                                                                        "border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                                                }`}
                                                            value={enteredCounts[code] || ""}
                                                            onChange={(e) => handleCountChange(code, e.target.value)}
                                                            placeholder="0"
                                                        />
                                                        <button
                                                            onClick={() => handleQuickVerify(code)}
                                                            className="text-gray-400 hover:text-green-600 transition-colors"
                                                            title="Mark full count found"
                                                        >
                                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>

                    <div className="sticky bottom-4 z-20 flex justify-end">
                        <button
                            onClick={handleFinishAudit}
                            disabled={submitting}
                            className="rounded-xl bg-gray-900 px-8 py-3 font-semibold text-white shadow-xl hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-black"
                        >
                            {submitting ? "Submitting..." : "Finish & Submit Audit"}
                        </button>
                    </div>
                </div>
            )}

            {/* HISTORY VIEW */}
            {activeTab === "HISTORY" && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        {loadingHistory && <div className="p-8 text-center text-gray-500">Loading audit history...</div>}

                        {!loadingHistory && audits.length === 0 && (
                            <div className="p-12 text-center text-gray-500">
                                <p>No previous audits found.</p>
                            </div>
                        )}

                        {!loadingHistory && audits.length > 0 && (
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                                    <tr>
                                        <th className="p-4 font-medium text-gray-900 dark:text-white">Date</th>
                                        <th className="p-4 font-medium text-gray-900 dark:text-white">Performed By</th>
                                        <th className="p-4 font-medium text-gray-900 dark:text-white text-center">Missing Keys</th>
                                        <th className="p-4 font-medium text-gray-900 dark:text-white text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {audits.map((audit) => (
                                        <tr key={audit.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="p-4 text-gray-600 dark:text-gray-300">
                                                {audit.date?.toDate().toLocaleString() || "Unknown Date"}
                                            </td>
                                            <td className="p-4 text-gray-900 dark:text-white font-medium">
                                                {audit.performedBy}
                                            </td>
                                            <td className="p-4 text-center">
                                                {audit.missingKeys && audit.missingKeys.length > 0 ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                        {audit.missingKeys.length} Missing
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        None Missing
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={() => generateAndDownloadPDF({
                                                        date: audit.date.toDate(),
                                                        performedBy: audit.performedBy,
                                                        totalExpected: 0, // Not stored in history, so we pass 0 or maybe reconstruct if needed
                                                        totalCounted: 0,
                                                        missingKeys: audit.missingKeys || []
                                                    })}
                                                    className="text-blue-600 hover:text-blue-900 font-medium text-sm flex items-center justify-end gap-1 ml-auto"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                                    </svg>
                                                    Download Report
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
