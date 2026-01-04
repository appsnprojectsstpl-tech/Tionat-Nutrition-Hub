'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ProductCard } from '@/components/product-card';
import { Button } from '@/components/ui/button';
import { useWishlist } from '@/hooks/use-wishlist';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, documentId } from 'firebase/firestore';
import { Product } from '@/lib/types';
import { Heart, Loader2 } from 'lucide-react';

export default function WishlistPage() {
    const { wishlist, isLoading: isWishlistLoading } = useWishlist();
    const firestore = useFirestore();
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);

    useEffect(() => {
        const fetchWishlistProducts = async () => {
            if (!firestore || wishlist.length === 0) {
                setProducts([]);
                return;
            }

            setIsLoadingProducts(true);
            try {
                // Firestore 'in' query supports max 10 items. 
                // If more, we need to chunk or fetch individually. 
                // For simplicity, let's fetch in chunks of 10.
                const chunks = [];
                for (let i = 0; i < wishlist.length; i += 10) {
                    chunks.push(wishlist.slice(i, i + 10));
                }

                let allProducts: Product[] = [];

                for (const chunk of chunks) {
                    const q = query(
                        collection(firestore, 'products'),
                        where(documentId(), 'in', chunk)
                    );
                    const snapshot = await getDocs(q);
                    const chunkProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
                    allProducts = [...allProducts, ...chunkProducts];
                }

                setProducts(allProducts);
            } catch (error) {
                console.error("Error fetching wishlist products:", error);
            } finally {
                setIsLoadingProducts(false);
            }
        };

        if (!isWishlistLoading) {
            fetchWishlistProducts();
        }
    }, [firestore, wishlist, isWishlistLoading]);

    if (isWishlistLoading || isLoadingProducts) {
        return (
            <div className="min-h-screen bg-background">
                <main className="container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[50vh]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">Loading your favorites...</p>
                </main>
            </div>
        );
    }

    if (wishlist.length === 0) {
        return (
            <div className="min-h-screen bg-background">
                <main className="container mx-auto px-4 py-8 text-center flex flex-col items-center justify-center min-h-[60vh]">
                    <div className="bg-secondary/50 p-6 rounded-full mb-6">
                        <Heart className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold font-headline mb-4">Your Wishlist is Empty</h1>
                    <p className="text-muted-foreground mb-8 max-w-md">
                        Tap the heart icon on products you like to save them for later.
                    </p>
                    <Button asChild size="lg" className="rounded-xl px-8">
                        <Link href="/">Explore Products</Link>
                    </Button>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <main className="container mx-auto px-4 py-8">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                        <Heart className="h-6 w-6 text-red-500 fill-red-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold font-headline">My Wishlist</h1>
                        <p className="text-sm text-muted-foreground">{wishlist.length} Saved Items</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                    {products.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            </main>
        </div>
    );
}
