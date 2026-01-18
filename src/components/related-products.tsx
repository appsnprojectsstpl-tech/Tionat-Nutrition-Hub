'use client';

import { useMemoFirebase, useCollection, useFirestore } from '@/firebase';
import { collection, query, where, limit, orderBy } from 'firebase/firestore';
import { Product } from '@/lib/types';
import { ProductCard } from '@/components/product-card';
import { ProductCardSkeleton } from '@/components/product-card-skeleton';

interface RelatedProductsProps {
    categoryId: string;
    currentProductId: string;
}

export function RelatedProducts({ categoryId, currentProductId }: RelatedProductsProps) {
    const firestore = useFirestore();

    const relatedQuery = useMemoFirebase(() => {
        if (!firestore || !categoryId) return null;
        // Simple logic: fetch 5 products from same category, we filter out current one in JS
        return query(
            collection(firestore, 'products'),
            where('categoryId', '==', categoryId),
            orderBy('price', 'desc'), // Just a random sort to mix it up, or use rating
            limit(6)
        );
    }, [firestore, categoryId]);

    const { data: products, isLoading } = useCollection<Product>(relatedQuery);

    const relatedProducts = products?.filter(p => p.id !== currentProductId).slice(0, 4);

    if (isLoading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => <ProductCardSkeleton key={i} />)}
            </div>
        )
    }

    if (!relatedProducts || relatedProducts.length === 0) {
        return null;
    }

    return (
        <section className="mt-12">
            <h2 className="text-xl font-bold font-headline mb-4">You Might Also Like</h2>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {relatedProducts.map(product => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </section>
    );
}
