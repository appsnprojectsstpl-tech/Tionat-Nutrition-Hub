'use client';

import { notFound } from 'next/navigation';
import {
    collection,
    query,
    where,
    getDocs,
    limit,
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { Product } from '@/lib/types';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Plus, Minus } from 'lucide-react';
import { ProductCard } from '@/components/product-card';
import { cn } from '@/lib/utils';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';

type Props = {
    slug: string;
};

export default function ProductDetailClient({ slug }: Props) {
    const { addToCart, items, updateQuantity } = useCart();
    const { toast } = useToast();
    const firestore = useFirestore();

    const [product, setProduct] = useState<Product | null>(null);
    const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);


    useEffect(() => {
        const fetchProductData = async () => {
            if (!firestore) return;
            setIsLoading(true);

            const productsRef = collection(firestore, 'products');

            // Fetch main product
            const q = query(productsRef, where('slug', '==', slug), limit(1));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setIsLoading(false);
                notFound();
                return;
            }

            const productDoc = querySnapshot.docs[0];
            const productData = { id: productDoc.id, ...productDoc.data() } as Product;
            setProduct(productData);

            // Fetch related products
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

            setIsLoading(false);
        };

        fetchProductData();
    }, [firestore, slug]);


    if (isLoading) {
        return (
            <div className="flex flex-col min-h-screen bg-background">

                <main className="container mx-auto px-4 py-8">
                    <p>Loading...</p>
                </main>
            </div>
        )
    }

    if (!product) {
        return notFound();
    }

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: product.description,
        image: product.imageUrl,
        offers: {
            '@type': 'Offer',
            price: product.price.toFixed(2),
            priceCurrency: 'INR',
            availability: product.status === 'Coming Soon' ? 'https://schema.org/PreOrder' : 'https://schema.org/InStock',
        },
    };

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />

            <main className="container mx-auto px-4 py-8">
                <div className="grid md:grid-cols-2 gap-8 lg:gap-12 pb-20 md:pb-0">
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
                        {/* Overlay Gradient for text readability on mobile if needed */}
                        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent md:hidden" />
                    </div>

                    {/* Product Details - Sheet style on Desktop too for consistency */}
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

                        {/* Sticky Bottom Bar for Mobile / Inline for Desktop */}
                        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t border-border z-50 md:static md:bg-transparent md:border-none md:p-0">
                            <div className="flex items-center gap-4 max-w-md mx-auto md:max-w-none">
                                {items.find(i => i.product.id === product.id) ? (
                                    <div className="flex flex-1 items-center justify-between bg-primary text-white rounded-xl h-12 px-2 shadow-md shadow-primary/20">
                                        <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-white/20 text-white rounded-lg" onClick={() => updateQuantity(product.id, (items.find(i => i.product.id === product.id)?.quantity || 1) - 1)}>
                                            <Minus className="h-5 w-5" />
                                        </Button>
                                        <span className="font-bold text-xl">{items.find(i => i.product.id === product.id)?.quantity}</span>
                                        <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-white/20 text-white rounded-lg" onClick={() => updateQuantity(product.id, (items.find(i => i.product.id === product.id)?.quantity || 1) + 1)}>
                                            <Plus className="h-5 w-5" />
                                        </Button>
                                    </div>
                                ) : (
                                    <Button size="lg" disabled={product.status === 'Coming Soon'} onClick={() => addToCart(product, 1)} className="flex-1 rounded-xl font-bold shadow-lg shadow-primary/20 text-base h-12">
                                        {product.status === 'Coming Soon' ? 'Coming Soon' : `Add Item - ₹${product.price.toFixed(2)}`}
                                    </Button>
                                )}
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
            </main>
        </div>
    );
}
