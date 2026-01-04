'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { Product } from '@/lib/types';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Plus, Minus, ArrowLeft } from 'lucide-react';
import { ProductCard } from '@/components/product-card';
import { cn } from '@/lib/utils';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

function ProductViewContent() {
    const searchParams = useSearchParams();
    const slug = searchParams.get('slug');
    const router = useRouter();
    const { addToCart } = useCart();
    const { toast } = useToast();
    const firestore = useFirestore();

    const [product, setProduct] = useState<Product | null>(null);
    const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!slug) return;

        const fetchProductData = async () => {
            if (!firestore) return;
            setIsLoading(true);
            setError(null);

            try {
                const productsRef = collection(firestore, 'products');
                const q = query(productsRef, where('slug', '==', slug), limit(1));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    setError('Product not found');
                    setIsLoading(false);
                    return;
                }

                const productDoc = querySnapshot.docs[0];
                const productData = { id: productDoc.id, ...productDoc.data() } as Product;
                setProduct(productData);

                // Fetch related
                const relatedQuery = query(
                    productsRef,
                    where('categoryId', '==', productData.categoryId),
                    limit(6)
                );
                const relatedSnapshot = await getDocs(relatedQuery);
                const related = relatedSnapshot.docs
                    .map((doc) => ({ id: doc.id, ...doc.data() } as Product))
                    .filter((p) => p.id !== productData.id)
                    .slice(0, 5);
                setRelatedProducts(related);
            } catch (err) {
                console.error("Error fetching product:", err);
                setError('Failed to load product details. Please check your internet connection.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchProductData();
    }, [firestore, slug]);

    const handleAddToCart = () => {
        if (product) {
            addToCart(product, quantity);
            toast({
                title: "Added to cart",
                description: `${quantity} x ${product.name} has been added to your cart.`,
            });
        }
    };

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8 space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                    <Skeleton className="aspect-square w-full rounded-2xl" />
                    <div className="space-y-4">
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-6 w-1/4" />
                        <Skeleton className="h-32 w-full" />
                    </div>
                </div>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <h2 className="text-2xl font-bold mb-4">{error || 'Product Not Found'}</h2>
                <Button onClick={() => router.push('/')}>Go Back Home</Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 pb-32 md:pb-8">
            <Button variant="ghost" size="sm" className="mb-4 pl-0 hover:bg-transparent hover:text-primary md:hidden" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>

            <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                {/* Image Gallery - Mobile Full Width / Desktop Grid */}
                <div className="relative -mx-4 md:mx-0 bg-secondary/20 aspect-square md:aspect-auto md:h-[500px] flex items-center justify-center overflow-hidden">
                    {product.imageUrl ? (
                        <Image
                            src={product.imageUrl}
                            alt={product.name}
                            width={600}
                            height={600}
                            className="w-full h-full object-cover md:rounded-2xl"
                        />
                    ) : (
                        <div className="text-muted-foreground">No Image</div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent md:hidden" />
                </div>

                {/* Product Details */}
                <div className="flex flex-col gap-4 relative z-10 -mt-6 md:mt-0 bg-background rounded-t-3xl md:rounded-none px-4 md:px-0 pt-6 md:pt-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] md:shadow-none">
                    <div className="flex items-start justify-between">
                        <div>
                            {product.status !== 'Available' && (
                                <Badge
                                    className={cn(
                                        'text-xs px-2 py-0.5 mb-2 w-fit',
                                        product.status === 'New Arrival' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                                    )}
                                >
                                    {product.status}
                                </Badge>
                            )}
                            <h1 className="font-headline text-2xl md:text-4xl font-bold leading-tight">{product.name}</h1>
                            <p className="text-sm text-muted-foreground mt-1">500g (Mock)</p>
                        </div>
                        <div className="flex flex-col items-end">
                            <div className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 mb-1">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                11 MINS
                            </div>
                        </div>
                    </div>

                    <Separator className="my-2" />

                    <div className="flex items-end gap-2">
                        <span className="text-2xl font-bold">₹{product.price.toFixed(2)}</span>
                        <span className="text-sm text-muted-foreground line-through mb-1">₹{(product.price * 1.2).toFixed(2)}</span>
                        <Badge variant="destructive" className="mb-1 ml-auto md:ml-2">20% OFF</Badge>
                    </div>

                    <div className="prose text-sm text-muted-foreground mt-2 bg-secondary/20 p-4 rounded-xl">
                        <h3 className="text-foreground font-semibold mb-1 text-xs uppercase tracking-wider">Description</h3>
                        <p>{product.description}</p>
                    </div>

                    {/* Sticky Bottom Bar */}
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t border-border z-50 md:static md:bg-transparent md:border-none md:p-0">
                        <div className="flex items-center gap-4 max-w-md mx-auto md:max-w-none">
                            <div className="flex items-center gap-2 bg-secondary rounded-xl p-1">
                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg hover:bg-background shadow-sm" onClick={() => setQuantity(q => Math.max(1, q - 1))} disabled={quantity <= 1}>
                                    <Minus className="h-4 w-4" />
                                </Button>
                                <span className="font-bold text-lg w-8 text-center">{quantity}</span>
                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg hover:bg-background shadow-sm" onClick={() => setQuantity(q => q + 1)}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            <Button size="lg" disabled={product.status === 'Coming Soon'} onClick={handleAddToCart} className="flex-1 rounded-xl font-bold shadow-lg shadow-primary/20 text-base">
                                {product.status === 'Coming Soon' ? 'Coming Soon' : `Add item - ₹${(product.price * quantity).toFixed(2)}`}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Related Products */}
            {relatedProducts.length > 0 && (
                <div className="mt-16">
                    <h2 className="text-2xl font-headline font-bold mb-6">You might also like</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                        {relatedProducts.map((p) => (
                            <ProductCard key={p.id} product={p} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ProductViewPage() {
    return (
        <div className="flex flex-col min-h-screen bg-background">

            <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
                <ProductViewContent />
            </Suspense>
        </div>
    );
}
