'use client';

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Printer, Plus, Search } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function BarcodeLabelsPage() {
    const firestore = useFirestore();

    const productsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'products');
    }, [firestore]);

    const { data: products } = useCollection<Product>(productsQuery);

    const [itemSearch, setItemSearch] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [qty, setQty] = useState(1);
    const [printQueue, setPrintQueue] = useState<{ product: Product; quantity: number }[]>([]);

    const handleAdd = () => {
        if (!selectedProduct) return;
        setPrintQueue(prev => [...prev, { product: selectedProduct, quantity: qty }]);
        setSelectedProduct(null);
        setItemSearch('');
        setQty(1);
    };

    const handlePrint = () => {
        window.print();
    };

    const filteredProducts = products?.filter(p => p.name.toLowerCase().includes(itemSearch.toLowerCase()));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center print:hidden">
                <h1 className="text-3xl font-bold font-headline">Barcode Labels</h1>
                <Button onClick={handlePrint} disabled={printQueue.length === 0}>
                    <Printer className="mr-2 h-4 w-4" /> Print Labels
                </Button>
            </div>

            {/* Selection Area - Hidden on Print */}
            <div className="print:hidden border rounded-md p-6 bg-card">
                <div className="flex gap-4 items-end">
                    <div className="flex-1 space-y-2 relative">
                        <label className="text-sm font-medium">Search Product</label>
                        <Input
                            value={itemSearch}
                            onChange={e => { setItemSearch(e.target.value); setSelectedProduct(null); }}
                            placeholder="Type product name..."
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
                    <div className="w-24 space-y-2">
                        <label className="text-sm font-medium">Quantity</label>
                        <Input type="number" value={qty} onChange={e => setQty(Number(e.target.value))} min={1} />
                    </div>
                    <Button onClick={handleAdd} disabled={!selectedProduct}>
                        <Plus className="mr-2 h-4 w-4" /> Add to Queue
                    </Button>
                </div>

                <div className="mt-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead>SKU/ID</TableHead>
                                <TableHead>Quantity</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {printQueue.map((item, idx) => (
                                <TableRow key={idx}>
                                    <TableCell>{item.product.name}</TableCell>
                                    <TableCell>{item.product.id}</TableCell>
                                    <TableCell>{item.quantity}</TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="sm" onClick={() => setPrintQueue(prev => prev.filter((_, i) => i !== idx))}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {printQueue.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Queue is empty.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Printable Area */}
            <div id="printable-area" className="grid grid-cols-3 gap-4 print:grid-cols-3 print:gap-2">
                {printQueue.flatMap((item, itemIdx) => (
                    Array.from({ length: item.quantity }).map((_, i) => (
                        <div key={`${itemIdx}-${i}`} className="border p-4 flex flex-col items-center justify-center text-center h-[150px] bg-white print:border print:border-black print:page-break-inside-avoid">
                            <p className="text-xs font-bold uppercase truncate max-w-full">{item.product.name}</p>
                            <div className="text-4xl my-2" style={{ fontFamily: '"Libre Barcode 39 Text", cursive' }}>
                                *{item.product.id.slice(0, 8).toUpperCase()}*
                            </div>
                            <p className="text-sm font-semibold">₹{item.product.price}</p>
                        </div>
                    ))
                ))}
            </div>

            <style jsx global>{`
                @media print {
                    @page { margin: 0.5cm; }
                    body * {
                        visibility: hidden;
                    }
                    #printable-area, #printable-area * {
                        visibility: visible;
                    }
                    #printable-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    /* Hide sidebar and headers provided by app-shell/layout if they persist */
                    aside, header, nav { display: none !important; }
                }
            `}</style>
        </div>
    );
}
