import {
    collection,
    doc,
    getDocs,
    setDoc,
    updateDoc,
    onSnapshot,
    query,
    where,
    Unsubscribe,
    Timestamp,
    addDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Asset, KeyItem, Audit, KeyStatus, LoanType } from "@/types";
import { assetConverter, auditConverter } from "./converters";

// Helper to get collection refs
const getAssetsCollection = () => collection(db, "assets").withConverter(assetConverter); // Use top-level collection

// --- Subscriptions ---

export const subscribeToAssets = (orgId: string, callback: (assets: Asset[]) => void, onError?: (error: Error) => void): Unsubscribe => {
    // Query top-level assets collection for this org
    const q = query(
        getAssetsCollection(),
        where("orgId", "==", orgId)
    );
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => doc.data()));
    }, onError);
};

export const subscribeToKeys = (orgId: string, callback: (keys: KeyItem[]) => void, onError?: (error: Error) => void): Unsubscribe => {
    // Legacy support: We now store keys as Assets with type='KEY'.
    // We filter the assets collection for type='KEY'
    const q = query(
        getAssetsCollection(),
        where("orgId", "==", orgId),
        where("type", "==", "KEY")
    );

    return onSnapshot(q, (snapshot) => {
        // Map the generic Asset back to KeyItem structure if needed, or cast it
        // Ideally we should move away from KeyItem, but for now we cast
        const keys = snapshot.docs.map(doc => doc.data() as unknown as KeyItem);
        callback(keys);
    }, onError);
};

// --- Writes ---

export const updateKeyStatus = async (
    orgId: string,
    keyId: string,
    status: KeyStatus,
    holder: string | null = null,
    holderCompany: string | null = null,
    loanType: LoanType = "STANDARD",
    dueDate: Timestamp | null = null
) => {
    // Update top-level asset
    const keyRef = doc(db, "assets", keyId);

    const updateData: any = {
        status,
        updatedAt: Timestamp.now(),
        // We update specific metadata fields for keys
        "metaData.currentHolder": holder,
        "metaData.holderCompany": holderCompany,
        "metaData.loanType": loanType,
        "metaData.dueDate": dueDate
    };

    if (status === "CHECKED_OUT") {
        updateData.checkedOutAt = Timestamp.now();
    } else if (status === "AVAILABLE") {
        updateData.checkedOutAt = null;
    }

    await updateDoc(keyRef, updateData);

    // Log entry would be handled by AssetService ideally, but we keep this for legacy component compatibility
};

export const reportKeyMissing = async (
    orgId: string,
    keyId: string,
    holder: string | null,
    reason: string
) => {
    const keyRef = doc(db, "assets", keyId);
    await updateDoc(keyRef, {
        status: "MISSING",
        updatedAt: Timestamp.now(),
        "metaData.currentHolder": holder,
        "metaData.missingSince": Timestamp.now(),
        "metaData.missingReason": reason
    });
};

export const createAudit = async (orgId: string, audit: Omit<Audit, "id">) => {
    // Audits might still be subcollection or top-level. Let's keep them top-level for consistency if possible, 
    // or sub-collection of the organization. Let's start with subcollection of Org for Audits as they are not "Assets".
    const auditsRef = collection(db, "organizations", orgId, "audits").withConverter(auditConverter);
    await addDoc(auditsRef, { ...audit, id: "" } as Audit);
};

export const updateKeyAuditDate = async (orgId: string, keyId: string) => {
    const keyRef = doc(db, "assets", keyId);
    await updateDoc(keyRef, {
        "metaData.lastAuditDate": Timestamp.now()
    });
};

// --- Seeds / Admin ---

export const createAsset = async (orgId: string, asset: Omit<Asset, "id">) => {
    const assetsRef = getAssetsCollection();
    // Ensure orgId is attached
    return await addDoc(assetsRef, { ...asset, orgId, id: "" } as Asset);
};

export const createKey = async (orgId: string, key: Omit<KeyItem, "id">) => {
    // Deprecated in favor of generic createAsset, but kept for compatibility
    const assetsRef = getAssetsCollection();
    await addDoc(assetsRef, {
        ...key,
        type: "KEY",
        orgId,
        id: ""
    } as Asset);
};
