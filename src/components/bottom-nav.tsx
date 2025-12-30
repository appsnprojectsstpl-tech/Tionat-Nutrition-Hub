'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Grid, Zap, ShoppingBag, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCart } from '@/hooks/use-cart';
import { useEffect, useState } from 'react';

const navLinks = [
    { href: "/", label: "Home", icon: Home },
    { href: "/categories", label: "Categories", icon: Grid },
    { href: "/offers", label: "Offers", icon: Zap },
    { href: "/cart", label: "Cart", icon: ShoppingBag },
    { href: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
    const pathname = usePathname();
    const { itemCount } = useCart();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <div className="fixed bottom-0 left-0 z-50 w-full bg-background/80 backdrop-blur-xl border-t border-white/10 dark:border-white/5 pb-safe supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-1">
                {navLinks.map((link) => {
                    const isActive = link.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(link.href);

                    const Icon = link.icon;

                    return (
                        <Link
                            key={link.label}
                            href={link.href}
                            className={cn(
                                "relative flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-300",
                                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <div className={cn(
                                "relative p-1.5 rounded-2xl transition-all duration-300",
                                isActive && "bg-primary/10 -translate-y-1"
                            )}>
                                <Icon className={cn(
                                    "w-6 h-6 transition-all duration-300",
                                    isActive && "stroke-[2.5px]"
                                )} />

                                {link.label === "Cart" && mounted && itemCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground animate-in zoom-in ring-2 ring-background">
                                        {itemCount}
                                    </span>
                                )}
                            </div>
                            <span className={cn(
                                "text-[10px] font-medium transition-all duration-300",
                                isActive ? "opacity-100 font-bold" : "opacity-70 scale-95"
                            )}>
                                {link.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
