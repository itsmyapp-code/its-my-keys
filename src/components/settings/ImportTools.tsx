"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AssetType, AssetStatus } from "@/types";

export function ImportTools() {
    const { user, profile } = useAuth();
    const [csvContent, setCsvContent] = useState("");
    const [importing, setImporting] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [importType, setImportType] = useState<'KEYS' | 'ASSETS' | 'MEMBERS'>('KEYS');

    const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

    const importMembers = async (lines: string[]) => {
        // Format: Email, Name, Role
        const { TeamService } = await import("@/lib/services/TeamService");

        for (const line of lines) {
            const [email, name, roleStr] = line.split(",").map(s => s.trim());
            if (!email) continue;

            // Map role string to Role type
            let role: any = "WORKER";
            if (roleStr?.toUpperCase() === "ADMIN") role = "ORG_ADMIN";
            if (roleStr?.toUpperCase() === "MANAGER") role = "MANAGER";
            if (roleStr?.toUpperCase() === "USER") role = "USER";

            try {
                addLog(`Inviting ${email} as ${role}...`);
                await TeamService.inviteMember(email, role, profile!.orgId);
                addLog(`Success: ${email}`);
            } catch (err: any) {
                addLog(`Failed ${email}: ${err.message}`);
            }
        }
    };

    const importAssets = async (lines: string[], type: 'KEYS' | 'ASSETS') => {
        const { AssetService } = await import("@/lib/services/AssetService");

        // Asset Map to avoid creating duplicates
        const assetMap = new Map<string, { id: string }>();
        const existingAssets = await AssetService.getAssetsByOrg(profile!.orgId);
        existingAssets.forEach(a => {
            if (a.name) assetMap.set(a.name.toLowerCase(), { id: a.id });
        });

        let createdCount = 0;

        for (const line of lines) {
            if (type === 'KEYS') {
                // Key Format: Key ID, Name, Location, Quantity, [QR Code], [Key Type], [Notes], [Master System], [Supplier]
                const [key_id, asset_name, location, qtyStr, qr_code, key_type, notes, master_system, supplier] = line.split(",").map(c => c.trim());
                if (!key_id || !asset_name) continue;

                const quantity = parseInt(qtyStr) || 1;
                let assetId = "";

                // Find or Create Parent Asset
                if (assetMap.has(asset_name.toLowerCase())) {
                    assetId = assetMap.get(asset_name.toLowerCase())!.id;
                } else {
                    addLog(`Creating Facility: ${asset_name}`);
                    const newAsset = await AssetService.createAsset({
                        orgId: profile!.orgId,
                        name: asset_name,
                        area: location || asset_name,
                        type: AssetType.FACILITY,
                        status: AssetStatus.AVAILABLE,
                        totalKeys: quantity,
                        metaData: {}
                    });
                    assetId = newAsset.id;
                    assetMap.set(asset_name.toLowerCase(), { id: assetId });
                }

                addLog(`Creating ${quantity} keys for tag ${key_id}...`);
                const isMaster = ['yes', 'true', 'y'].includes(master_system?.toLowerCase() || "");

                for (let i = 0; i < quantity; i++) {
                    // Fuzzy Key Type Matching
                    let typeToSave = "EURO_LOCK";
                    const t = key_type?.toUpperCase() || "";
                    if (t.includes("EURO")) typeToSave = "EURO_LOCK";
                    else if (t.includes("CYLINDER")) typeToSave = "CYLINDER";
                    else if (t.includes("PADLOCK")) typeToSave = "PADLOCK";
                    else if (t.includes("ELECTRONIC")) typeToSave = "ELECTRONIC";
                    else if (['OTHER', 'MORTICE', 'RIM'].some(x => t.includes(x))) typeToSave = "OTHER";

                    await AssetService.createAsset({
                        orgId: profile!.orgId,
                        name: asset_name, // Use the Name from CSV, not the ID
                        type: AssetType.KEY,
                        status: AssetStatus.AVAILABLE,
                        area: location,
                        metaData: {
                            keyCode: key_id, // Store tag in keyCode
                            assetId: assetId,
                            location: location,
                            loanType: "STANDARD",
                        },
                        qrCode: qr_code || undefined,
                        // New Fields
                        keyType: typeToSave as any,
                        notes: notes || undefined,
                        isMasterSystem: isMaster,
                        keySupplier: (isMaster && supplier) ? supplier : undefined
                    });
                    createdCount++;
                }
            } else {
                // Generic Asset Format: Type, Name, Serial/ID, Location
                // ex: IT_DEVICE, MacBook Pro, SN123456, Office 1
                const [assetTypeStr, name, serial, location] = line.split(",").map(c => c.trim());
                if (!name) continue;

                let assetType = AssetType.IT_DEVICE; // Default
                if (assetTypeStr?.toUpperCase().includes("VEHICLE")) assetType = AssetType.VEHICLE;
                if (assetTypeStr?.toUpperCase() === "IT") assetType = AssetType.IT_DEVICE;
                if (assetTypeStr?.toUpperCase() === "FACILITY") assetType = AssetType.FACILITY;

                addLog(`Creating ${assetType}: ${name}`);
                await AssetService.createAsset({
                    orgId: profile!.orgId,
                    name: name,
                    type: assetType,
                    status: AssetStatus.AVAILABLE,
                    area: location,
                    metaData: {
                        serialNumber: serial,
                        location: location
                    }
                });
                createdCount++;
            }
        }
        addLog(`Import complete. Created ${createdCount} items.`);
    };

    const handleImport = async () => {
        if (!csvContent.trim()) return;
        if (!profile?.orgId) {
            addLog("Error: Organization ID not found. Please sign in.");
            return;
        }

        setImporting(true);
        setLogs([]);
        addLog(`Starting import for ${importType}...`);

        try {
            const lines = csvContent.split("\n").map(l => l.trim()).filter(l => l && !l.toLowerCase().startsWith("type") && !l.toLowerCase().startsWith("key id") && !l.toLowerCase().startsWith("email"));

            if (importType === 'MEMBERS') {
                await importMembers(lines);
            } else {
                await importAssets(lines, importType);
            }

        } catch (err: any) {
            console.error(err);
            addLog(`Error: ${err.message}`);
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold dark:text-white">Bulk Import</h2>

            {/* Type Selector */}
            <div className="mb-6 flex gap-4 border-b border-gray-200 dark:border-gray-700 pb-4">
                <button
                    onClick={() => setImportType('KEYS')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${importType === 'KEYS' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                >
                    Keys
                </button>
                <button
                    onClick={() => setImportType('ASSETS')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${importType === 'ASSETS' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                >
                    Other Assets
                </button>
                <button
                    onClick={() => setImportType('MEMBERS')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${importType === 'MEMBERS' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                >
                    Team Members
                </button>
            </div>

            <p className="mb-2 text-sm text-gray-600 dark:text-gray-400 font-bold">
                Format for {importType}:
            </p>
            <p className="mb-4 text-xs font-mono text-gray-500">
                {importType === 'KEYS' && "Key ID, Name, Location, Quantity, [QR], [Type], [Notes], [Master(Y/N)], [Supplier]"}
                {importType === 'ASSETS' && "Type (IT/VEHICLE), Name, Serial/ID, Location"}
                {importType === 'MEMBERS' && "Email, Name, Role (ADMIN/MANAGER/WORKER)"}
            </p>

            <div className="mb-4">
                <textarea
                    className="h-64 w-full rounded-lg border border-gray-300 p-4 font-mono text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    value={csvContent}
                    onChange={e => setCsvContent(e.target.value)}
                    placeholder={
                        importType === 'KEYS' ? `A1, Bedroom 1, 58 Victoria Road, 1, QR123, EURO_LOCK, Spare key, Yes, Timpson` :
                            importType === 'ASSETS' ? `IT, MacBook Pro M1, SN1234, Office\nVEHICLE, Ford Transit, L666XYZ, Garage` :
                                `alice@example.com, Alice Smith, MANAGER\nbob@example.com, Bob Jones, WORKER`
                    }
                />
            </div>

            <button
                onClick={handleImport}
                disabled={importing}
                className="rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
                {importing ? "Importing..." : "Run Import"}
            </button>

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
