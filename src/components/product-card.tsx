'use client';

import Image from 'next/image';
import type { Product } from '@/lib/types';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Minus, Plus, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { useWishlist } from '@/hooks/use-wishlist';

const getProductLink = (slug: string) => `/product-view?slug=${slug}`;

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart, items, updateQuantity } = useCart();
  const { toast } = useToast();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const cartItem = items.find(item => item.product.id === product.id);
  const isWishlisted = isInWishlist(product.id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addToCart(product);
    toast({
      title: "Added",
      description: `${product.name} in cart.`,
      duration: 1500,
    });
  };

  const handleUpdateQty = (e: React.MouseEvent, change: number) => {
    e.preventDefault();
    if (cartItem) {
      updateQuantity(product.id, cartItem.quantity + change);
    }
  }

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  }

  // Fake discount logic for display intensity
  const originalPrice = product.price * 1.25; // Assume 25% "off" for visual pop if not provided
  const discountPercentage = 20;

  return (
    <div className="group relative flex flex-col bg-card rounded-3xl shadow-sm border border-border/40 overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/20">

      <Link href={getProductLink(product.slug)} className="relative aspect-[4/5] block overflow-hidden bg-secondary/20">

        {/* Actions Overlay */}
        <div className="absolute top-2 right-2 z-20 flex flex-col gap-2">
          <button
            onClick={handleWishlistToggle}
            className={cn(
              "p-2 rounded-full backdrop-blur-md transition-all active:scale-90 shadow-sm",
              isWishlisted ? "bg-red-50 text-red-500" : "bg-white/30 text-foreground hover:bg-white/50"
            )}
          >
            <Heart className={cn("h-4 w-4", isWishlisted && "fill-current")} />
          </button>
        </div>

        {/* Image */}
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground/30 font-bold text-6xl select-none">T</div>
        )}

        {/* Discount Tag */}
        <div className="absolute top-0 left-0 bg-accent text-accent-foreground text-[10px] font-black uppercase px-2 py-1 rounded-br-2xl shadow-sm z-10">
          {discountPercentage}% OFF
        </div>
      </Link>

      <div className="flex flex-col flex-1 p-3 gap-2">

        {/* Title */}
        <h3 className="font-headline font-bold text-sm leading-tight text-foreground line-clamp-2 min-h-[2.5em]">
          <Link href={getProductLink(product.slug)}>{product.name}</Link>
        </h3>

        {/* Price Block */}
        <div className="mt-auto">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-base font-bold text-foreground">₹{product.price}</span>
            <span className="text-xs text-muted-foreground line-through decoration-muted-foreground/50">₹{Math.round(originalPrice)}</span>
          </div>

          {/* Action Button */}
          {product.status === 'Coming Soon' ? (
            <Button disabled variant="secondary" size="sm" className="w-full rounded-full h-8 text-xs font-bold opacity-50">Soon</Button>
          ) : !cartItem ? (
            <Button
              onClick={handleAddToCart}
              className="w-full rounded-xl h-9 font-bold bg-white text-primary border-2 border-primary/10 hover:bg-primary hover:text-white shadow-sm hover:shadow-primary/25 transition-all text-xs uppercase tracking-wide active:scale-95"
            >
              Add
            </Button>
          ) : (
            <div className="flex items-center justify-between bg-primary text-white rounded-xl h-9 px-1 shadow-md shadow-primary/20 animate-morph overflow-hidden">
              <button onClick={(e) => handleUpdateQty(e, -1)} className="p-1 px-2 hover:bg-white/20 rounded-lg transition-colors">
                <Minus className="h-4 w-4 stroke-[3]" />
              </button>
              <span className="text-sm font-bold w-4 text-center">{cartItem.quantity}</span>
              <button onClick={(e) => handleUpdateQty(e, 1)} className="p-1 px-2 hover:bg-white/20 rounded-lg transition-colors">
                <Plus className="h-4 w-4 stroke-[3]" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
