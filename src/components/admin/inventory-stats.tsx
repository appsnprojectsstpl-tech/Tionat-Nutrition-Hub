import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Product, Inventory } from "@/lib/types";
import { AlertTriangle, IndianRupee, Package, PackageOpen } from "lucide-react";

interface InventoryStatsProps {
    products: Product[];
    inventory: Inventory[];
}

export function InventoryStats({ products, inventory }: InventoryStatsProps) {
    if (!products || !inventory) return null;

    // 1. Total Products
    const totalProducts = products.length;

    // 2. Total Inventory Value (Price * Stock)
    const totalValue = products.reduce((acc, product) => {
        const invItem = inventory.find(i => i.productId === product.id);
        const stock = invItem ? invItem.stock : 0;
        return acc + (product.price * stock);
    }, 0);

    // 3. Low Stock Items (< 10)
    const lowStockCount = products.filter(product => {
        const invItem = inventory.find(i => i.productId === product.id);
        const stock = invItem ? invItem.stock : 0;
        return stock > 0 && stock <= 10;
    }).length;

    // 4. Out of Stock Items (0)
    const outOfStockCount = products.filter(product => {
        const invItem = inventory.find(i => i.productId === product.id);
        const stock = invItem ? invItem.stock : 0;
        return stock === 0;
    }).length;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Total Value
                    </CardTitle>
                    <IndianRupee className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">₹{totalValue.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                        Across {totalProducts} SKUs
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Total Products
                    </CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalProducts}</div>
                    <p className="text-xs text-muted-foreground">
                        Active catalog items
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Low Stock
                    </CardTitle>
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">{lowStockCount}</div>
                    <p className="text-xs text-muted-foreground">
                        Items with &le; 10 units
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Out of Stock
                    </CardTitle>
                    <PackageOpen className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-red-600">{outOfStockCount}</div>
                    <p className="text-xs text-muted-foreground">
                        Restock immediately
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
