'use client';

import Image from 'next/image';
import { Product } from '@/lib/types';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/hooks/use-cart';
import { Minus, Plus, Star } from 'lucide-react';

interface ProductDetailSheetProps {
    product: Product | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ProductDetailSheet({ product, open, onOpenChange }: ProductDetailSheetProps) {
    const { addToCart, items, updateQuantity } = useCart();

    if (!product) return null;

    const cartItem = items.find(item => item.product.id === product.id);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="h-[85vh] rounded-t-[2rem] p-0 overflow-hidden flex flex-col bg-background">

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto">
                    {/* Hero Image */}
                    <div className="relative w-full aspect-square bg-secondary/20">
                        {product.imageUrl ? (
                            <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground">No Image</div>
                        )}
                        <div className="absolute top-4 left-4">
                            <Badge variant="secondary" className="backdrop-blur-md bg-white/50 text-black">
                                {product.category}
                            </Badge>
                        </div>
                    </div>

                    <div className="p-6 space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="font-headline text-2xl font-bold text-foreground leading-tight">{product.name}</h2>
                                <div className="flex items-center gap-1 mt-1 text-yellow-500">
                                    <Star className="h-4 w-4 fill-current" />
                                    <span className="text-sm font-bold text-foreground">4.8</span>
                                    <span className="text-xs text-muted-foreground ml-1">(120 reviews)</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold text-primary">₹{product.price}</div>
                                <div className="text-sm text-muted-foreground line-through">₹{Math.round(product.price * 1.25)}</div>
                            </div>
                        </div>

                        <div className="h-px w-full bg-border/50" />

                        <div className="space-y-2">
                            <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Description</h3>
                            <p className="text-sm text-foreground/80 leading-relaxed">
                                {product.description || "Fresh and healthy product delivered directly to your doorstep in 10 minutes. Premium quality guaranteed."}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Nutrition</h3>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-secondary/30 rounded-xl p-3 text-center">
                                    <span className="block text-xs text-muted-foreground">Calories</span>
                                    <span className="font-bold text-sm">120</span>
                                </div>
                                <div className="bg-secondary/30 rounded-xl p-3 text-center">
                                    <span className="block text-xs text-muted-foreground">Protein</span>
                                    <span className="font-bold text-sm">8g</span>
                                </div>
                                <div className="bg-secondary/30 rounded-xl p-3 text-center">
                                    <span className="block text-xs text-muted-foreground">Carbs</span>
                                    <span className="font-bold text-sm">14g</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sticky Bottom Action */}
                <div className="p-4 border-t border-border/50 bg-background/80 backdrop-blur-md pb-safe">
                    {!cartItem ? (
                        <Button className="w-full h-12 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all bg-accent text-accent-foreground" onClick={() => addToCart(product)}>
                            Add to Cart - ₹{product.price}
                        </Button>
                    ) : (
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex flex-1 items-center justify-between bg-primary text-white rounded-2xl h-12 px-2 shadow-lg">
                                <Button variant="ghost" size="icon" className="hover:bg-white/20 text-white rounded-xl" onClick={() => updateQuantity(product.id, cartItem.quantity - 1)}>
                                    <Minus className="h-6 w-6" />
                                </Button>
                                <span className="font-bold text-xl">{cartItem.quantity}</span>
                                <Button variant="ghost" size="icon" className="hover:bg-white/20 text-white rounded-xl" onClick={() => updateQuantity(product.id, cartItem.quantity + 1)}>
                                    <Plus className="h-6 w-6" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

            </SheetContent>
        </Sheet>
    );
}
