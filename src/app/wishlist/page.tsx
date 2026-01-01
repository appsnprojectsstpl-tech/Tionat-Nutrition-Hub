
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWishlist } from '@/hooks/use-wishlist';
import { useFirestore, useAuth } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Product } from '@/lib/types';
import { AppHeader } from '@/components/header';
import { ProductCard } from '@/components/product-card';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';

export default function WishlistPage() {
    const { user, isUserLoading } = useAuth();
    const { wishlist, isLoading: isWishlistLoading } = useWishlist();
    const firestore = useFirestore();
    const [products, setProducts] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(true);

    useEffect(() => {
        if (!firestore || isWishlistLoading || wishlist.length === 0) {
            setLoadingProducts(false);
            setProducts([]);
            return;
        }

        const fetchProducts = async () => {
            setLoadingProducts(true);
            try {
                const productsRef = collection(firestore, 'products');
                const productPromises = [];
                for (let i = 0; i < wishlist.length; i += 10) {
                    const batch = wishlist.slice(i, i + 10);
                    const q = query(productsRef, where('__name__', 'in', batch));
                    productPromises.push(getDocs(q));
                }

                const snapshots = await Promise.all(productPromises);
                const fetchedProducts = snapshots.flatMap(snapshot =>
                    snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product))
                );
                setProducts(fetchedProducts);
            } catch (error) {
                console.error("Error fetching wishlist products:", error);
            } finally {
                setLoadingProducts(false);
            }
        };

        fetchProducts();
    }, [firestore, wishlist, isWishlistLoading]);

    const isLoading = isUserLoading || isWishlistLoading || loadingProducts;

    if (!user && !isUserLoading) {
        return (
            <div className="min-h-screen bg-background">
                <AppHeader />
                <main className="container mx-auto px-4 py-8 text-center">
                    <h1 className="text-2xl md:text-3xl font-bold font-headline mb-6">Please Log In</h1>
                    <p className="text-muted-foreground mb-8">You need to be logged in to view your wishlist.</p>
                    <Button asChild>
                        <Link href="/login?redirect=/wishlist">Login</Link>
                    </Button>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <AppHeader />
            <main className="container mx-auto px-4 py-8">
                <h1 className="text-2xl md:text-3xl font-bold font-headline mb-6">My Wishlist</h1>
                {isLoading ? (
                    <p>Loading your wishlist...</p>
                ) : products.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {products.map(product => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 border-2 border-dashed rounded-lg">
                        <Heart className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h2 className="mt-6 text-xl font-semibold">Your wishlist is empty</h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Browse products and click the heart to save them for later.
                        </p>
                        <Button asChild className="mt-6">
                            <Link href="/">Start Shopping</Link>
                        </Button>
                    </div>
                )}
            </main>
        </div>
    );
}
