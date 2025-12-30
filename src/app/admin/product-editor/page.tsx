'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useDoc, useFirestore, useFunctions, useUser } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, ArrowLeft } from 'lucide-react';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';

function ProductEditContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const id = searchParams.get('id');
    const firestore = useFirestore();
    const functions = useFunctions();
    const { toast } = useToast();

    // Refs
    // Assuming product data is in 'products' and inventory in 'inventory' (or product.stock?)
    // Phase 3 implementation in functions checked 'inventory' collection.
    // So we fetch product for details, and inventory for stock.

    const [product, setProduct] = useState<any>(null);
    const [stock, setStock] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);

    // Local form state
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');

    // Inventory adjustment state
    const [adjustValue, setAdjustValue] = useState('');

    const { user, isUserLoading } = useUser();

    // ...

    useEffect(() => {
        if (!firestore || !id || isUserLoading || !user) return;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Fetch Product
                const pSnap = await (await import('firebase/firestore')).getDoc(doc(firestore, 'products', id));
                if (pSnap.exists()) {
                    const pData = pSnap.data();
                    setProduct(pData);
                    setName(pData.name);
                    setPrice(pData.price?.toString() || '0');
                }

                // Fetch Inventory
                const iSnap = await (await import('firebase/firestore')).getDoc(doc(firestore, 'inventory', id));
                if (iSnap.exists()) {
                    setStock(iSnap.data().stock || 0);
                } else {
                    // Fallback if no inventory doc yet
                    setStock(0);
                }

            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [firestore, id]);

    const handleSaveDetails = async () => {
        if (!firestore || !id) return;
        try {
            await updateDoc(doc(firestore, 'products', id), {
                name,
                price: parseFloat(price)
            });
            toast({ title: "Product Updated" });
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        }
    };

    const handleAdjustStock = async (type: 'set' | 'increment' | 'decrement') => {
        if (!functions || !adjustValue || !id) return;
        const val = parseInt(adjustValue);
        if (isNaN(val)) return;

        try {
            const adjustFn = httpsCallable(functions, 'adjustInventory');
            await adjustFn({
                productId: id,
                change: val,
                type
            });

            toast({ title: "Stock Updated" });
            setAdjustValue('');
            // Refresh stock
            const iSnap = await (await import('firebase/firestore')).getDoc(doc(firestore!, 'inventory', id));
            if (iSnap.exists()) {
                setStock(iSnap.data().stock || 0);
            }
        } catch (e: any) {
            toast({ title: "Stock Update Failed", description: e.message, variant: "destructive" });
        }
    };

    if (!id) return <div className="p-10 text-center">No Product ID provided.</div>;
    if (isLoading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>;
    if (!product) return <div className="p-10">Product not found.</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/admin/products"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <h1 className="text-2xl font-bold font-headline">Edit Product</h1>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader><CardTitle>Basic Details</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Product Name</Label>
                            <Input value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Price (₹)</Label>
                            <Input type="number" value={price} onChange={e => setPrice(e.target.value)} />
                        </div>
                        <Button onClick={handleSaveDetails} className="w-full">
                            <Save className="mr-2 h-4 w-4" /> Save Details
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Inventory Management</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        <div className="text-center p-6 bg-secondary/20 rounded-lg">
                            <div className="text-sm text-muted-foreground">Current Stock</div>
                            <div className="text-4xl font-mono font-bold">{stock}</div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Adjustment Amount</Label>
                                <Input type="number" placeholder="Enter quantity..." value={adjustValue} onChange={e => setAdjustValue(e.target.value)} />
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <Button variant="outline" onClick={() => handleAdjustStock('increment')}>
                                    + Add
                                </Button>
                                <Button variant="outline" onClick={() => handleAdjustStock('decrement')}>
                                    - Remove
                                </Button>
                                <Button variant="secondary" onClick={() => handleAdjustStock('set')}>
                                    Set Exact
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground text-center">
                                Updates are transactional and safe.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default function AdminProductEditPage() {
    return (
        <Suspense fallback={<div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>}>
            <ProductEditContent />
        </Suspense>
    );
}
