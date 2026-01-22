import { FirestoreDataConverter, DocumentData, QueryDocumentSnapshot, SnapshotOptions, Timestamp } from "firebase/firestore";
import { Asset, KeyItem, Audit, Organization } from "@/types";

export const assetConverter: FirestoreDataConverter<Asset> = {
    toFirestore(asset: Asset): DocumentData {
        return { ...asset };
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Asset {
        const data = snapshot.data(options);
        return {
            id: snapshot.id,
            name: data.name,
            area: data.area,
            totalKeys: data.totalKeys,
            // Include missing fields
            type: data.type,
            status: data.status,
            qrCode: data.qrCode,
            searchKeywords: data.searchKeywords,
            metaData: data.metaData || {},
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            orgId: data.orgId // Ensure orgId is passed through
        } as Asset;
    },
};

export const keyConverter: FirestoreDataConverter<KeyItem> = {
    toFirestore(key: KeyItem): DocumentData {
        const { id, ...data } = key;
        return data; // 'shortCode' is part of data now
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): KeyItem {
        const data = snapshot.data(options);
        return {
            id: snapshot.id,
            shortCode: data.shortCode || snapshot.id, // Fallback for old keys
            assetId: data.assetId,
            assetName: data.assetName,
            area: data.area,
            status: data.status,
            currentHolder: data.currentHolder,
            holderCompany: data.holderCompany || null,
            loanType: data.loanType,
            dueDate: data.dueDate,
            lastAuditDate: data.lastAuditDate,
            missingSince: data.missingSince || null,
            missingReason: data.missingReason || null,
            checkedOutAt: data.checkedOutAt || null,
        };
    },
};

export const auditConverter: FirestoreDataConverter<Audit> = {
    toFirestore(audit: Audit): DocumentData {
        const { id, ...data } = audit;
        return data;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Audit {
        const data = snapshot.data(options);
        return {
            id: snapshot.id,
            date: data.date,
            performedBy: data.performedBy,
            missingKeys: data.missingKeys,
        };
    },
};
