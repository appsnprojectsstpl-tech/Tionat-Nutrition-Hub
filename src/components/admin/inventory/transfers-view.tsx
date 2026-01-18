'use client';

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, runTransaction, increment } from 'firebase/firestore';
import { Product, Warehouse } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowRightLeft, Trash2, Loader2, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function TransfersView() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isTransferring, setIsTransferring] = useState(false);

    const warehousesQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'warehouses');
    }, [firestore]);

    const { data: warehouses } = useCollection<Warehouse>(warehousesQuery);

    const productsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'products');
    }, [firestore]);

    const { data: products } = useCollection<Product>(productsQuery);

    const [sourceId, setSourceId] = useState('');
    const [destId, setDestId] = useState('');

    // Items to transfer
    const [items, setItems] = useState<{ productId: string; name: string; quantity: number }[]>([]);

    // Search State
    const [itemSearch, setItemSearch] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [newItemQty, setNewItemQty] = useState(1);

    const handleAddItem = () => {
        if (!selectedProduct) return;
        if (items.find(i => i.productId === selectedProduct.id)) {
            toast({ title: "Item exists", description: "This product is already in the transfer list.", variant: "destructive" });
            return;
        }
        setItems(prev => [...prev, {
            productId: selectedProduct.id,
            name: selectedProduct.name,
            quantity: newItemQty
        }]);
        setSelectedProduct(null);
        setItemSearch('');
        setNewItemQty(1);
    };

    const handleTransfer = async () => {
        if (!firestore) return;
        if (!sourceId || !destId) {
            toast({ title: "Invalid warehouses", description: "Select source and destination.", variant: "destructive" });
            return;
        }
        if (sourceId === destId) {
            toast({ title: "Invalid warehouses", description: "Source and destination cannot be the same.", variant: "destructive" });
            return;
        }
        if (items.length === 0) {
            toast({ title: "No items", description: "Add items to transfer.", variant: "destructive" });
            return;
        }

        setIsTransferring(true);
        try {
            await runTransaction(firestore, async (transaction) => {
                // 1. Verify Stock
                for (const item of items) {
                    const sourceInvRef = doc(firestore, 'warehouse_inventory', `${sourceId}_${item.productId}`);
                    const sourceSnap = await transaction.get(sourceInvRef);

                    if (!sourceSnap.exists()) {
                        throw new Error(`Product ${item.name} not found in source warehouse.`);
                    }

                    const currentStock = sourceSnap.data().stock || 0;
                    if (currentStock < item.quantity) {
                        throw new Error(`Insufficient stock for ${item.name}. Available: ${currentStock}`);
                    }
                }

                // 2. Perform Transfer
                for (const item of items) {
                    const sourceInvRef = doc(firestore, 'warehouse_inventory', `${sourceId}_${item.productId}`);
                    const destInvRef = doc(firestore, 'warehouse_inventory', `${destId}_${item.productId}`);

                    // Decrement Source
                    transaction.update(sourceInvRef, {
                        stock: increment(-item.quantity),
                        updatedAt: serverTimestamp()
                    });

                    // Increment Destination (Upsert)
                    transaction.set(destInvRef, {
                        warehouseId: destId,
                        productId: item.productId,
                        stock: increment(item.quantity),
                        updatedAt: serverTimestamp()
                    }, { merge: true });

                    // Log Transfer Out
                    const logOutRef = doc(collection(firestore, 'inventory_logs'));
                    transaction.set(logOutRef, {
                        warehouseId: sourceId,
                        productId: item.productId,
                        productName: item.name,
                        change: -item.quantity,
                        reason: 'TRANSFER_OUT',
                        note: `To ${warehouses?.find(w => w.id === destId)?.name}`,
                        userId: 'admin',
                        userName: 'Admin',
                        timestamp: serverTimestamp()
                    });

                    // Log Transfer In
                    const logInRef = doc(collection(firestore, 'inventory_logs'));
                    transaction.set(logInRef, {
                        warehouseId: destId,
                        productId: item.productId,
                        productName: item.name,
                        change: item.quantity,
                        reason: 'TRANSFER_IN',
                        note: `From ${warehouses?.find(w => w.id === sourceId)?.name}`,
                        userId: 'admin',
                        userName: 'Admin',
                        timestamp: serverTimestamp()
                    });
                }
            });

            toast({ title: "Transfer Successful", description: "Inventory moved successfully." });
            setItems([]);
        } catch (e) {
            console.error(e);
            toast({ title: "Transfer Failed", description: e instanceof Error ? e.message : 'Transfer failed', variant: "destructive" });
        } finally {
            setIsTransferring(false);
        }
    };

    const filteredProducts = products?.filter(p => p.name.toLowerCase().includes(itemSearch.toLowerCase()));

    return (
        <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-8 items-start">
                <Card>
                    <CardHeader>
                        <CardTitle>Transfer Details</CardTitle>
                        <CardDescription>Select locations and items.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex gap-4 items-center">
                            <div className="flex-1 space-y-2">
                                <Label>Source Warehouse</Label>
                                <Select value={sourceId} onValueChange={setSourceId}>
                                    <SelectTrigger><SelectValue placeholder="From..." /></SelectTrigger>
                                    <SelectContent>
                                        {warehouses?.map(w => (
                                            <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <ArrowRight className="h-6 w-6 text-muted-foreground mt-6" />
                            <div className="flex-1 space-y-2">
                                <Label>Destination Warehouse</Label>
                                <Select value={destId} onValueChange={setDestId}>
                                    <SelectTrigger><SelectValue placeholder="To..." /></SelectTrigger>
                                    <SelectContent>
                                        {warehouses?.map(w => (
                                            <SelectItem key={w.id} value={w.id} disabled={w.id === sourceId}>{w.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="border rounded-md p-4 bg-secondary/20 space-y-4">
                            <Label>Add Product</Label>
                            <div className="flex gap-2">
                                <div className="flex-1 relative">
                                    <Input
                                        value={itemSearch}
                                        onChange={e => { setItemSearch(e.target.value); setSelectedProduct(null); }}
                                        placeholder="Search product..."
                                    />
                                    {itemSearch && !selectedProduct && (
                                        <div className="absolute z-10 w-full bg-background border rounded-md shadow-md mt-1 max-h-48 overflow-auto">
                                            {filteredProducts?.map(p => (
                                                <div key={p.id} className="p-2 hover:bg-muted cursor-pointer text-sm"
                                                    onClick={() => { setSelectedProduct(p); setItemSearch(p.name); }}>
                                                    {p.name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <Input
                                    type="number"
                                    className="w-20"
                                    value={newItemQty}
                                    onChange={e => setNewItemQty(Number(e.target.value))}
                                    min={1}
                                />
                                <Button onClick={handleAddItem} disabled={!selectedProduct}>Add</Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Review & Confirm</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Qty</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell>{item.name}</TableCell>
                                        <TableCell>{item.quantity}</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="sm" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {items.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No items added.</TableCell></TableRow>}
                            </TableBody>
                        </Table>

                        <div className="pt-4 flex justify-end">
                            <Button size="lg" onClick={handleTransfer} disabled={isTransferring || items.length === 0}>
                                {isTransferring ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <ArrowRightLeft className="mr-2 h-4 w-4" />}
                                Complete Transfer
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
