'use client';

import { useMemoFirebase, useCollection, useFirestore } from '@/firebase';
import { collection, query, where, limit, orderBy } from 'firebase/firestore';
import { Product } from '@/lib/types';
import { ProductCard } from '@/components/product-card';
import { ProductCardSkeleton } from '@/components/product-card-skeleton';
import { useUser } from '@/firebase';

interface RelatedProductsProps {
    categoryId: string;
    currentProductId: string;
    subcategoryId?: string;
    currentPrice?: number;
    currentName?: string;
}

export function RelatedProducts({ categoryId, currentProductId, subcategoryId, currentPrice, currentName }: RelatedProductsProps) {
    const firestore = useFirestore();

    const relatedQuery = useMemoFirebase(() => {
        if (!firestore || !categoryId) return null;
        // Fetch a larger pool to score
        return query(
            collection(firestore, 'products'),
            where('categoryId', '==', categoryId),
            limit(20)
        );
    }, [firestore, categoryId]);

    const { data: products, isLoading } = useCollection<Product>(relatedQuery);

    const relatedProducts = (products || [])
        .filter(p => p.id !== currentProductId) // Remove current
        .map(product => {
            let score = 0;

            // 1. Subcategory Match (+30)
            if (subcategoryId && product.subcategoryId === subcategoryId) {
                score += 30;
            }

            // 2. Price Proximity (+15 for ±20%)
            if (currentPrice) {
                const diff = Math.abs(product.price - currentPrice);
                const percentDiff = diff / currentPrice;
                if (percentDiff <= 0.2) {
                    score += 15;
                }
            }

            // 3. Name/Keyword Similarity (Simple Token Match)
            // Splitting by space and checking overlap
            if (currentName) {
                const currentTokens = currentName.toLowerCase().split(' ').filter(t => t.length > 3);
                const targetNameLower = product.name.toLowerCase();
                let matches = 0;
                currentTokens.forEach(token => {
                    if (targetNameLower.includes(token)) matches++;
                });
                score += (matches * 10);
            }

            // 4. Base Score (Category match is implicit 0, but older items might be penalized if we had date)

            return { product, score };
        })
        .sort((a, b) => b.score - a.score) // Descending Score
        .slice(0, 4)
        .map(item => item.product);

    if (isLoading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
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
