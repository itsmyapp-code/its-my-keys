import { Timestamp } from 'firebase/firestore';

export type Role = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'MANAGER' | 'WORKER' | 'USER';

export enum AssetType {
    KEY = 'KEY',
    IT_DEVICE = 'IT_DEVICE',
    VEHICLE = 'VEHICLE',
    RENTAL = 'RENTAL',
    FACILITY = 'FACILITY' // For Locks / Doors / Buildings that default hold keys
}

export enum AssetStatus {
    AVAILABLE = 'AVAILABLE',
    CHECKED_OUT = 'CHECKED_OUT',
    MISSING = 'MISSING',
    MAINTENANCE = 'MAINTENANCE',
    RETIRED = 'RETIRED'
}

export interface Organization {
    id: string;
    name: string;
    subscriptionStatus: 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELLED';
    createdAt: Timestamp;
}

export interface MemberProfile {
    uid: string;
    email: string;
    displayName: string;
    role: Role;
    photoURL?: string;
    joinedAt: Timestamp;
}

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    orgId: string;
    role: Role;
    photoURL?: string;
}

export interface Asset {
    id: string;
    orgId: string;
    name: string; // e.g., "Front Door Key", "MacBook Pro #42"
    type: AssetType;
    area?: string;
    totalKeys?: number;
    status: AssetStatus;
    metaData: Record<string, any>; // Polymorphic fields
    qrCode?: string;
    searchKeywords: string[]; // For filtering
    checkedOutAt?: Timestamp; // For top-level access in reports
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface Log {
    id: string;
    orgId: string;
    assetId: string;
    assetName: string;
    action: 'CHECK_IN' | 'CHECK_OUT' | 'REPORT_MISSING' | 'CREATE' | 'UPDATE' | 'DELETE';
    actorId: string;
    actorName: string;
    timestamp: Timestamp;
    notes?: string;
}

export type KeyItem = Asset; // Backwards compatibility for InventoryContext

export type KeyStatus = AssetStatus | 'AVAILABLE' | 'CHECKED_OUT' | 'MISSING' | 'MAINTENANCE' | 'RETIRED';

export type LoanType = 'STANDARD' | '1_HOUR' | '4_HOURS' | 'EOD' | 'INDEFINITE' | 'LONG_TERM' | 'PERMANENT';

export interface Audit {
    id: string;
    date: Timestamp;
    performedBy: string;
    missingKeys: string[];
}
