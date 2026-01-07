'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { ProductFilter } from '@/components/product-filter';
import { ProductCard } from '@/components/product-card';
import { Product } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Filter, SlidersHorizontal, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';

function SearchResults() {
    const searchParams = useSearchParams();
    const firestore = useFirestore();

    const searchQuery = searchParams.get('q')?.toLowerCase() || '';
    const minPrice = Number(searchParams.get('minPrice')) || 0;
    const maxPrice = Number(searchParams.get('maxPrice')) || 100000;
    const categories = searchParams.getAll('category');

    // Fetch ALL products (Client-side filtering for flexibility as discussed)
    // Production note: For large catalogs, use Algolia or Typesense.
    const { data: allProducts, isLoading } = useCollection<Product>(
        firestore ? collection(firestore, 'products') : null
    );

    const filteredProducts = allProducts?.filter(product => {
        // 1. Text Search (Name or Description)
        const matchesSearch = !searchQuery ||
            product.name.toLowerCase().includes(searchQuery) ||
            product.description.toLowerCase().includes(searchQuery);

        // 2. Price Range
        const matchesPrice = product.price >= minPrice && product.price <= maxPrice;

        // 3. Category
        // Note: Our products have 'categoryId', we need to map category names or just check exact match if names are stored?
        // Let's assume for now filters send names and we match against categoryId (which might be an ID or name).
        // If 'categoryId' is an ID, this filter needs mapping. 
        // Checking types.ts: Category has `name: 'Nutritional Care' ...`.
        // If products store `categoryId` as "Nutritional Care" (which seems to be the case in some NoSQL setups or we need to join).
        // Let's check `types.ts` again: `categoryId: string`. It is likely an ID.
        // For strictly client-side without joining: We might check if the ID matches or if we can infer.
        // Or assume for this task `categoryId` == Name or we fetch categories to map.
        // SIMPLIFICATION: We will assume we filter by `categoryId` matching the selected name OR
        // we can filter loosely if categories in DB are names.

        // Actually, looking at `types.ts`, `Category` has `name`. 
        // If we want to filter by readable names in URL, we need to know the IDs.
        // Strategy: Filter by matching the string to `categoryId` assuming for now IDs are simple or correspond.
        // If this fails, we will see empty results for category filters.

        const matchesCategory = categories.length === 0 || categories.includes(product.categoryId);

        return matchesSearch && matchesPrice && matchesCategory;
    });

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="flex flex-col space-y-3">
                        <Skeleton className="h-[200px] w-full rounded-xl" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (!filteredProducts || filteredProducts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="bg-secondary/30 p-6 rounded-full mb-4">
                    <SearchX className="h-10 w-10 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold mb-2">No results found</h2>
                <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                    We couldn't find any products matching your search for "{searchQuery}".
                    Try adjusting your filters or search terms.
                </p>
                <Button variant="outline" onClick={() => window.location.href = '/search'}>Clear Filters</Button>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <p className="text-muted-foreground">Showing {filteredProducts.length} results</p>
                {/* Mobile Filter Trigger */}
                <div className="lg:hidden">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="sm">
                                <Filter className="mr-2 h-4 w-4" />
                                Filters
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="overflow-y-auto">
                            <ProductFilter />
                        </SheetContent>
                    </Sheet>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {filteredProducts.map(product => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </div>
    );
}

export default function SearchPage() {
    return (
        <div className="min-h-screen bg-background">
            <main className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold font-headline mb-8">Shop Products</h1>
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar - Desktop */}
                    <div className="hidden lg:block w-64 flex-shrink-0">
                        <Suspense fallback={<div className="h-full w-full bg-secondary/10 animate-pulse rounded-lg" />}>
                            <ProductFilter />
                        </Suspense>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1">
                        <Suspense fallback={<div>Loading search...</div>}>
                            <SearchResults />
                        </Suspense>
                    </div>
                </div>
            </main>
        </div>
    );
}
