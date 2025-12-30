'use client';

import { useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import type { Product } from '@/lib/types';
import { ProductCard } from '@/components/product-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Percent } from 'lucide-react';

export default function OffersPage() {
    const firestore = useFirestore();

    // Query for products with explicit offers or logic
    // For now, we'll fetch all and filter client-side for "Deal" or just random for demo
    // Ideally, add 'onOffer' field to schema
    const offersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        // Mock: just fetch products, show them as offers
        return query(collection(firestore, 'products'), limit(20));
    }, [firestore]);

    const { data: products, isLoading } = useCollection<Product>(offersQuery);

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <div className="bg-primary/10 py-8 mb-4">
                <div className="container px-4 text-center">
                    <Percent className="w-12 h-12 text-primary mx-auto mb-2" />
                    <h1 className="text-3xl font-headline font-bold text-primary">Special Offers</h1>
                    <p className="text-muted-foreground">Grab the best deals today!</p>
                </div>
            </div>

            <div className="container px-4 pb-8">
                {isLoading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <Skeleton key={i} className="aspect-[4/5] rounded-3xl" />
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
                                No offers currently available.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
