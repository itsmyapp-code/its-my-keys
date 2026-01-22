"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createAsset, createKey } from "@/lib/firestore/services";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Asset } from "@/types";

export default function ImportPage() {
    const { user, profile } = useAuth();
    const [csvContent, setCsvContent] = useState("");
    const [importing, setImporting] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

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
            const lines = csvContent.split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("key_id"));

            // 1. Parse
            const rows = lines.map(line => {
                const [key_id, asset_name, area, color] = line.split(",").map(c => c.trim());
                return { key_id, asset_name, area };
            }).filter(r => r.key_id && r.asset_name);

            addLog(`Parsed ${rows.length} rows to process.`);

            // 2. Pre-fetch Assets
            // Filter by OrgId
            const assetsSnapshot = await getDocs(query(collection(db, "assets"), where("orgId", "==", profile.orgId)));
            const assetMap = new Map<string, { id: string }>();
            assetsSnapshot.forEach(doc => {
                const d = doc.data() as Asset;
                if (d.name) assetMap.set(d.name.toLowerCase(), { id: doc.id });
            });

            // 3. Process
            let createdCount = 0;
            for (const row of rows) {
                let assetId = "";

                if (assetMap.has(row.asset_name.toLowerCase())) {
                    const a = assetMap.get(row.asset_name.toLowerCase())!;
                    assetId = a.id;
                } else {
                    // Create Asset
                    addLog(`Creating new asset: ${row.asset_name}`);
                    const res = await createAsset(profile.orgId, {
                        name: row.asset_name,
                        area: row.area || "General",
                        type: "KEY", // Assuming these are doors for keys
                        status: "AVAILABLE",
                        metaData: {},
                        searchKeywords: [row.asset_name],
                        createdAt: Timestamp.now(),
                        updatedAt: Timestamp.now()
                    } as any); // Casting as Asset, creating without ID first
                    assetId = res.id;
                    assetMap.set(row.asset_name.toLowerCase(), { id: assetId });
                }

                // Create Key
                // Allow multiples (same code is fine)
                await createKey(profile.orgId, {
                    name: row.key_id, // Use name for the visual ID on the key
                    type: "KEY",
                    status: "AVAILABLE",
                    metaData: {
                        keyCode: row.key_id,
                        assetId: assetId,
                        location: row.area || "General",
                        loanType: "STANDARD",
                    },
                    searchKeywords: [row.key_id, row.asset_name],
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now()
                } as any);

                createdCount++;
            }

            addLog(`Successfully imported ${createdCount} keys.`);
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
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                Paste CSV content. Format: <code>key_id, asset_name, area, color</code>
            </p>

            <div className="mb-4">
                <textarea
                    className="h-64 w-full rounded-lg border border-gray-300 p-4 font-mono text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    value={csvContent}
                    onChange={e => setCsvContent(e.target.value)}
                    placeholder={`101, Main Entrance, Block A, Red\n102, Main Entrance, Block A, Red\n205, Server Room, Block B, Blue`}
                />
            </div>

            <button
                onClick={handleImport}
                disabled={importing}
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
                        <strong>Columns:</strong> <code>Key ID, Asset Name, Area</code>
                    </li>
                    <li>
                        <strong>Example:</strong> <code>101, Front Door, Lobby</code>
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
