import {
    collection,
    addDoc,
    updateDoc,
    doc,
    getDocs,
    query,
    where,
    Timestamp,
    serverTimestamp,
    deleteDoc,
    getDoc,
    writeBatch
} from "firebase/firestore";
import { db } from "../firebase/client";
import { Asset, AssetStatus, Log, AssetType } from "@/types";

const ASSETS_COLLECTION = "assets";
const LOGS_COLLECTION = "logs";

export const AssetService = {
    /**
     * Create a new asset with polymorphic metadata
     */
    createAsset: async (assetData: Omit<Asset, "id" | "createdAt" | "updatedAt" | "searchKeywords"> & { orgId: string }) => {
        // Create search keywords from name and specific metadata
        const searchKeywords = generateSearchKeywords(assetData);

        const newAsset = {
            ...sanitizeData(assetData),
            searchKeywords,
            status: AssetStatus.AVAILABLE,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, ASSETS_COLLECTION), newAsset);
        return { id: docRef.id, ...newAsset };
    },

    /**
     * Update an asset
     */
    updateAsset: async (id: string, updates: Partial<Asset>) => {
        const docRef = doc(db, ASSETS_COLLECTION, id);

        if (updates.name || updates.metaData) {
            // Regenerate keywords if critical fields change. 
            // Note: This requires fetching the doc first to merge, or passing full data.
            // For efficiency, we update keywords only if name is changed explicitly.
            if (updates.name) {
                updates.searchKeywords = generateSearchKeywords(updates as Asset);
            }
        }

        await updateDoc(docRef, {
            ...sanitizeData(updates),
            updatedAt: serverTimestamp()
        });
    },

    /**
     * Get all assets for an organization
     */
    getAssetsByOrg: async (orgId: string) => {
        const q = query(
            collection(db, ASSETS_COLLECTION),
            where("orgId", "==", orgId)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
    },

    /**
     * Get single asset
     */
    getAsset: async (id: string) => {
        const docRef = doc(db, ASSETS_COLLECTION, id);
        const snap = await getDoc(docRef);
        if (snap.exists()) return { id: snap.id, ...snap.data() } as Asset;
        return null;
    },

    /**
     * Check OUT an asset
     */
    checkOut: async (assetId: string, userId: string, userEmail: string, recipient: string, notes?: string, dueDate: Timestamp | null = null) => {
        // 1. Update Asset Status
        const { updateKeyStatus } = await import("@/lib/firestore/services");

        // Fetch asset
        const assetRef = doc(db, ASSETS_COLLECTION, assetId);
        const assetSnap = await getDoc(assetRef);

        if (!assetSnap.exists()) throw new Error("Asset not found");
        const asset = { id: assetSnap.id, ...assetSnap.data() } as Asset;

        if (asset.status !== AssetStatus.AVAILABLE) {
            throw new Error("Asset is not available");
        }

        await updateKeyStatus(
            asset.orgId,
            assetId,
            "CHECKED_OUT",
            recipient,
            null,
            "STANDARD",
            dueDate
        );

        // 2. Create Log Entry
        await addLog({
            orgId: asset.orgId,
            assetId,
            assetName: asset.name,
            action: 'CHECK_OUT',
            actorId: userId,
            actorName: userEmail,
            notes: notes ? `${notes} (Handed to: ${recipient})` : `Handed to: ${recipient}`
        });
    },

    /**
     * Check IN an asset
     */
    checkIn: async (assetId: string, actorId: string, actorName: string, notes?: string) => {
        const assetRef = doc(db, ASSETS_COLLECTION, assetId);
        const assetSnap = await getDoc(assetRef);

        if (!assetSnap.exists()) throw new Error("Asset not found");
        const asset = { id: assetSnap.id, ...assetSnap.data() } as Asset; // Fix casting safely

        await updateDoc(assetRef, {
            status: AssetStatus.AVAILABLE,
            updatedAt: serverTimestamp(),
            checkedOutAt: null,
            "metaData.checkedOutAt": null,
            "metaData.currentHolder": null,
            "metaData.dueDate": null // Clear due date
        });

        await addLog({
            orgId: asset.orgId,
            assetId,
            assetName: asset.name,
            action: 'CHECK_IN',
            actorId,
            actorName,
            notes
        });
    },

    /**
     * Report Missing
     */
    reportMissing: async (assetId: string, actorId: string, actorName: string, notes?: string) => {
        const assetRef = doc(db, ASSETS_COLLECTION, assetId);
        const asset = (await getDoc(assetRef)).data() as Asset;

        await updateDoc(assetRef, {
            status: AssetStatus.MISSING,
            updatedAt: serverTimestamp()
        });

        await addLog({
            orgId: asset.orgId,
            assetId,
            assetName: asset.name,
            action: 'REPORT_MISSING',
            actorId,
            actorName,
            notes
        });
    },

    /**
     * Delete an asset
     */
    deleteAsset: async (assetId: string) => {
        await deleteDoc(doc(db, ASSETS_COLLECTION, assetId));
    },

    /**
     * Delete ALL assets for an organization
     * (Danger Zone)
     */
    deleteAllAssets: async (orgId: string) => {
        const q = query(
            collection(db, ASSETS_COLLECTION),
            where("orgId", "==", orgId)
        );
        const snapshot = await getDocs(q);

        // Firestore batches limited to 500 ops
        const batchSize = 500;
        const chunks = [];
        for (let i = 0; i < snapshot.docs.length; i += batchSize) {
            chunks.push(snapshot.docs.slice(i, i + batchSize));
        }

        for (const chunk of chunks) {
            const batch = writeBatch(db);
            chunk.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        }
    }
};

/**
 * Helper to write audit log
 */
async function addLog(logData: Omit<Log, "id" | "timestamp">) {
    await addDoc(collection(db, LOGS_COLLECTION), {
        ...logData,
        timestamp: serverTimestamp()
    });
}

/**
 * Client-side helper to generate search terms
 */
function generateSearchKeywords(asset: Partial<Asset>): string[] {
    const terms = new Set<string>();

    // Add name parts
    if (asset.name) {
        asset.name.toLowerCase().split(' ').forEach(w => terms.add(w));
        terms.add(asset.name.toLowerCase());
    }

    // Add QR Code
    if (asset.qrCode) terms.add(asset.qrCode.toLowerCase());

    // Add metadata values if string
    if (asset.metaData) {
        Object.values(asset.metaData).forEach(val => {
            if (typeof val === 'string') terms.add(val.toLowerCase());
        });
    }

    return Array.from(terms);
}

/**
 * Helper to remove undefined values for Firestore
 */
function sanitizeData(data: any): any {
    if (data === undefined) return null;
    if (data === null) return null;
    if (typeof data !== 'object') return data;
    if (Array.isArray(data)) return data.map(sanitizeData);

    const sanitized: any = {};
    for (const key in data) {
        const val = data[key];
        sanitized[key] = sanitizeData(val);
    }
    return sanitized;
}
