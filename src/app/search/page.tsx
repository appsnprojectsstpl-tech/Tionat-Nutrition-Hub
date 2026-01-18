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

    const filteredProducts = allProducts?.map(product => {
        const nameLower = product.name.toLowerCase();
        const descLower = product.description.toLowerCase();
        const q = searchQuery.trim();

        let score = 0;
        if (!q) {
            score = 1; // Show all if no query
        } else {
            if (nameLower === q) score = 100;
            else if (nameLower.startsWith(q)) score = 80;
            else if (nameLower.includes(q)) score = 50;
            else if (descLower.includes(q)) score = 20;
        }

        // Filters
        const matchesPrice = product.price >= minPrice && product.price <= maxPrice;
        const matchesCategory = categories.length === 0 || categories.includes(product.categoryId);

        return { product, score, isValid: score > 0 && matchesPrice && matchesCategory };
    })
        .filter(item => item.isValid)
        .sort((a, b) => b.score - a.score)
        .map(item => item.product);

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
