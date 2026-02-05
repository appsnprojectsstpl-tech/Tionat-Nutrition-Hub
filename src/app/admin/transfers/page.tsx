'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where, writeBatch, serverTimestamp, getDoc } from 'firebase/firestore';
import { Product, Warehouse } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRightLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logAdminAction } from "@/lib/audit-logger";
import { Badge } from "@/components/ui/badge";

export default function TransfersPage() {
    const { user, userProfile } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    // 1. Fetch Warehouses & Products
    // Only Super Admin should access this, but we'll double check.
    const isSuperAdmin = userProfile?.role === 'superadmin' || userProfile?.role === 'admin';

    const warehousesRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'warehouses') : null),
        [firestore]
    );
    const { data: warehouses } = useCollection<Warehouse>(warehousesRef);

    const productsRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'products') : null),
        [firestore]
    );
    const { data: products } = useCollection<Product>(productsRef);

    // 2. Form State
    const [sourceId, setSourceId] = useState<string>('');
    const [destId, setDestId] = useState<string>('');
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [quantity, setQuantity] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 3. Validation Logic
    const isValid = sourceId && destId && sourceId !== destId && selectedProductId && quantity > 0;

    const handleTransfer = async () => {
        if (!firestore || !isValid) return;
        setIsSubmitting(true);

        try {
            // A. Check Source Stock
            const sourceInvRef = doc(firestore, 'warehouse_inventory', `${sourceId}_${selectedProductId}`);
            const destInvRef = doc(firestore, 'warehouse_inventory', `${destId}_${selectedProductId}`);

            const sourceSnapshot = await getDoc(sourceInvRef);

            if (!sourceSnapshot.exists()) {
                throw new Error("Source warehouse does not have this product record.");
            }

            const currentSourceStock = sourceSnapshot.data().stock || 0;
            if (currentSourceStock < quantity) {
                throw new Error(`Insufficient stock in source. Available: ${currentSourceStock}`);
            }

            // B. Execute Transfer (Atomic)
            const batch = writeBatch(firestore);

            // Decrement Source
            batch.update(sourceInvRef, {
                stock: currentSourceStock - quantity,
                updatedAt: serverTimestamp()
            });

            // Increment Dest (Create if missing)
            // Ideally we check if dest exists, if not set, else update increment. 
            // Since we can't do conditional logic easily in batch without reading (which we didn't for dest yet), 
            // let's read dest first.
            const destSnapshot = await getDoc(destInvRef);

            if (destSnapshot.exists()) {
                const currentDestStock = destSnapshot.data().stock || 0;
                batch.update(destInvRef, {
                    stock: currentDestStock + quantity,
                    updatedAt: serverTimestamp()
                });
            } else {
                batch.set(destInvRef, {
                    warehouseId: destId,
                    productId: selectedProductId,
                    stock: quantity,
                    updatedAt: serverTimestamp()
                });
            }

            // Log Transfer
            const transferLogRef = doc(collection(firestore, 'inventory_transfers'));
            batch.set(transferLogRef, {
                sourceWarehouseId: sourceId,
                destWarehouseId: destId,
                productId: selectedProductId,
                quantity: quantity,
                performedBy: user?.uid,
                timestamp: serverTimestamp()
            });

            await batch.commit();

            logAdminAction(firestore, {
                action: 'INVENTORY_TRANSFER',
                targetType: 'PRODUCT',
                targetId: selectedProductId,
                performedBy: user?.email || 'unknown',
                details: `Transferred ${quantity} units from ${sourceId} to ${destId}`
            });

            toast({ title: "Transfer Successful", description: "Stock moved successfully." });
            setQuantity(0);

        } catch (error) {
            console.error("Transfer failed", error);
            toast({
                title: "Transfer Failed",
                description: error instanceof Error ? error.message : "An error occurred.",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isSuperAdmin) {
        return <div className="p-8 text-center text-red-500">Authorized Personnel Only</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold font-headline">Stock Transfer</h1>
            <p className="text-muted-foreground">Move inventory between warehouses.</p>

            <div className="grid md:grid-cols-2 gap-8 items-start">
                {/* Source */}
                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader>
                        <CardTitle>Source Warehouse</CardTitle>
                        <CardDescription>Where stock is coming FROM</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Select Warehouse</Label>
                            <Select value={sourceId} onValueChange={setSourceId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Source" />
                                </SelectTrigger>
                                <SelectContent>
                                    {warehouses?.map(w => (
                                        <SelectItem key={w.id} value={w.id} disabled={w.id === destId}>
                                            {w.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Destination */}
                <Card className="border-l-4 border-l-green-500">
                    <CardHeader>
                        <CardTitle>Destination Warehouse</CardTitle>
                        <CardDescription>Where stock is going TO</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Select Warehouse</Label>
                            <Select value={destId} onValueChange={setDestId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Destination" />
                                </SelectTrigger>
                                <SelectContent>
                                    {warehouses?.map(w => (
                                        <SelectItem key={w.id} value={w.id} disabled={w.id === sourceId}>
                                            {w.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Product & Action */}
            <Card>
                <CardHeader><CardTitle>Transfer Details</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Select Product</Label>
                            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Search Product..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                    {products?.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Quantity to Move</Label>
                            <Input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <Button
                            size="lg"
                            onClick={handleTransfer}
                            disabled={!isValid || isSubmitting}
                            className="w-full md:w-auto min-w-[200px]"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRightLeft className="w-4 h-4 mr-2" />}
                            Execute Transfer
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
