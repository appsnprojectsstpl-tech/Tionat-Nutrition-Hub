import { AuditLogViewer } from "@/components/admin/audit-log-viewer";

export default function AuditLogsPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold font-headline">Audit Logs</h1>
            <AuditLogViewer />
        </div>
    );
}
