"use client";

import React, { useState, useEffect, useRef } from "react";
import { useInventory } from "@/contexts/InventoryContext";
import { KeyItem, Asset } from "@/types";
import { updateKeyAuditDate, createAudit } from "@/lib/firestore/services";
import { Timestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Hardcoded for MVP
const CURRENT_ORG_ID = "DEMO_ORG_1";

export default function AuditPage() {
    const { assets, keys, loading } = useInventory();
    const { user } = useAuth();

    // Audit State
    const [auditStartedAt] = useState(Timestamp.now());
    const [submitting, setSubmitting] = useState(false);

    // Key Logic: Group keys by ShortCode (or ID if no ShortCode)
    // Map<ShortCode, KeyItem[]>
    const [groupedKeys, setGroupedKeys] = useState<Record<string, KeyItem[]>>({});

    // User Entry: Map<ShortCode, Count>
    const [enteredCounts, setEnteredCounts] = useState<Record<string, number>>({});

    useEffect(() => {
        if (loading) return;

        // Filter valid keys for audit (Available only)
        const expectedKeys = keys.filter(k => k.status === "AVAILABLE");

        const groups: Record<string, KeyItem[]> = {};
        expectedKeys.forEach(k => {
            const code = k.shortCode || k.id;
            if (!groups[code]) groups[code] = [];
            groups[code].push(k);
        });

        setGroupedKeys(groups);
    }, [keys, loading]);

    const handleCountChange = (code: string, countStr: string) => {
        const count = parseInt(countStr) || 0;
        setEnteredCounts(prev => ({
            ...prev,
            [code]: count
        }));
    };

    const handleQuickVerify = (code: string) => {
        // Sets the entered count to the expected count (Quick action)
        const expected = groupedKeys[code]?.length || 0;
        handleCountChange(code, expected.toString());
    }

    const handleFinishAudit = async () => {
        if (!confirm("Are you sure you want to submit this audit? Missing items will be logged.")) return;

        setSubmitting(true);
        try {
            const missingKeys: string[] = [];

            // 1. Process each group
            for (const [code, items] of Object.entries(groupedKeys)) {
                const entered = enteredCounts[code] || 0;
                const expected = items.length;

                // If entered < expected, mark the difference as missing
                // We verify 'entered' amount of keys. 
                // Which specific keys? We don't know distinctive which is which if shortCode is same.
                // Strategy: Mark the first N as verified/audited. Mark the rest as missing.

                // Sort items to be deterministic? (by ID)
                const sortedItems = [...items].sort((a, b) => a.id.localeCompare(b.id));

                for (let i = 0; i < sortedItems.length; i++) {
                    const key = sortedItems[i];
                    if (i < entered) {
                        // Verified
                        // Fire and forget update
                        updateKeyAuditDate(CURRENT_ORG_ID, key.id).catch(console.error);
                    } else {
                        // Missing
                        missingKeys.push(key.id);
                    }
                }
            }

            // Create Audit Record
            await createAudit(CURRENT_ORG_ID, {
                date: Timestamp.now(),
                performedBy: user?.uid || "Unknown",
                missingKeys
            });

            // Generate PDF Report
            const doc = new jsPDF();
            doc.text("Audit Report", 14, 20);
            doc.setFontSize(10);
            doc.text(`Date: ${new Date().toLocaleString("en-GB")}`, 14, 30);
            doc.text(`Performed By: ${user?.displayName || user?.email || "Unknown"}`, 14, 35);
            doc.text(`Total Expected: ${totalExpected}`, 14, 45);
            doc.text(`Total Counted: ${totalEntered}`, 14, 50);

            // Missing Keys Table
            if (missingKeys.length > 0) {
                doc.setTextColor(255, 0, 0);
                doc.text(`Missing Keys: ${missingKeys.length}`, 14, 60);
                doc.setTextColor(0, 0, 0);

                const missingData: any[] = [];
                missingKeys.forEach(id => {
                    // Find key details
                    const k = keys.find(key => key.id === id);
                    if (k) {
                        missingData.push([k.shortCode, k.id, k.assetName, k.area]);
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

            // Explicitly handle download via Blob
            const pdfBlob = doc.output("blob");
            const url = URL.createObjectURL(pdfBlob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `audit-report-${new Date().toISOString().slice(0, 10)}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            alert(`Audit Submitted. ${missingKeys.length} keys marked as missing. Report downloaded.`);
            window.location.href = "/";
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
        <div className="mx-auto max-w-4xl space-y-8 p-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold dark:text-white">Audit Mode</h1>
                    <p className="text-sm text-gray-500">Enter the physical count for each key quantity.</p>
                </div>
                <div className="text-sm text-gray-500">
                    Started: {auditStartedAt.toDate().toLocaleTimeString()}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
                <div className="rounded-lg bg-gray-100 p-4 dark:bg-gray-700">
                    <div className="text-2xl font-bold dark:text-white">{totalExpected}</div>
                    <div className="text-xs text-gray-500">Total Expected</div>
                </div>
                <div className="rounded-lg bg-blue-100 p-4 dark:bg-blue-900/30">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalEntered}</div>
                    <div className="text-xs text-blue-600 dark:text-blue-400">Counted</div>
                </div>
                <div className={`rounded-lg p-4 ${totalExpected === totalEntered ? "bg-green-100 dark:bg-green-900/30 text-green-600" : "bg-red-100 dark:bg-red-900/30 text-red-600"}`}>
                    <div className="text-2xl font-bold">{totalExpected - totalEntered}</div>
                    <div className="text-xs">Diff</div>
                </div>
            </div>

            {/* List */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="grid grid-cols-12 gap-4 border-b border-gray-200 bg-gray-50 p-4 font-medium text-gray-500 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-300">
                    <div className="col-span-2">Key ID</div>
                    <div className="col-span-5">Asset / Location</div>
                    <div className="col-span-2 text-center">Expected</div>
                    <div className="col-span-3 text-center">Counted</div>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {Object.entries(groupedKeys).sort((a, b) => a[0].localeCompare(b[0])).map(([code, items]) => {
                        const expected = items.length;
                        const entered = enteredCounts[code] || 0;
                        const isMatch = entered === expected;
                        const isOver = entered > expected;

                        // Collect asset names uniquely
                        const assetNames = Array.from(new Set(items.map(k => k.assetName))).join(", ");

                        return (
                            <div key={code} className={`grid grid-cols-12 gap-4 items-center p-4 transition-colors ${isMatch ? "bg-green-50/50 dark:bg-green-900/10" : ""}`}>
                                <div className="col-span-2">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                                        {code}
                                    </div>
                                </div>
                                <div className="col-span-5">
                                    <h4 className="font-medium text-gray-900 dark:text-white">{assetNames}</h4>
                                    <p className="text-xs text-gray-500">{items[0]?.area}</p>
                                </div>
                                <div className="col-span-2 text-center font-medium text-gray-600 dark:text-gray-400">
                                    {expected}
                                </div>
                                <div className="col-span-3 flex items-center justify-center gap-2">
                                    <input
                                        type="number"
                                        min="0"
                                        className={`w-16 rounded-lg border text-center p-2 font-bold focus:ring-2 outline-none ${isMatch ? "border-green-500 text-green-600 bg-green-50 dark:bg-green-900/20" :
                                            isOver ? "border-red-500 text-red-600 bg-red-50 dark:bg-red-900/20" :
                                                entered > 0 ? "border-yellow-500 text-yellow-600" :
                                                    "border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                            }`}
                                        value={enteredCounts[code] || ""}
                                        onChange={(e) => handleCountChange(code, e.target.value)}
                                        placeholder="0"
                                    />
                                    {/* Quick action button checkmark */}
                                    <button
                                        onClick={() => handleQuickVerify(code)}
                                        className="rounded-full p-2 text-gray-400 hover:bg-green-100 hover:text-green-600 dark:hover:bg-green-900/30"
                                        title="Mark all present"
                                    >
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Actions */}
            <div className="sticky bottom-4 z-20 flex justify-end">
                <button
                    onClick={handleFinishAudit}
                    disabled={submitting}
                    className="rounded-xl bg-gray-900 px-8 py-3 font-semibold text-white shadow-xl hover:bg-gray-800 focus:outline-none focus:ring-4 focus:ring-gray-300 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                >
                    {submitting ? "Submitting..." : "Finish & Submit Audit"}
                </button>
            </div>
        </div>
    );
}
