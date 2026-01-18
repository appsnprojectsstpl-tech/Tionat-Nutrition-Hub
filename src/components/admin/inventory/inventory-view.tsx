'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Product, WarehouseInventory, Warehouse } from '@/lib/types';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, SlidersHorizontal, AlertTriangle } from "lucide-react";
import { WarehouseStockManager } from "@/components/admin/warehouse-stock-manager";

export function InventoryView() {
    const { userProfile, isUserLoading } = useUser();
    const firestore = useFirestore();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isStockManagerOpen, setIsStockManagerOpen] = useState(false);

    // Queries
    const productsCollection = useMemoFirebase(
        () => firestore ? collection(firestore, 'products') : null,
        [firestore]
    );
    const { data: products, isLoading: isProductsLoading } = useCollection<Product>(productsCollection);

    const warehousesCollection = useMemoFirebase(
        () => firestore ? collection(firestore, 'warehouses') : null,
        [firestore]
    );
    const { data: warehouses, isLoading: isWarehousesLoading } = useCollection<Warehouse>(warehousesCollection);

    // Filter logic
    const filteredProducts = useMemo(() => {
        if (!products) return [];
        return products.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [products, searchTerm]);

    const isLoading = isUserLoading || isProductsLoading || isWarehousesLoading;

    if (isLoading) {
        return (
            <div className="flex h-[20vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!userProfile) return null;

    // Safety Check
    const managedWarehouseId = userProfile.role === 'warehouse_admin' ? userProfile.managedWarehouseId : null;
    const isSuperAdmin = userProfile.role === 'superadmin';

    if (!isSuperAdmin && !managedWarehouseId) {
        return (
            <div className="flex flex-col items-center justify-center h-[20vh] text-center">
                <AlertTriangle className="h-10 w-10 text-yellow-500 mb-4" />
                <h2 className="text-xl font-bold">Access Restricted</h2>
                <p className="text-muted-foreground">
                    You are not assigned to manage any specific warehouse.
                    Please contact an administrator.
                </p>
            </div>
        )
    }

    const currentWarehouse = warehouses?.find(w => w.id === managedWarehouseId);

    const handleOpenStockManager = (product: Product) => {
        setSelectedProduct(product);
        setIsStockManagerOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <p className="text-muted-foreground">
                    {isSuperAdmin
                        ? "Manage stock across all locations."
                        : `Managing inventory for: ${currentWarehouse?.name || 'Unknown Warehouse'}`
                    }
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Products & Stock</CardTitle>
                    <CardDescription>
                        Update stock levels for your warehouse.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search products..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[80px]">Image</TableHead>
                                    <TableHead>Product Name</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Catalog Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredProducts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                                            No products found matching your search.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredProducts.map((product) => (
                                        <TableRow key={product.id}>
                                            <TableCell>
                                                {product.imageUrl ? (
                                                    <img
                                                        src={product.imageUrl}
                                                        alt={product.name}
                                                        className="h-10 w-10 object-cover rounded-md border"
                                                    />
                                                ) : (
                                                    <div className="h-10 w-10 bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground">
                                                        Img
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-medium">{product.name}</TableCell>
                                            <TableCell>
                                                <span className="text-xs text-muted-foreground font-mono">
                                                    {product.categoryId}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={product.status === 'Available' ? 'outline' : 'secondary'}>
                                                    {product.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => handleOpenStockManager(product)}
                                                >
                                                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                                                    Manage Stock
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {selectedProduct && warehouses && (
                <WarehouseStockManager
                    open={isStockManagerOpen}
                    onOpenChange={setIsStockManagerOpen}
                    product={selectedProduct}
                    warehouses={warehouses}
                    lockedWarehouseId={isSuperAdmin ? undefined : managedWarehouseId!}
                />
            )}
        </div>
    );
}
