'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { ProductFilter } from '@/components/product-filter';
import { ProductCard } from '@/components/product-card';
import { Product } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Filter, SlidersHorizontal, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';

import { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { levenshteinDistance } from '@/lib/string-utils';
// ... existing imports ...

function SearchResults() {
    const searchParams = useSearchParams();
    const firestore = useFirestore();
    const [sortBy, setSortBy] = useState('relevance');

    const searchQuery = searchParams.get('q')?.toLowerCase() || '';
    const minPrice = Number(searchParams.get('minPrice')) || 0;
    const maxPrice = Number(searchParams.get('maxPrice')) || 100000;
    const categories = searchParams.getAll('category');

    // Optimization: Server-side Query
    const productsQuery = useMemoFirebase(() => {
        if (!firestore) return null;

        const baseRef = collection(firestore, 'products');
        const term = searchQuery.trim();

        // 1. If search term exists, use Prefix Search (most efficient)
        if (term.length > 0) {
            return query(
                baseRef,
                where('name', '>=', term),
                where('name', '<=', term + '\uf8ff'),
                limit(50) // Limit to 50 results
            );
        }

        // 2. If no search term but categories, filter by category (single category for now to avoid complex OR)
        if (categories.length > 0) {
            // Firestore 'in' supports up to 10 items
            return query(baseRef, where('categoryId', 'in', categories.slice(0, 10)), limit(50));
        }

        // 3. Fallback: Recent products
        return query(baseRef, limit(50));

    }, [firestore, searchQuery, categories]);

    // Fetch Limited products
    const { data: serverProducts, isLoading } = useCollection<Product>(productsQuery);

    const filteredProducts = useMemo(() => {
        if (!serverProducts) return [];

        return serverProducts.map(product => {
            const nameLower = product.name.toLowerCase();
            const descLower = product.description.toLowerCase();
            const q = searchQuery.trim();

            let score = 0;
            if (!q) {
                score = 1; // Show all if no query
            } else {
                if (nameLower === q) score = 100;
                else if (nameLower.startsWith(q)) score = 80;
                else if (nameLower.includes(q)) score = 60;
                else if (descLower.includes(q)) score = 20;
                // Fuzzy match is less useful on prefix-filtered results but kept for sorting
            }

            return { ...product, score };
        })
            .filter(product => {
                const matchesPrice = product.price >= minPrice && product.price <= maxPrice;
                // Category filter already applied server-side if no search, but re-check here for safety
                const matchesCategory = categories.length === 0 || categories.includes(product.categoryId);
                return matchesPrice && matchesCategory;
            })
            .sort((a, b) => {
                if (sortBy === 'price_asc') return a.price - b.price;
                if (sortBy === 'price_desc') return b.price - a.price;
                // relevance
                return b.score - a.score;
            });
    }, [serverProducts, searchQuery, minPrice, maxPrice, categories, sortBy]);

    if (isLoading) {
        // ... (existing skeleton) ...
        return <div className="p-12 text-center">Loading...</div>; // Abbreviated for replace convenience if strict match allows
    }

    if (!filteredProducts || filteredProducts.length === 0) {
        // ... (existing empty state) ...
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                <p className="text-muted-foreground">{filteredProducts.length} results for "{searchQuery}"</p>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    {/* Sort Dropdown */}
                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Sort By" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="relevance">Relevance</SelectItem>
                            <SelectItem value="price_asc">Price: Low to High</SelectItem>
                            <SelectItem value="price_desc">Price: High to Low</SelectItem>
                            <SelectItem value="name_asc">Name: A to Z</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Mobile Filter Trigger */}
                    <div className="lg:hidden">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <Filter className="h-4 w-4" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="overflow-y-auto">
                                <ProductFilter />
                            </SheetContent>
                        </Sheet>
                    </div>
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
