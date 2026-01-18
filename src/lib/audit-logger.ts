
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase'; // Assuming export from '@/firebase'

export type AuditActionType =
    | 'ORDER_UPDATE'
    | 'USER_ROLE_UPDATE'
    | 'WAREHOUSE_UPDATE'
    | 'SYSTEM_CONFIG_UPDATE';

export interface AuditLogEntry {
    action: AuditActionType;
    performedBy: string; // User ID or Email
    targetId: string; // ID of the object being modified
    targetType: 'ORDER' | 'PRODUCT' | 'WAREHOUSE' | 'USER' | 'SYSTEM';
    details: string;
    status?: 'SUCCESS' | 'FAILURE';
    metadata?: any;
}

export const logAdminAction = async (firestore: Firestore, entry: AuditLogEntry) => {
    try {
        // If db is not initialized (SSR), skip
        if (!firestore) return;

        await addDoc(collection(firestore, 'admin_audit_logs'), {
            ...entry,
            status: entry.status || 'SUCCESS',
            timestamp: serverTimestamp(),
            severity: 'info'
        });
    } catch (error) {
        console.error("Failed to log audit action:", error);
        // Fail silently to not block the main action
    }
};

export interface UserActivityLogEntry {
    userId: string;
    action: 'LOGIN' | 'ORDER_PLACED' | 'PROFILE_UPDATE' | 'ADDRESS_ADD' | 'REVIEW_ADD';
    details: string;
    metadata?: any;
}

export const logUserAction = async (firestore: Firestore, entry: UserActivityLogEntry) => {
    try {
        if (!firestore) return;
        await addDoc(collection(firestore, `users/${entry.userId}/activity_logs`), {
            ...entry,
            timestamp: serverTimestamp()
        });
    } catch (error) {
        console.error("Failed to log user action:", error);
    }
};
