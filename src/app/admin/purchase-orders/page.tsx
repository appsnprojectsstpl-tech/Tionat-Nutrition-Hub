'use client';

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, updateDoc, increment, writeBatch } from 'firebase/firestore';
import { PurchaseOrder, POStatus, POItem, Product, Warehouse, Supplier } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Printer, CheckCircle, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function PurchaseOrdersPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const posQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'purchase_orders'), orderBy('createdAt', 'desc'));
    }, [firestore]);

    const { data: pos, isLoading } = useCollection<PurchaseOrder>(posQuery);

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

    // Form State
    const [newPO, setNewPO] = useState<{
        supplierName: string;
        warehouseId: string;
        items: POItem[];
        status: POStatus;
    }>({
        supplierName: '',
        warehouseId: '',
        items: [],
        status: 'DRAFT'
    });

    const [itemSearch, setItemSearch] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [newItemQty, setNewItemQty] = useState(1);
    const [newItemCost, setNewItemCost] = useState(0);

    const handleAddItem = () => {
        if (!selectedProduct) return;
        setNewPO(prev => ({
            ...prev,
            items: [...prev.items, {
                productId: selectedProduct.id,
                name: selectedProduct.name,
                quantity: newItemQty,
                unitCost: newItemCost
            }]
        }));
        setSelectedProduct(null);
        setItemSearch('');
        setNewItemQty(1);
        setNewItemCost(0);
    };

    const handleCreatePO = async () => {
        if (!firestore) return;
        if (!newPO.supplierName || !newPO.warehouseId || newPO.items.length === 0) {
            toast({ title: "Missing Fields", description: "Supplier, Warehouse, and Items are required.", variant: "destructive" });
            return;
        }

        try {
            const warehouseName = warehouses?.find(w => w.id === newPO.warehouseId)?.name || 'Unknown';
            const totalCost = newPO.items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
            const poNumber = `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

            await addDoc(collection(firestore, 'purchase_orders'), {
                ...newPO,
                poNumber,
                warehouseName,
                totalCost,
                createdAt: serverTimestamp(),
                supplierId: 'adhoc' // for now
            });

            toast({ title: "PO Created", description: `${poNumber} has been saved.` });
            setIsCreateOpen(false);
            setNewPO({ supplierName: '', warehouseId: '', items: [], status: 'DRAFT' });
        } catch (e) {
            console.error(e);
            toast({ title: "Error", description: "Failed to create PO", variant: "destructive" });
        }
    };

    const handleReceivePO = async (po: PurchaseOrder) => {
        if (!firestore) return;
        if (po.status === 'RECEIVED') return;
        if (!confirm(`Receive stock for ${po.poNumber}? This will update inventory.`)) return;

        try {
            const batch = writeBatch(firestore);

            // 1. Update PO Status
            const poRef = doc(firestore, 'purchase_orders', po.id);
            batch.update(poRef, {
                status: 'RECEIVED',
                receivedAt: serverTimestamp()
            });

            // 2. Update Inventory
            for (const item of po.items) {
                // Find inventory doc or create logic (simplified: assume doc exists or use set with merge)
                // Actually inventory is warehouse_inventory collection
                const invRef = doc(firestore, 'warehouse_inventory', `${po.warehouseId}_${item.productId}`);
                // Ideally check existence, but for speed using update, assuming initialization.
                // Better: set with merge and increment
                batch.set(invRef, {
                    warehouseId: po.warehouseId,
                    productId: item.productId,
                    stock: increment(item.quantity),
                    updatedAt: serverTimestamp()
                }, { merge: true });

                // 3. Log
                const logRef = doc(collection(firestore, 'inventory_logs'));
                batch.set(logRef, {
                    warehouseId: po.warehouseId,
                    productId: item.productId,
                    productName: item.name,
                    change: item.quantity,
                    reason: 'RESTOCK', // PO Receive
                    note: `PO: ${po.poNumber}`,
                    userId: 'admin', // fast track
                    userName: 'Admin',
                    timestamp: serverTimestamp()
                });
            }

            await batch.commit();
            toast({ title: "Stock Received", description: "Inventory has been updated." });
        } catch (e) {
            console.error(e);
            toast({ title: "Error", description: "Failed to receive PO.", variant: "destructive" });
        }
    };

    const filteredProducts = products?.filter(p => p.name.toLowerCase().includes(itemSearch.toLowerCase()));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Purchase Orders</h1>
                    <p className="text-muted-foreground">Manage supplier orders and stock intake.</p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Create PO
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>New Purchase Order</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Supplier Name</Label>
                                    <Input
                                        value={newPO.supplierName}
                                        onChange={e => setNewPO({ ...newPO, supplierName: e.target.value })}
                                        placeholder="e.g. Amul Distributors"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Destination Warehouse</Label>
                                    <Select
                                        value={newPO.warehouseId}
                                        onValueChange={v => setNewPO({ ...newPO, warehouseId: v })}
                                    >
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
                            </div>

                            <div className="border rounded-md p-4 bg-secondary/20">
                                <Label>Add Items</Label>
                                <div className="flex gap-2 mt-2 items-end">
                                    <div className="flex-1 space-y-1">
                                        <Label className="text-xs">Product Search</Label>
                                        <Input
                                            value={itemSearch}
                                            onChange={e => { setItemSearch(e.target.value); setSelectedProduct(null); }}
                                            placeholder="Search product..."
                                        />
                                        {itemSearch && !selectedProduct && (
                                            <div className="absolute z-10 w-64 bg-background border rounded-md shadow-md mt-1 max-h-48 overflow-auto">
                                                {filteredProducts?.map(p => (
                                                    <div k={p.id} className="p-2 hover:bg-muted cursor-pointer text-sm"
                                                        onClick={() => { setSelectedProduct(p); setItemSearch(p.name); }}>
                                                        {p.name}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="w-20 space-y-1">
                                        <Label className="text-xs">Qty</Label>
                                        <Input type="number" value={newItemQty} onChange={e => setNewItemQty(Number(e.target.value))} />
                                    </div>
                                    <div className="w-24 space-y-1">
                                        <Label className="text-xs">Cost (₹)</Label>
                                        <Input type="number" value={newItemCost} onChange={e => setNewItemCost(Number(e.target.value))} />
                                    </div>
                                    <Button onClick={handleAddItem} disabled={!selectedProduct}>Add</Button>
                                </div>
                            </div>

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Qty</TableHead>
                                        <TableHead>Cost</TableHead>
                                        <TableHead>Total</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {newPO.items.map((item, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell>{item.name}</TableCell>
                                            <TableCell>{item.quantity}</TableCell>
                                            <TableCell>{item.unitCost}</TableCell>
                                            <TableCell>{item.quantity * item.unitCost}</TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="sm" onClick={() => setNewPO(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }))}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {newPO.items.length === 0 && <TableRow><TableCell colSpan={5} className="text-center">No items added.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreatePO}>Save Purchase Order</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>PO #</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Supplier</TableHead>
                            <TableHead>Warehouse</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Total Cost</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? <TableRow><TableCell colSpan={7}>Loading...</TableCell></TableRow> :
                            pos?.map(po => (
                                <TableRow key={po.id}>
                                    <TableCell className="font-medium">{po.poNumber}</TableCell>
                                    <TableCell>{po.createdAt ? format(po.createdAt.toDate ? po.createdAt.toDate() : new Date(po.createdAt), 'MMM d, yyyy') : '-'}</TableCell>
                                    <TableCell>{po.supplierName}</TableCell>
                                    <TableCell>{po.warehouseName}</TableCell>
                                    <TableCell>
                                        <Badge variant={po.status === 'RECEIVED' ? 'default' : 'outline'}>{po.status}</Badge>
                                    </TableCell>
                                    <TableCell>₹{po.totalCost?.toLocaleString()}</TableCell>
                                    <TableCell className="space-x-2">
                                        <Button variant="ghost" size="icon" title="Print/View">
                                            <Printer className="h-4 w-4" />
                                        </Button>
                                        {po.status !== 'RECEIVED' && (
                                            <Button variant="outline" size="sm" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => handleReceivePO(po)}>
                                                <CheckCircle className="h-3 w-3 mr-1" /> Receive
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        }
                    </TableBody>
                </Table>
                {!isLoading && pos?.length === 0 && <div className="p-8 text-center text-muted-foreground">No purchase orders found.</div>}
            </div>
        </div>
    );
}
