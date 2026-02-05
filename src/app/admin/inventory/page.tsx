'use client';

import { InventoryView } from "@/components/admin/products/inventory-view";

export default function InventoryPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold font-headline tracking-tight">Inventory Management</h1>
            <p className="text-muted-foreground">
                View and update stock levels for your warehouses.
            </p>
            <div className="mt-6">
                <InventoryView />
            </div>
        </div>
    );
}
