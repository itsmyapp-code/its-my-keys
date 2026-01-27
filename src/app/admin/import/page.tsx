"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createAsset, createKey } from "@/lib/firestore/services";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Asset, AssetType, AssetStatus } from "@/types";

export default function ImportPage() {
    const { user, profile } = useAuth();
    const [csvContent, setCsvContent] = useState("");
    const [importing, setImporting] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [isClearing, setIsClearing] = useState(false);

    const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

    const handleClearDatabase = async () => {
        if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.includes("demo") &&
            !confirm("DANGER: This will delete ALL keys and assets for your organization. This cannot be undone. Are you sure?")) {
            return;
        }

        if (!profile?.orgId) return;

        setIsClearing(true);
        try {
            // Dynamically import to avoid circular dep issues or just use Service
            // We need to use AssetService here, but first we need to export it properly or import it
            // Assuming AssetService is available via import
            const { AssetService } = await import("@/lib/services/AssetService");
            await AssetService.deleteAllAssets(profile.orgId);
            addLog("Database cleared successfully.");
            alert("All assets have been deleted.");
        } catch (err: any) {
            console.error(err);
            addLog(`Error clearing database: ${err.message}`);
        } finally {
            setIsClearing(false);
        }
    };

    const handleImport = async () => {
        if (!csvContent.trim()) return;
        if (!profile?.orgId) {
            addLog("Error: Organization ID not found. Please sign in.");
            return;
        }

        setImporting(true);
        setLogs([]);
        addLog("Starting import...");

        try {
            const lines = csvContent.split("\n").map(l => l.trim()).filter(l => l && !l.toLowerCase().startsWith("key id"));

            // 1. Parse: Key ID, Asset Name, Location, Quantity
            const rows = lines.map(line => {
                // Split by comma, but be careful with quotes if needed (simple split for now)
                const [key_id, asset_name, location, qtyStr] = line.split(",").map(c => c.trim());
                const quantity = parseInt(qtyStr) || 1;
                return { key_id, asset_name, location: location || asset_name, quantity };
            }).filter(r => r.key_id && r.asset_name);

            addLog(`Parsed ${rows.length} rows to process.`);

            // 2. Pre-fetch Assets
            const { AssetService } = await import("@/lib/services/AssetService");
            const assetMap = new Map<string, { id: string }>();

            // Get existing assets to avoid duplicates or to link
            const existingAssets = await AssetService.getAssetsByOrg(profile.orgId);
            existingAssets.forEach(a => {
                if (a.name) assetMap.set(a.name.toLowerCase(), { id: a.id });
            });

            // 3. Process
            let createdKeysCount = 0;
            let createdAssetsCount = 0;

            for (const row of rows) {
                let assetId = "";

                // Find or Create Parent Asset (The Lock/Door)
                if (assetMap.has(row.asset_name.toLowerCase())) {
                    const a = assetMap.get(row.asset_name.toLowerCase())!;
                    assetId = a.id;
                } else {
                    // Create Asset
                    addLog(`Creating new asset: ${row.asset_name}`);
                    const newAsset = await AssetService.createAsset({
                        orgId: profile.orgId,
                        name: row.asset_name,
                        area: row.location,
                        type: AssetType.FACILITY, // Use FACILITY for these generic parents so they don't clog up the Rentals list
                        status: AssetStatus.AVAILABLE,
                        totalKeys: row.quantity,
                        metaData: {}
                    });
                    assetId = newAsset.id;
                    assetMap.set(row.asset_name.toLowerCase(), { id: assetId });
                    createdAssetsCount++;
                }

                // Create Keys
                addLog(`Creating ${row.quantity} keys for ${row.key_id}...`);
                for (let i = 0; i < row.quantity; i++) {
                    await AssetService.createAsset({
                        orgId: profile.orgId,
                        name: row.key_id, // Use the Tag as the name
                        type: AssetType.KEY,
                        status: AssetStatus.AVAILABLE,
                        area: row.location,
                        metaData: {
                            keyCode: row.key_id,
                            assetId: assetId,
                            location: row.location,
                            loanType: "STANDARD",
                        }
                    });
                    createdKeysCount++;
                }
            }

            addLog(`Successfully imported ${createdAssetsCount} Assets and ${createdKeysCount} Keys.`);
        } catch (err: any) {
            console.error(err);
            addLog(`Error: ${err.message}`);
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className="mx-auto max-w-3xl p-6">
            <h1 className="mb-4 text-2xl font-bold dark:text-white">Import Keys (CSV)</h1>

            <div className="mb-6 flex justify-end">
                <button
                    onClick={handleClearDatabase}
                    disabled={isClearing || importing}
                    className="text-sm text-red-600 hover:text-red-800 underline disabled:opacity-50"
                >
                    {isClearing ? "Clearing..." : "Clear All Data (Reset)"}
                </button>
            </div>

            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                Paste CSV content. Format: <code>Key ID, Name, Location, Quantity</code>
            </p>

            <div className="mb-4">
                <textarea
                    className="h-64 w-full rounded-lg border border-gray-300 p-4 font-mono text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    value={csvContent}
                    onChange={e => setCsvContent(e.target.value)}
                    placeholder={`A1, Bedroom 1, 58 Victoria Road, 5\nMAS, Master Key, 58 Victoria Road, 4`}
                />
            </div>

            <button
                onClick={handleImport}
                disabled={importing || isClearing}
                className="rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
                {importing ? "Importing..." : "Run Import"}
            </button>

            <div className="mt-8 rounded-xl border border-blue-100 bg-blue-50 p-6 dark:border-blue-900/30 dark:bg-blue-900/10">
                <h3 className="mb-2 font-bold text-blue-900 dark:text-blue-100">How to Import Keys</h3>
                <ul className="list-disc space-y-2 pl-5 text-sm text-blue-800 dark:text-blue-200">
                    <li>
                        <strong>Format:</strong> Data must be Comma Separated (CSV).
                    </li>
                    <li>
                        <strong>Columns:</strong> <code>Key ID, Name, Location, Quantity</code>
                    </li>
                    <li>
                        <strong>Example:</strong> <code>A1, Bedroom 1, 58 Victoria Road, 5</code>
                    </li>
                    <li>
                        This will create 1 Asset ("Bedroom 1") and 5 Keys (all with tag "A1") linked to it.
                    </li>
                </ul>
            </div>

            <div className="mt-6 rounded-lg bg-gray-100 p-4 dark:bg-gray-900">
                <h3 className="mb-2 font-bold text-gray-700 dark:text-gray-300">Logs</h3>
                <div className="max-h-48 overflow-y-auto font-mono text-xs text-gray-600 dark:text-gray-400">
                    {logs.map((l, i) => <div key={i}>{l}</div>)}
                    {logs.length === 0 && <div>Ready to import.</div>}
                </div>
            </div>
        </div>
    );
}
