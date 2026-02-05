import { Timestamp, FieldValue } from 'firebase/firestore';

export function formatDate(val: Timestamp | FieldValue | Date | string | undefined | null): string {
    if (!val) return '';
    try {
        if (val instanceof Date) return val.toLocaleDateString();
        if (typeof val === 'string') return new Date(val).toLocaleDateString();
        // Check for Firestore Timestamp
        if (typeof val === 'object' && 'toDate' in val && typeof (val as any).toDate === 'function') {
            return (val as Timestamp).toDate().toLocaleDateString();
        }
        return '';
    } catch (e) {
        return '';
    }
}

export function toDate(val: Timestamp | FieldValue | Date | string | undefined | null): Date {
    if (!val) return new Date();
    if (val instanceof Date) return val;
    if (typeof val === 'string') return new Date(val);
    if (typeof val === 'object' && 'toDate' in val && typeof (val as any).toDate === 'function') {
        return (val as Timestamp).toDate();
    }
    return new Date();
}
