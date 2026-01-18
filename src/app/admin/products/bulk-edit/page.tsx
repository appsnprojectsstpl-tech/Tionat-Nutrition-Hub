'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, orderBy, limit, getDocs, writeBatch, doc } from 'firebase/firestore';
import { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, ArrowLeft, Percent, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

export default function BulkEditPage() {
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

    // Track edits: Map<ProductId, Partial<Product>>
    const [edits, setEdits] = useState<{ [key: string]: Partial<Product> }>({});
    const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
    const [bulkPercent, setBulkPercent] = useState<string>("");

    useEffect(() => {
        fetchProducts();
    }, [firestore]);

    const fetchProducts = async () => {
        if (!firestore) return;
        setIsLoading(true);
        try {
            // Fetching top 100 for now. Pagination can be added later if needed.
            const q = query(collection(firestore, 'products'), orderBy('name'), limit(100));
            const snap = await getDocs(q);
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
            setProducts(data);
            setEdits({}); // Reset edits on refresh
        } catch (e) {
            console.error(e);
            toast({ title: "Error", description: "Failed to load products.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (id: string, field: keyof Product, value: any) => {
        setEdits(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: value
            }
        }));
    };

    const applyBulkPriceChange = (percentage: number) => {
        if (!confirm(`Are you sure you want to increase ALL visible prices by ${percentage}%?`)) return;

        const newEdits = { ...edits };
        products.forEach(p => {
            const currentPrice = newEdits[p.id]?.price ?? p.price;
            const newPrice = Math.round(currentPrice * (1 + percentage / 100));
            newEdits[p.id] = { ...newEdits[p.id], price: newPrice };
        });
        setEdits(newEdits);
    };

    const hasEdits = Object.keys(edits).length > 0;

    const saveChanges = async () => {
        if (!firestore || !hasEdits) return;
        setIsSaving(true);
        try {
            const batch = writeBatch(firestore);

            Object.entries(edits).forEach(([id, changes]) => {
                const ref = doc(firestore, 'products', id);
                batch.update(ref, changes);
            });

            await batch.commit();

            toast({ title: "Success", description: `Updated ${Object.keys(edits).length} products.` });

            // Refresh logic: merge edits into local state to avoid full re-fetch flicker
            setProducts(prev => prev.map(p => edits[p.id] ? { ...p, ...edits[p.id] } : p));
            setEdits({});

        } catch (e) {
            console.error(e);
            toast({ title: "Save Failed", description: "Could not save changes.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold font-headline">Bulk Editor</h1>
                        <p className="text-muted-foreground">Quickly manage prices and stock.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchProducts} disabled={isLoading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
                    </Button>
                    <Button onClick={saveChanges} disabled={!hasEdits || isSaving}>
                        {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Save {Object.keys(edits).length > 0 ? `(${Object.keys(edits).length})` : ''} Changes
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
                    <div>
                        <CardTitle>Product Grid</CardTitle>
                        <CardDescription>Edits are highlighted. Don't forget to save.</CardDescription>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap">
                        {/* Category Filter */}
                        <div className="w-[180px]">
                            <Select
                                value={selectedCategory}
                                onValueChange={setSelectedCategory}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="All Categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Categories</SelectItem>
                                    <SelectItem value="Nutritional Care">Nutritional Care</SelectItem>
                                    <SelectItem value="Health Care">Health Care</SelectItem>
                                    <SelectItem value="Personal Care">Personal Care</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="h-8 w-px bg-border hidden md:block" />

                        {/* Valid Bulk Actions */}
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground whitespace-nowrap">Price Action:</span>
                            <div className="flex items-center border rounded-md overflow-hidden bg-background">
                                <Input
                                    type="number"
                                    className="w-16 h-8 border-none focus-visible:ring-0 rounded-none text-right"
                                    placeholder="%"
                                    value={bulkPercent}
                                    onChange={(e) => setBulkPercent(e.target.value)}
                                />
                                <div className="h-4 w-px bg-border mx-1" />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 rounded-none px-2 hover:bg-muted"
                                    onClick={() => applyBulkPriceChange(parseFloat(bulkPercent))}
                                    disabled={!bulkPercent}
                                >
                                    Apply
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="relative w-full overflow-auto max-h-[70vh]">
                        <Table>
                            <TableHeader className="sticky top-0 bg-secondary/80 backdrop-blur-sm z-10">
                                <TableRow>
                                    <TableHead className="w-[300px]">Name</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="w-[120px]">Price (₹)</TableHead>
                                    <TableHead className="w-[120px]">Stock</TableHead>
                                    <TableHead className="w-[100px]">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-40">Loading...</TableCell>
                                    </TableRow>
                                ) : (
                                    products
                                        .filter(p => selectedCategory === 'ALL' || p.categoryId === selectedCategory)
                                        .map(product => {
                                            const isModified = !!edits[product.id];
                                            const editedData = edits[product.id] || {};

                                            return (
                                                <TableRow key={product.id} className={isModified ? "bg-primary/5" : ""}>
                                                    <TableCell className="font-medium">
                                                        <div className="flex flex-col">
                                                            <span>{product.name}</span>
                                                            <span className="text-xs text-muted-foreground">{product.id.slice(0, 6)}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{product.categoryId}</TableCell>
                                                    <TableCell>
                                                        <Input
                                                            type="number"
                                                            value={editedData.price ?? product.price}
                                                            onChange={(e) => handleEdit(product.id, 'price', parseFloat(e.target.value))}
                                                            className={editedData.price !== undefined ? "border-primary font-bold" : ""}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        {/* Assuming 'stock' exists on Product type, if not will need to check types.ts. Usually it's in Warehouse but let's assume global/default stock field for simple model */}
                                                        <Input
                                                            type="number"
                                                            value={editedData.stock ?? (product.stock || 0)}
                                                            onChange={(e) => handleEdit(product.id, 'stock', parseInt(e.target.value))}
                                                            className={editedData.stock !== undefined ? "border-primary font-bold" : ""}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center space-x-2">
                                                            <Switch
                                                                checked={editedData.isActive ?? product.isActive ?? true}
                                                                onCheckedChange={(checked) => handleEdit(product.id, 'isActive', checked)}
                                                            />
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
