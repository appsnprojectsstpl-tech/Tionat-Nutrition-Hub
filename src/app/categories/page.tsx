'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Package, ChevronRight, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { subCategories } from '@/lib/data';
import { useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import type { Product } from '@/lib/types';
import { ProductCard } from '@/components/product-card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductCardSkeleton } from '@/components/product-card-skeleton';

export default function CategoriesPage() {
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const firestore = useFirestore();

    const productsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        let q = query(collection(firestore, 'products'));

        if (selectedCategory !== 'All') {
            const sub = subCategories.find(s => s.name === selectedCategory);
            if (sub) {
                q = query(q, where('subcategoryId', '==', sub.id));
            }
        }
        return query(q, limit(50));
    }, [firestore, selectedCategory]);

    const { data: products, isLoading } = useCollection<Product>(productsQuery);

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <div className="container px-4 py-8">
                <h1 className="text-3xl font-headline font-bold mb-6">Categories</h1>

                {/* Categories Horizontal Scroll */}
                <div className="flex gap-3 overflow-x-auto pb-4 mb-6 scrollbar-hide">
                    <button
                        onClick={() => setSelectedCategory('All')}
                        className={cn(
                            "flex-none px-4 py-2 rounded-full text-sm font-bold transition-colors",
                            selectedCategory === 'All' ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                        )}
                    >
                        All Items
                    </button>
                    {subCategories.map((sub) => (
                        <button
                            key={sub.id}
                            onClick={() => setSelectedCategory(sub.name)}
                            className={cn(
                                "flex-none px-4 py-2 rounded-full text-sm font-bold transition-colors whitespace-nowrap",
                                selectedCategory === sub.name ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                            )}
                        >
                            {sub.name}
                        </button>
                    ))}
                </div>

                {/* Products Grid */}
                {isLoading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <ProductCardSkeleton key={i} />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                        {products && products.length > 0 ? (
                            products.map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))
                        ) : (
                            <div className="col-span-full text-center py-12 text-muted-foreground">
                                No products found in this category.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
