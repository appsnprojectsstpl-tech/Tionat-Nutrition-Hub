'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InventoryView } from "@/components/admin/inventory/inventory-view";
import { TransfersView } from "@/components/admin/inventory/transfers-view";
import { PurchaseOrdersView } from "@/components/admin/inventory/purchase-orders-view";
import { WarehousesView } from "@/components/admin/inventory/warehouses-view";
import { LabelsView } from "@/components/admin/inventory/labels-view";
import { AlertsSettingsView } from "@/components/admin/inventory/alerts-view";

export default function InventoryHubPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold font-headline tracking-tight">Inventory Management</h1>

            <Tabs defaultValue="stock" className="w-full">
                <TabsList className="grid w-full grid-cols-5 lg:w-[800px]">
                    <TabsTrigger value="stock">Stock Levels</TabsTrigger>
                    <TabsTrigger value="transfers">Transfers</TabsTrigger>
                    <TabsTrigger value="po">Purchase Orders</TabsTrigger>
                    <TabsTrigger value="warehouses">Warehouses</TabsTrigger>
                    <TabsTrigger value="labels">Barcode Labels</TabsTrigger>
                    <TabsTrigger value="settings">Alerts & Settings</TabsTrigger>
                </TabsList>

                <div className="mt-4">
                    <TabsContent value="stock">
                        <InventoryView />
                    </TabsContent>

                    <TabsContent value="transfers">
                        <TransfersView />
                    </TabsContent>

                    <TabsContent value="po">
                        <PurchaseOrdersView />
                    </TabsContent>

                    <TabsContent value="warehouses">
                        <WarehousesView />
                    </TabsContent>

                    <TabsContent value="labels">
                        <LabelsView />
                    </TabsContent>

                    <TabsContent value="settings">
                        <AlertsSettingsView />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
