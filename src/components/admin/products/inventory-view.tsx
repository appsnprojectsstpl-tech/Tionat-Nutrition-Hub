'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where, writeBatch, documentId, limit } from 'firebase/firestore';
import { Product, WarehouseInventory, Warehouse } from '@/lib/types';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logAdminAction } from "@/lib/audit-logger";

export function InventoryView() {
    const { user, userProfile } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    // 1. Determine Scope
    const isSuperAdmin = userProfile?.role === 'superadmin' || userProfile?.role === 'admin';
    const warehouseAdminId = userProfile?.role === 'warehouse_admin' ? userProfile.managedWarehouseId : null;

    // State for SuperAdmin selector
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(warehouseAdminId || '');

    // 2. Fetch Data
    // A. Warehouses (for selector)
    const warehousesRef = useMemoFirebase(
        () => (firestore && isSuperAdmin ? collection(firestore, 'warehouses') : null),
        [firestore, isSuperAdmin]
    );
    const { data: warehouses } = useCollection<Warehouse>(warehousesRef);

    // Initial Selection for SuperAdmin
    if (isSuperAdmin && !selectedWarehouseId && warehouses && warehouses.length > 0) {
        setSelectedWarehouseId(warehouses[0].id);
    }

    const activeWarehouseId = isSuperAdmin ? selectedWarehouseId : warehouseAdminId;

    // B. Products (Base Catalog)
    const productsRef = useMemoFirebase(
        () => (firestore ? query(collection(firestore, 'products'), limit(100)) : null),
        [firestore]
    );
    const { data: products, isLoading: loadingProducts } = useCollection<Product>(productsRef);

    // C. Warehouse Inventory (Specific to Active Warehouse)
    // We fetch ALL inventory for this warehouse to map it locally.
    const inventoryRef = useMemoFirebase(
        () => (firestore && activeWarehouseId ? query(collection(firestore, 'warehouse_inventory'), where('warehouseId', '==', activeWarehouseId), limit(100)) : null),
        [firestore, activeWarehouseId]
    );
    const { data: warehouseStock, isLoading: loadingStock } = useCollection<WarehouseInventory>(inventoryRef);

    // 3. Merged Data Model
    const inventoryMap = useMemo(() => {
        const map = new Map<string, number>();
        warehouseStock?.forEach(item => map.set(item.productId, item.stock));
        return map;
    }, [warehouseStock]);

    // Local State for Edits: { productId: newStockValue }
    const [edits, setEdits] = useState<Record<string, number>>({});
    const [isSaving, setIsSaving] = useState(false);

    const handleStockChange = (productId: string, val: string) => {
        const num = parseInt(val);
        if (!isNaN(num) && num >= 0) {
            setEdits(prev => ({ ...prev, [productId]: num }));
        }
    };

    const hasEdits = Object.keys(edits).length > 0;

    const handleSaveChanges = async () => {
        if (!firestore || !activeWarehouseId) return;
        setIsSaving(true);

        try {
            const batch = writeBatch(firestore);

            Object.entries(edits).forEach(([productId, newStock]) => {
                const docId = `${activeWarehouseId}_${productId}`;
                const ref = doc(firestore, 'warehouse_inventory', docId);

                batch.set(ref, {
                    warehouseId: activeWarehouseId,
                    productId: productId,
                    stock: newStock,
                    updatedAt: new Date() // Server timestamp ideally, but date is fine for now
                }, { merge: true });
            });

            await batch.commit();

            logAdminAction(firestore, {
                action: 'INVENTORY_UPDATE',
                targetType: 'INVENTORY',
                targetId: activeWarehouseId,
                performedBy: user?.email || 'unknown',
                details: `Updated stock for ${Object.keys(edits).length} items in warehouse ${activeWarehouseId}`
            });

            setEdits({});
            toast({ title: "Inventory Updated", description: "Stock levels saved successfully." });

        } catch (error) {
            console.error("Stock update failed", error);
            toast({ title: "Update Failed", description: "Could not save stock changes.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    if (!userProfile) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /> Loading profile...</div>;

    if (!isSuperAdmin && !warehouseAdminId) {
        return (
            <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6 flex flex-col items-center text-center gap-2">
                    <AlertCircle className="h-8 w-8 text-red-500" />
                    <h3 className="text-lg font-bold text-red-700">Access Restricted</h3>
                    <p className="text-red-600">You are not assigned to manage any warehouse. Please contact a Super Admin.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold">Warehouse Inventory</h2>
                    <p className="text-sm text-muted-foreground">
                        Manage stock for: <span className="font-semibold text-primary">{isSuperAdmin ? (warehouses?.find(w => w.id === selectedWarehouseId)?.name || 'Select Warehouse') : 'Your Assigned Warehouse'}</span>
                    </p>
                </div>

                {isSuperAdmin && (
                    <div className="w-[250px]">
                        <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Warehouse" />
                            </SelectTrigger>
                            <SelectContent>
                                {warehouses?.map(w => (
                                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Stock Levels</CardTitle>
                        <CardDescription>Real-time stock from {activeWarehouseId}</CardDescription>
                    </div>
                    {hasEdits && (
                        <Button onClick={handleSaveChanges} disabled={isSaving} className="gap-2">
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save {Object.keys(edits).length} Changes
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    {(loadingProducts || loadingStock) ? (
                        <div className="py-10 text-center text-muted-foreground">Loading inventory data...</div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product Name</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead className="w-[150px]">Current Stock</TableHead>
                                        <TableHead className="w-[150px]">Update Stock</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {products?.map(product => {
                                        const currentStock = inventoryMap.get(product.id) || 0;
                                        const editedStock = edits[product.id];
                                        const displayStock = editedStock !== undefined ? editedStock : currentStock;
                                        const isEdited = editedStock !== undefined;

                                        return (
                                            <TableRow key={product.id} className={isEdited ? "bg-muted/50" : ""}>
                                                <TableCell className="font-medium">{product.name}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{product.categoryId}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{currentStock}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        className="h-8 w-24"
                                                        value={displayStock}
                                                        onChange={(e) => handleStockChange(product.id, e.target.value)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {displayStock === 0 ?
                                                        <Badge variant="destructive">Out</Badge> :
                                                        displayStock < 10 ?
                                                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Low</Badge> :
                                                            <Badge variant="secondary" className="bg-green-100 text-green-800">OK</Badge>
                                                    }
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {(!products || products.length === 0) && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8">No products found in catalog.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
