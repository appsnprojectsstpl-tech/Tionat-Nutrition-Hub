
import { AdminSidebar } from "@/components/admin-sidebar";
import { AdminGuard } from "@/components/admin-guard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <AdminSidebar />
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 pb-24 sm:pb-4">
          <AdminGuard>{children}</AdminGuard>
        </main>
      </div>
    </div>
  );
}
