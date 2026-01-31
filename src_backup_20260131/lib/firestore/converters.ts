import { FirestoreDataConverter, DocumentData, QueryDocumentSnapshot, SnapshotOptions, Timestamp } from "firebase/firestore";
import { Asset, KeyItem, Audit, Organization } from "@/types";

export const assetConverter: FirestoreDataConverter<Asset> = {
    toFirestore(asset: Asset): DocumentData {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...data } = asset;
        return data;
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
            orgId: data.orgId, // Ensure orgId is passed through
            checkedOutAt: data.checkedOutAt // Critical for Time Out display
        } as Asset;
    },
};

export const auditConverter: FirestoreDataConverter<Audit> = {
    toFirestore(audit: Audit): DocumentData {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
