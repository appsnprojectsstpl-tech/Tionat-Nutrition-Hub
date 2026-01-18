'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useFirestore, useUser } from '@/firebase'; // Added useUser
import { doc, getDoc, setDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore'; // Added addDoc, collection
import { Loader2, Save } from 'lucide-react';
import { Warehouse, Product, StockAdjustmentReason } from '@/lib/types'; // Added Reason type
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

interface WarehouseStockManagerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product: Product;
    warehouses: Warehouse[];
    lockedWarehouseId?: string; // New Prop
}

export function WarehouseStockManager({ open, onOpenChange, product, warehouses, lockedWarehouseId }: WarehouseStockManagerProps) {
    const firestore = useFirestore();
    const { userProfile } = useUser(); // Get current user for audit
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [stocks, setStocks] = useState<{ [key: string]: number }>({});
    const [originalStocks, setOriginalStocks] = useState<{ [key: string]: number }>({}); // Track original for diff
    const [reasons, setReasons] = useState<{ [key: string]: StockAdjustmentReason }>({}); // Reason per warehouse change

    // Filter warehouses if locked
    const displayWarehouses = lockedWarehouseId
        ? warehouses.filter(w => w.id === lockedWarehouseId)
        : warehouses;

    useEffect(() => {
        if (open && firestore && product) {
            fetchStocks();
        }
    }, [open, firestore, product, warehouses]); // Re-fetch if warehouses change? mainly open.

    const fetchStocks = async () => {
        if (!firestore) return;
        setIsLoading(true);
        const newStocks: { [key: string]: number } = {};
        const newOriginals: { [key: string]: number } = {};

        try {
            // Can be optimized with a query, but getting individual docs is safer for now
            // Or use the `warehouse_inventory` collection query.
            // For now, simple loop is fine for < 20 warehouses.
            await Promise.all(displayWarehouses.map(async (wh) => {
                const docRef = doc(firestore, 'warehouse_inventory', `${wh.id}_${product.id}`);
                const snap = await getDoc(docRef);
                const val = snap.exists() ? snap.data().stock : 0;
                newStocks[wh.id] = val;
                newOriginals[wh.id] = val;
            }));
            setStocks(newStocks);
            setOriginalStocks(newOriginals);
            setReasons({}); // Reset reasons
        } catch (error) {
            console.error("Error fetching stocks", error);
            toast({ title: "Error", description: "Failed to load stock data", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleStockChange = (warehouseId: string, value: string) => {
        const num = parseInt(value);
        if (!isNaN(num) && num >= 0) {
            setStocks(prev => ({ ...prev, [warehouseId]: num }));
        }
    };

    const handleReasonChange = (warehouseId: string, value: StockAdjustmentReason) => {
        setReasons(prev => ({ ...prev, [warehouseId]: value }));
    }

    const handleSave = async () => {
        if (!firestore || !userProfile) return;
        setIsLoading(true);

        try {
            let changesMade = 0;
            const logsToCreate: any[] = [];
            const writes: Promise<any>[] = [];

            for (const wh of displayWarehouses) {
                const oldStock = originalStocks[wh.id] || 0;
                const newStock = stocks[wh.id] || 0;

                if (oldStock !== newStock) {
                    const reason = reasons[wh.id];
                    if (!reason) {
                        toast({
                            title: "Missing Reason",
                            description: `Please select a reason for the change at ${wh.name}`,
                            variant: "destructive"
                        });
                        setIsLoading(false);
                        return; // Stop save
                    }

                    changesMade++;
                    const docId = `${wh.id}_${product.id}`;
                    const docRef = doc(firestore, 'warehouse_inventory', docId);

                    // 1. Update Stock
                    writes.push(
                        setDoc(docRef, {
                            warehouseId: wh.id,
                            productId: product.id,
                            stock: newStock,
                            updatedAt: serverTimestamp()
                        }, { merge: true })
                    );

                    // 2. Prepare Audit Log
                    logsToCreate.push({
                        warehouseId: wh.id,
                        productId: product.id,
                        productName: product.name,
                        oldStock,
                        newStock,
                        change: newStock - oldStock,
                        reason,
                        userId: userProfile.id,
                        userName: `${userProfile.firstName} ${userProfile.lastName}`,
                        timestamp: serverTimestamp()
                    });
                }
            }

            if (changesMade === 0) {
                onOpenChange(false);
                setIsLoading(false);
                return;
            }

            // Save Stocks
            await Promise.all(writes);

            // Save Logs (Sequential or parallel doesn't matter much here, but separate collection)
            const logsCollection = collection(firestore, 'inventory_logs');
            await Promise.all(logsToCreate.map(log => addDoc(logsCollection, log)));

            toast({ title: "Success", description: `Updated stock for ${changesMade} warehouse(s).` });
            onOpenChange(false);

        } catch (error) {
            console.error("Error saving stock", error);
            toast({ title: "Error", description: "Failed to save changes", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Manage Stock: {product.name}</DialogTitle>
                    <DialogDescription>
                        {lockedWarehouseId
                            ? "Update inventory for your warehouse. Audit log is active."
                            : "Set stock levels across all warehouses. Corrections require a reason code."}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {isLoading && displayWarehouses.length === 0 ? (
                        <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : (
                        <div className="max-h-[400px] overflow-y-auto border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Warehouse</TableHead>
                                        <TableHead>Current Stock</TableHead>
                                        <TableHead>Reason</TableHead>
                                        <TableHead className="w-[120px]">New Qty</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {displayWarehouses.map((wh) => (
                                        <TableRow key={wh.id}>
                                            <TableCell>
                                                <div className="font-medium">{wh.name}</div>
                                                <div className="text-xs text-muted-foreground">{wh.city}</div>
                                            </TableCell>
                                            <TableCell>
                                                {isLoading ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold">{originalStocks[wh.id] ?? '-'}</span>
                                                        {(originalStocks[wh.id] || 0) < 10 && (
                                                            <span className="text-xs text-red-500 font-medium">Low</span>
                                                        )}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    value={reasons[wh.id] || ''}
                                                    onValueChange={(val) => handleReasonChange(wh.id, val as StockAdjustmentReason)}
                                                    disabled={stocks[wh.id] === originalStocks[wh.id]}
                                                >
                                                    <SelectTrigger className="w-[140px] h-8 text-xs">
                                                        <SelectValue placeholder="Reason" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="RESTOCK">Restock</SelectItem>
                                                        <SelectItem value="CORRECTION">Correction</SelectItem>
                                                        <SelectItem value="DAMAGE">Damage</SelectItem>
                                                        <SelectItem value="SHRINKAGE">Shrinkage</SelectItem>
                                                        <SelectItem value="OTHER">Other</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    className="w-20 h-8"
                                                    value={stocks[wh.id] ?? ''}
                                                    onChange={(e) => handleStockChange(wh.id, e.target.value)}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isLoading}>
                        {isLoading ? 'Saving...' : 'Update Inventory'}
                    </Button>
                </DialogFooter>
            </DialogContent >
        </Dialog >
    );
}
