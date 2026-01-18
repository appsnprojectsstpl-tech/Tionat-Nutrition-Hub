'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Image from "next/image";
import { MultiImageUpload } from "@/components/multi-image-upload";
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { logAdminAction } from "@/lib/audit-logger";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, PlusCircle, RefreshCw, Star } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useCollection, useFirestore, useMemoFirebase, useUser, useFirebaseApp } from "@/firebase";
import { collection, doc, writeBatch } from "firebase/firestore";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Product, Inventory, Warehouse } from "@/lib/types";
import { subCategories, categories } from "@/lib/data";
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';

import { InventoryStats } from "@/components/admin/inventory-stats";
import { WarehouseStockManager } from "@/components/admin/warehouse-stock-manager";

const productSchema = z.object({
    name: z.string().min(1, 'Product name is required'),
    price: z.coerce.number().positive('Price must be a positive number'),
    costPrice: z.coerce.number().min(0).optional(),
    categoryId: z.string().min(1, 'Category is required'),
    subcategoryId: z.string().min(1, 'Subcategory is required'),
    status: z.enum(['New Arrival', 'Coming Soon', 'Available']),
    imageUrl: z.string().optional(),
    images: z.array(z.string()).optional(),
    stock: z.coerce.number().min(0, 'Stock cannot be negative'),
    description: z.string().optional(),
    weight: z.string().optional(),
    unit: z.string().optional(),
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
    metaKeywords: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

function createSlug(name: string) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/[\s-]+/g, '-');
}

