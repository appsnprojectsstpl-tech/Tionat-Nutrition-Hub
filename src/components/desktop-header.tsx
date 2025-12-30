'use client';

import Link from 'next/link';
import { Search, ShoppingCart, User, Utensils, Heart, Package, Award } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useCart } from '@/hooks/use-cart';
import { useEffect, useState } from 'react';
import { ModeToggle } from './mode-toggle';
import { AddressDialog } from './address-dialog';

export function DesktopHeader() {
    const { itemCount } = useCart();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center gap-8">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 mr-4">
                    <div className="bg-primary/10 p-2 rounded-xl">
                        <Utensils className="h-6 w-6 text-primary" />
                    </div>
                    <span className="font-headline font-bold text-xl text-primary">Tionat</span>
                </Link>

                {/* Navigation */}
                <nav className="flex items-center gap-6 text-sm font-medium">
                    <Link href="/categories" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                        <Package className="h-4 w-4" />
                        Categories
                    </Link>
                    <Link href="/offers" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                        <Award className="h-4 w-4" />
                        TioRewards
                    </Link>
                </nav>

                {/* Search */}
                <div className="flex-1 max-w-xl mx-auto relative hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search for 'avocados'..."
                        className="w-full h-10 pl-10 pr-4 rounded-full bg-secondary/50 border-transparent focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all text-sm outline-none"
                    />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-auto">
                    <AddressDialog>
                        <Button variant="ghost" size="sm" className="hidden lg:flex mr-2 text-muted-foreground">
                            Set Location
                        </Button>
                    </AddressDialog>

                    <ModeToggle />

                    <Button asChild variant="ghost" size="icon">
                        <Link href="/wishlist">
                            <Heart className="h-5 w-5" />
                            <span className="sr-only">Wishlist</span>
                        </Link>
                    </Button>

                    <Button asChild variant="ghost" size="icon" className="relative">
                        <Link href="/cart">
                            <ShoppingCart className="h-5 w-5" />
                            {mounted && itemCount > 0 && (
                                <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 justify-center p-0 text-[10px]">
                                    {itemCount}
                                </Badge>
                            )}
                            <span className="sr-only">Shopping Cart</span>
                        </Link>
                    </Button>

                    <Button asChild variant="ghost" size="icon">
                        <Link href="/profile">
                            <User className="h-5 w-5" />
                            <span className="sr-only">Profile</span>
                        </Link>
                    </Button>
                </div>
            </div>
        </header>
    );
}