export function ProductCatalogView() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product & { stock?: number } | null>(null);
    const [stockManagerProduct, setStockManagerProduct] = useState<Product | null>(null);
    const [isStockManagerOpen, setIsStockManagerOpen] = useState(false);
    const { toast } = useToast();
    const firestore = useFirestore();

    const [stockUpdates, setStockUpdates] = useState<{ [productId: string]: number | string }>({});
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);
    const [isSyncingImages, setIsSyncingImages] = useState(false);
    const firebaseApp = useFirebaseApp();
    const storage = getStorage(firebaseApp);

    const [selectedCategory, setSelectedCategory] = useState<string>('All');

    const form = useForm<ProductFormData>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            name: '',
            price: 0,
            status: 'Available',
            imageUrl: '',
            images: [],
            stock: 0,
            description: '',
            weight: '',
            unit: 'g',
        },
    });

    useEffect(() => {
        if (editingProduct && isDialogOpen) {
            form.reset({
                name: editingProduct.name || '',
                price: editingProduct.price || 0,
                categoryId: editingProduct.categoryId || '',
                subcategoryId: editingProduct.subcategoryId || '',
                status: editingProduct.status || 'Available',
                imageUrl: editingProduct.imageUrl || '',
                images: editingProduct.images || (editingProduct.imageUrl ? [editingProduct.imageUrl] : []),
                stock: editingProduct.stock ?? 0,
                description: editingProduct.description || `Discover the authentic taste and convenience of our ${editingProduct.name}. Perfect for a quick, healthy, and delicious meal. Made with high-quality ingredients.`,
                weight: editingProduct.weight || '',
                unit: editingProduct.unit || 'g',
                metaTitle: editingProduct.metaTitle || '',
                metaDescription: editingProduct.metaDescription || '',
                metaKeywords: editingProduct.metaKeywords || '',
            });
        } else {
            form.reset({
                name: '',
                price: 0,
                categoryId: '',
                subcategoryId: '',
                status: 'Available',
                imageUrl: '',
                images: [],
                stock: 0,
                description: '',
                weight: '',
                unit: 'g',
                metaTitle: '',
                metaDescription: '',
                metaKeywords: '',
            });
        }
    }, [editingProduct, isDialogOpen, form]);


    const { user, userProfile } = useUser();

    const productsCollection = useMemoFirebase(
        () => (firestore && user ? collection(firestore, 'products') : null),
        [firestore, user]
    );
    const inventoryCollection = useMemoFirebase(
        () => (firestore && user ? collection(firestore, 'inventory') : null),
        [firestore, user]
    );
    const warehousesCollection = useMemoFirebase(
        () => (firestore && user ? collection(firestore, 'warehouses') : null),
        [firestore, user]
    );

    const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsCollection);
    const { data: inventory, isLoading: isLoadingInventory } = useCollection<Inventory>(inventoryCollection);
    const { data: warehouses } = useCollection<Warehouse>(warehousesCollection);

    const handleBulkUpdate = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !firestore || !products) return;

        setIsBulkUpdating(true);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const data = results.data as { productName: string, stock: string }[];
                if (!data.every(row => 'productName' in row && 'stock' in row)) {
                    toast({
                        title: 'Invalid CSV format',
                        description: 'CSV must have "productName" and "stock" columns.',
                        variant: 'destructive',
                    });
                    setIsBulkUpdating(false);
                    return;
                }

                const BATCH_SIZE = 400;
                let updatedCount = 0;
                let notFoundCount = 0;

                const productsByName = new Map(products.map(p => [(p.name || '').toLowerCase(), p.id]));
                const validRows: { productId: string; stock: number }[] = [];

                // 1. Prepare Valid Operations
                data.forEach(row => {
                    const stock = parseInt(row.stock, 10);
                    const productName = row.productName?.trim().toLowerCase();
                    const productId = productsByName.get(productName);

                    if (productId && !isNaN(stock)) {
                        validRows.push({ productId, stock });
                    } else if (productName) {
                        notFoundCount++;
                    }
                });

                // 2. Execute in Batches
                try {
                    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
                        const batch = writeBatch(firestore);
                        const chunk = validRows.slice(i, i + BATCH_SIZE);

                        chunk.forEach(({ productId, stock }) => {
                            const docRef = doc(firestore, 'inventory', productId);
                            batch.set(docRef, { productId, stock }, { merge: true });
                            updatedCount++;
                        });

                        await batch.commit();
                    }

                    toast({
                        title: 'Bulk Update Successful',
                        description: `${updatedCount} inventory records updated. ${notFoundCount > 0 ? `${notFoundCount} product names not found.` : ''}`,
                    });
                } catch (error) {
                    console.error("Bulk update failed: ", error);
                    toast({
                        title: 'Bulk Update Failed',
                        description: 'An error occurred while updating the inventory.',
                        variant: 'destructive',
                    });
                } finally {
                    setIsBulkUpdating(false);
                }
            },
            error: (error) => {
                console.error("CSV parsing error: ", error);
                toast({
                    title: 'CSV Parsing Error',
                    description: 'Failed to parse the CSV file.',
                    variant: 'destructive',
                });
                setIsBulkUpdating(false);
            }
        });
        event.target.value = '';
    };

    const handleSyncImages = async () => {
        if (!products || !firestore || !storage) return;
        setIsSyncingImages(true);
        let updatedCount = 0;
        let failedCount = 0;

        const batch = writeBatch(firestore);
        let batchCount = 0;

        try {
            for (const product of products) {
                if (product.imageUrl && (product.imageUrl.startsWith('/') || !product.imageUrl.startsWith('http'))) {
                    try {
                        const imageRef = ref(storage, product.imageUrl);
                        const url = await getDownloadURL(imageRef);

                        const productRef = doc(firestore, 'products', product.id);
                        batch.update(productRef, { imageUrl: url });
                        batchCount++;
                        updatedCount++;

                        if (batchCount >= 400) {
                            await batch.commit();
                            batchCount = 0;
                        }
                    } catch (error) {
                        console.error(`Failed to sync image for ${product.name}:`, error);
                        failedCount++;
                    }
                }
            }

            if (batchCount > 0) {
                await batch.commit();
            }

            toast({
                title: "Image Sync Complete",
                description: `Updated ${updatedCount} images. Failed: ${failedCount}.`,
            });
        } catch (error) {
            console.error("Sync failed:", error);
            toast({
                title: "Sync Error",
                description: "Failed to sync images.",
                variant: "destructive"
            });
        } finally {
            setIsSyncingImages(false);
        }
    };

    const handleToggleFeatured = (product: Product) => {
        if (!firestore) return;
        const productRef = doc(firestore, 'products', product.id);
        const newFeaturedStatus = !product.isFeatured;
        setDocumentNonBlocking(productRef, { isFeatured: newFeaturedStatus }, { merge: true });

        toast({
            title: newFeaturedStatus ? "Product Featured" : "Product Un-featured",
            description: `${product.name} has been ${newFeaturedStatus ? 'added to' : 'removed from'} the Home Page slider.`,
        });
    };

    const productData = useMemo(() => {
        if (!products || !inventory) return [];

        return products.map(product => {
            const inventoryItem = inventory.find(inv => inv.productId === product.id);
            const stock = inventoryItem?.stock ?? 0;
            const stockStatus = stock > 10 ? 'In Stock' : stock > 0 ? 'Low Stock' : 'Out of Stock';
            return {
                ...product,
                stock,
                stockStatus,
            };
        }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [products, inventory]);

    const filteredProducts = useMemo(() => {
        if (selectedCategory === 'All') return productData;
        return productData.filter(p => p.categoryId === selectedCategory);
    }, [productData, selectedCategory]);

    const isLoading = isLoadingProducts || isLoadingInventory;

    const onSubmit: SubmitHandler<ProductFormData> = async (data) => {
        if (!firestore) return;

        const { stock, ...productData } = data;

        if (productData.weight && !productData.unit) {
            productData.unit = 'g';
        }

        const slug = createSlug(productData.name);
        const description = productData.description || `Discover the authentic taste and convenience of our ${productData.name}. Perfect for a quick, healthy, and delicious meal. Made with high-quality ingredients.`;

        if (productData.images && productData.images.length > 0) {
            productData.imageUrl = productData.images[0];
        }

        const safeProductData = {
            ...productData,
            slug,
            description,
            weight: productData.weight || null,
            unit: productData.unit || null,
        };

        if (editingProduct) {
            const productRef = doc(firestore, 'products', editingProduct.id);
            setDocumentNonBlocking(productRef, safeProductData, { merge: true });

            const inventoryRef = doc(firestore, 'inventory', editingProduct.id);
            setDocumentNonBlocking(inventoryRef, { productId: editingProduct.id, stock }, { merge: true });

            logAdminAction({
                action: 'PRODUCT_UPDATE',
                performedBy: user?.email || 'unknown',
                targetId: editingProduct.id,
                targetType: 'PRODUCT',
                details: `Updated product: ${data.name}. Price: ${data.price}, Stock: ${stock}`
            });

            toast({
                title: "Product Updated",
                description: `${data.name} has been successfully updated.`,
            });
        } else {
            const newProductRef = doc(collection(firestore, 'products'));
            setDocumentNonBlocking(newProductRef, { ...safeProductData, id: newProductRef.id }, { merge: true });

            const inventoryRef = doc(firestore, 'inventory', newProductRef.id);
            setDocumentNonBlocking(inventoryRef, { productId: newProductRef.id, stock }, { merge: true });

            logAdminAction({
                action: 'PRODUCT_CREATE',
                performedBy: user?.email || 'unknown',
                targetId: newProductRef.id,
                targetType: 'PRODUCT',
                details: `Created new product: ${data.name}. Price: ${data.price}, Stock: ${stock}`
            });

            toast({
                title: "Product Added",
                description: `${data.name} has been successfully added.`,
            });
        }

        form.reset();
        setIsDialogOpen(false);
        setEditingProduct(null);
    };

    const handleDelete = (productId: string, productName: string) => {
        if (!firestore) return;
        if (confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
            const docRef = doc(firestore, 'products', productId);
            deleteDocumentNonBlocking(docRef);

            const invDocRef = doc(firestore, 'inventory', productId);
            deleteDocumentNonBlocking(invDocRef);

            logAdminAction({
                action: 'PRODUCT_DELETE',
                performedBy: user?.email || 'unknown',
                targetId: productId,
                targetType: 'PRODUCT',
                details: `Deleted product: ${productName}`
            });

            toast({
                title: "Product Deleted",
                description: `${productName} has been removed.`,
                variant: "destructive",
            });
        }
    };

    const handleOpenDialog = (product: (Product & { stock?: number }) | null) => {
        setEditingProduct(product);
        setIsDialogOpen(true);
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-2 ml-auto">
                    {userProfile?.role !== 'warehouse_admin' && (
                        <Button size="sm" variant="outline" asChild className="gap-1">
                            <Link href="/admin/products/bulk-edit">Bulk Edit</Link>
                        </Button>
                    )}
                    {userProfile?.role !== 'warehouse_admin' && (
                        <Dialog open={isDialogOpen} onOpenChange={(open) => {
                            setIsDialogOpen(open);
                            if (!open) setEditingProduct(null);
                        }}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="gap-1" onClick={() => handleOpenDialog(null)}>
                                    <PlusCircle className="h-4 w-4" />
                                    Add Product
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-xl">
                                <DialogHeader>
                                    <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                                    <DialogDescription>
                                        {editingProduct ? 'Update the details for this product.' : 'Fill in the details for the new product.'}
                                    </DialogDescription>
                                </DialogHeader>
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                                        <FormField
                                            control={form.control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Name</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="e.g. Idli Mix" {...field} value={field.value ?? ''} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <div className="flex gap-4">
                                            <FormField
                                                control={form.control}
                                                name="price"
                                                render={({ field }) => (
                                                    <FormItem className="flex-1">
                                                        <FormLabel>Price (Sales)</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" placeholder="120" {...field} value={field.value ?? 0} onChange={e => field.onChange(e.target.valueAsNumber || 0)} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="costPrice"
                                                render={({ field }) => (
                                                    <FormItem className="flex-1">
                                                        <FormLabel>Cost Price</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" placeholder="80" {...field} value={field.value ?? 0} onChange={e => field.onChange(e.target.valueAsNumber || 0)} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <div className="flex gap-4">
                                            <FormField
                                                control={form.control}
                                                name="weight"
                                                render={({ field }) => (
                                                    <FormItem className="flex-1">
                                                        <FormLabel>Weight/Qty</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="e.g. 500" {...field} value={field.value ?? ''} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="unit"
                                                render={({ field }) => (
                                                    <FormItem className="w-24">
                                                        <FormLabel>Unit</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value ?? 'g'} defaultValue="g">
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Unit" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="g">g</SelectItem>
                                                                <SelectItem value="kg">kg</SelectItem>
                                                                <SelectItem value="ml">ml</SelectItem>
                                                                <SelectItem value="L">L</SelectItem>
                                                                <SelectItem value="pcs">pcs</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <FormField
                                            control={form.control}
                                            name="stock"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Initial Stock</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" placeholder="50" {...field} value={field.value ?? 0} onChange={e => field.onChange(e.target.valueAsNumber || 0)} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="categoryId"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Category</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select a category" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="subcategoryId"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Subcategory</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select a subcategory" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {subCategories.map(sub => <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="status"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Status</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select a status" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="Available">Available</SelectItem>
                                                            <SelectItem value="New Arrival">New Arrival</SelectItem>
                                                            <SelectItem value="Coming Soon">Coming Soon</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="images"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Product Gallery (Front, Back, etc.)</FormLabel>
                                                    <FormControl>
                                                        <MultiImageUpload
                                                            value={field.value || []}
                                                            onChange={field.onChange}
                                                            disabled={isLoading}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <DialogFooter className="sticky bottom-0 bg-background pt-4">
                                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                            <Button type="submit">Save product</Button>
                                        </DialogFooter>
                                    </form>
                                </Form>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>
            <Card className="p-4">
                <Label htmlFor="csv-upload" className="text-sm font-medium">Bulk Update Stock via CSV</Label>
                <p className="text-xs text-muted-foreground mb-2">Upload a CSV with 'productName' and 'stock' columns to update inventory.</p>
                <Input id="csv-upload" type="file" accept=".csv" onChange={handleBulkUpdate} disabled={isBulkUpdating} className="text-xs" />
                {isBulkUpdating && <p className="text-xs text-muted-foreground mt-2">Processing file...</p>}
            </Card>

            <Card className="p-4 flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-medium">Sync Storage URLs</h3>
                    <p className="text-xs text-muted-foreground">Fix broken images by resolving storage paths to public URLs.</p>
                </div>
                <Button size="sm" variant="secondary" onClick={handleSyncImages} disabled={isSyncingImages}>
                    <RefreshCw className={cn("h-4 w-4 mr-2", isSyncingImages && "animate-spin")} />
                    {isSyncingImages ? 'Syncing...' : 'Sync Images'}
                </Button>
            </Card>

            <InventoryStats products={products || []} inventory={inventory || []} />

            <div className="flex flex-wrap gap-2 pb-2">
                <Button
                    variant={selectedCategory === 'All' ? 'default' : 'outline'}
                    size="sm"
                    className="rounded-full"
                    onClick={() => setSelectedCategory('All')}
                >
                    All Products
                </Button>
                {categories.map(cat => (
                    <Button
                        key={cat.id}
                        variant={selectedCategory === cat.id ? 'default' : 'outline'}
                        size="sm"
                        className="rounded-full"
                        onClick={() => setSelectedCategory(cat.id)}
                    >
                        {cat.name}
                    </Button>
                ))}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Product Catalog & Inventory</CardTitle>
                    <CardDescription>
                        Manage your products and their stock levels.
                    </CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="hidden w-[64px] sm:table-cell">
                                    Image
                                </TableHead>
                                <TableHead>Featured</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="hidden md:table-cell">Price</TableHead>
                                <TableHead>Stock Status</TableHead>
                                <TableHead className="w-[150px]">Stock Level</TableHead>
                                <TableHead className="text-right">Qty</TableHead>
                                <TableHead className="sticky right-0 bg-card">
                                    <span className="sr-only">Actions</span>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && <TableRow><TableCell colSpan={8} className="text-center py-4">Loading products...</TableCell></TableRow>}
                            {filteredProducts?.map((product) => {
                                const productWithStock = { ...product, stock: product.stock ?? 0 };
                                const stockPercent = Math.min(((product.stock ?? 0) / 100) * 100, 100);

                                return (
                                    <TableRow key={product.id}>
                                        <TableCell className="hidden sm:table-cell py-2">
                                            {product.imageUrl && (
                                                <Image
                                                    alt={product.name}
                                                    className="aspect-square rounded-md object-cover"
                                                    height="48"
                                                    src={product.imageUrl}
                                                    width="48"
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50"
                                                onClick={() => handleToggleFeatured(product)}
                                            >
                                                <Star className={cn("h-4 w-4", product.isFeatured ? "fill-current" : "")} />
                                            </Button>
                                        </TableCell>
                                        <TableCell className="font-medium text-xs sm:text-sm">{product.name}</TableCell>
                                        <TableCell>
                                            <Badge variant={product.status === 'New Arrival' ? 'default' : 'secondary'} className={cn('text-[10px] sm:text-xs', product.status === 'Coming Soon' && 'bg-muted text-muted-foreground')}>
                                                {product.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            {(product.price || 0).toFixed(2)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={product.stockStatus === 'Out of Stock' ? 'destructive' : product.stockStatus === 'Low Stock' ? 'secondary' : 'default'} className={cn('text-[10px] sm:text-xs', product.stockStatus === 'Low Stock' && 'bg-yellow-200 text-yellow-800 hover:bg-yellow-200/80')}>
                                                {product.stockStatus}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 flex-1 bg-secondary rounded-full overflow-hidden w-20">
                                                    <div
                                                        className={cn("h-full rounded-full",
                                                            stockPercent < 10 ? "bg-red-500" :
                                                                stockPercent < 30 ? "bg-yellow-500" : "bg-green-500"
                                                        )}
                                                        style={{ width: `${stockPercent}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-20 justify-center h-7 text-xs"
                                                onClick={() => {
                                                    setStockManagerProduct(product);
                                                    setIsStockManagerOpen(true);
                                                }}
                                            >
                                                {product.stock}
                                            </Button>
                                        </TableCell>
                                        <TableCell className="sticky right-0 bg-card">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button aria-haspopup="true" size="icon" variant="ghost">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                        <span className="sr-only">Toggle menu</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => {
                                                        setStockManagerProduct(product);
                                                        setIsStockManagerOpen(true);
                                                    }}>
                                                        Manage Stock (Warehouses)
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => handleOpenDialog(productWithStock)}>Quick Edit (Modal)</DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/admin/product-editor?id=${product.id}`}>Full Page Edit</Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDelete(product.id, product.name)} className="text-red-500 focus:text-red-500">Delete</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow >
                                )
                            })}
                            {
                                !isLoading && filteredProducts.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-4">No products found matching filters.</TableCell>
                                    </TableRow>
                                )
                            }
                        </TableBody >
                    </Table >
                </CardContent >
            </Card >
            {stockManagerProduct && (
                <WarehouseStockManager
                    open={isStockManagerOpen}
                    onOpenChange={setIsStockManagerOpen}
                    product={stockManagerProduct}
                    warehouses={warehouses || []}
                    lockedWarehouseId={userProfile?.role === 'warehouse_admin' ? userProfile?.managedWarehouseId : undefined}
                />
            )}
        </div >
    );
}
