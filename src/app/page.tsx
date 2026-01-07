'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import {
    Salad,
    Heart,
    Smile,
    UtensilsCrossed,
    Sun,
    Moon,
    Coffee,
    RotateCw,
    RefreshCw,
    Search,
    ChevronDown,
    User,
    Zap,
    Percent,
    Building2,
    Gift,
    Plus,
    HeartCrack,
    Apple,
    Shirt,
    Headphones,
    Package,
    Soup,
    Sparkles,
    Award,
    Bot,
    Repeat,
    History,
    TrendingUp,
    X,
    ShoppingCart,
} from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { subCategories, categories as allCategories } from '@/lib/data';
import { Product, Category, Order, UserProfile } from '@/lib/types';
import { ProductCard } from '@/components/product-card';
import { AppHeader } from '@/components/header';
import { AddressDialog } from '@/components/address-dialog';
import { cn } from '@/lib/utils';
import { useAuth, useCollection, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, where, query, orderBy, doc, limit } from 'firebase/firestore';
import { ProductCarousel } from '@/components/product-carousel';
import { NotificationHandler } from '@/components/notification-handler';
import { UpdateChecker } from '@/components/update-checker';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from '@/components/ui/carousel';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { StoryHighlights } from '@/components/story-highlights';


const categoryIcons = {
    All: <Package className="w-6 h-6" />,
    'Ready to Cook': <Soup className="w-6 h-6" />,
    'Breakfast': <Coffee className="w-6 h-6" />,
    'Lunch': <Sun className="w-6 h-6" />,
    'Dinner': <Moon className="w-6 h-6" />,
};

const POPULAR_SEARCHES = ["Protein", "Millet", "Cookies", "Oats", "Snacks", "Vegan"];

export default function Home() {
    const firestore = useFirestore();
    const [activeCategory, setActiveCategory] = useState('All');
    const [isClient, setIsClient] = useState(false);
    const categoriesToShow = ['All', 'Ready to Cook', 'Breakfast', 'Lunch', 'Dinner'];

    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);

    useEffect(() => {
        setIsClient(true);
        const stored = localStorage.getItem('recentSearches');
        if (stored) {
            setRecentSearches(JSON.parse(stored));
        }
    }, []);

    const addToRecentSearches = (term: string) => {
        if (!term.trim()) return;
        const newSearches = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
        setRecentSearches(newSearches);
        localStorage.setItem('recentSearches', JSON.stringify(newSearches));
    };

    const handleSearchSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        addToRecentSearches(searchQuery);
        setIsSearchFocused(false);
    };

    const handleTagClick = (tag: string) => {
        setSearchQuery(tag);
        addToRecentSearches(tag);
        setIsSearchFocused(false);
    }

    const clearRecentSearches = () => {
        setRecentSearches([]);
        localStorage.removeItem('recentSearches');
    }


    const productsQuery = useMemoFirebase(() => {
        if (!firestore) return null;

        let q = query(collection(firestore, 'products'));

        if (activeCategory !== 'All') {
            const subCategory = subCategories.find(sc => sc.name === activeCategory);
            if (subCategory) {
                q = query(q, where('subcategoryId', '==', subCategory.id));
            } else if (activeCategory === 'Ready to Cook') {
                q = query(q, where('subcategoryId', '==', 'sub-1'));
            }
        }

        q = query(q, limit(20));

        return q;
    }, [firestore, activeCategory]);

    const featuredQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'products'), where('isFeatured', '==', true), limit(5));
    }, [firestore]);

    const { data: rawProducts, isLoading: isLoadingProducts } = useCollection<Product>(productsQuery);
    const { data: featuredProducts } = useCollection<Product>(featuredQuery);

    const products = useMemo(() => rawProducts?.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
    ), [rawProducts, searchQuery]);

    return (
        <div className="flex flex-col min-h-screen bg-background">
            {/* Initialize push notifications and update checking */}
            <NotificationHandler />
            <UpdateChecker />

            {/* <AppHeader /> removed, using AppShell */}
            <main className="flex-1 pb-16 relative">
                {/* Search moved to Global Header */}

                {/* Search moved to Global Header */}
                <StoryHighlights />

                {/* Hero Carousel */}
                <div className="mt-4 px-4 overflow-hidden">
                    <Carousel className="w-full" opts={{ loop: true }}>
                        <CarouselContent>
                            {featuredProducts && featuredProducts.length > 0 ? (
                                featuredProducts.map((product) => (
                                    <CarouselItem key={product.id}>
                                        <div className="relative h-48 w-full overflow-hidden rounded-2xl shadow-lg">
                                            {/* Background Image with Overlay */}
                                            {product.imageUrl ? (
                                                <Image
                                                    src={product.imageUrl}
                                                    alt={product.name}
                                                    fill
                                                    className="object-cover transition-transform hover:scale-105 duration-700"
                                                />
                                            ) : (
                                                <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/60" />
                                            )}
                                            <div className="absolute inset-0 bg-black/40" />

                                            {/* Text Content */}
                                            <div className="absolute inset-0 flex flex-col justify-center p-6 text-white">
                                                <Badge className="w-fit mb-2 bg-white/20 hover:bg-white/20 border-none text-white backdrop-blur-sm">FEATURED</Badge>
                                                <h2 className="text-2xl font-headline font-bold leading-tight line-clamp-2 text-white">{product.name}</h2>
                                                <p className="text-sm text-white/90 mt-1 line-clamp-1">{product.description || 'Check out our special offer'}</p>
                                                <Link href={`/product-view?slug=${product.slug}`}>
                                                    <Button size="sm" className="mt-4 bg-white text-primary hover:bg-white/90 rounded-full font-bold">
                                                        Shop Now
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    </CarouselItem>
                                ))
                            ) : (
                                <CarouselItem>
                                    <div className="relative h-40 w-full overflow-hidden rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 shadow-lg">
                                        <div className="absolute inset-0 flex flex-col justify-center p-6 text-white">
                                            <Badge className="w-fit mb-2 bg-white/20 hover:bg-white/20 border-none text-white backdrop-blur-sm">FLAT 50% OFF</Badge>
                                            <h2 className="text-2xl font-headline font-bold leading-tight">Healthy <br /><span className="text-white">Snacks</span></h2>
                                            <p className="text-xs text-white/80 mt-1">Millet cookies & more</p>
                                        </div>
                                        <div className="absolute -right-8 -top-8 bg-white/10 w-40 h-40 rounded-full blur-3xl"></div>
                                        <Heart className="absolute right-6 bottom-4 h-14 w-14 text-white opacity-80 rotate-12" />
                                    </div>
                                </CarouselItem>
                            )}
                        </CarouselContent>
                    </Carousel>
                </div>

                {/* Visual Categories Grid */}
                <div className="mt-6 px-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-headline font-bold text-base">Shop by Category</h3>
                        <span className="text-xs text-primary font-bold">See All</span>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                        {categoriesToShow.map((name) => (
                            <button
                                key={name}
                                onClick={() => setActiveCategory(name)}
                                className="flex flex-col items-center gap-2 group"
                            >
                                <div className={cn(
                                    "h-16 w-16 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm border border-border/50 group-active:scale-95",
                                    activeCategory === name
                                        ? "bg-primary/10 border-primary ring-2 ring-primary/20"
                                        : "bg-secondary/50 hover:bg-secondary"
                                )}>
                                    <div className={cn("transition-transform duration-300 group-hover:scale-110", activeCategory === name ? "text-primary" : "text-muted-foreground")}>
                                        {categoryIcons[name as keyof typeof categoryIcons]}
                                    </div>
                                </div>
                                <span className={cn(
                                    "text-[10px] font-medium text-center leading-tight line-clamp-2 w-16",
                                    activeCategory === name ? "text-primary font-bold" : "text-muted-foreground"
                                )}>
                                    {name}
                                </span>
                            </button>
                        ))}
                        <button className="flex flex-col items-center gap-2 group">
                            <div className="h-16 w-16 rounded-2xl flex items-center justify-center bg-secondary/30 border border-dashed border-border hover:bg-secondary/50 transition-all">
                                <Plus className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <span className="text-[10px] font-medium text-muted-foreground">More</span>
                        </button>
                    </div>
                </div>


                {/* Banners Grid */}
                <div className="px-4 -mt-4 mb-8">
                    {/* ... existing banners ... */}
                    <div className="grid grid-cols-2 gap-4">
                        <Link href="/#new-arrivals">
                            <Card className="border-none bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg overflow-hidden relative h-full transition-transform hover:scale-[1.02]">
                                <div className="absolute top-0 right-0 p-8 bg-white/10 rounded-full blur-3xl -mr-4 -mt-4"></div>
                                <CardContent className="p-4 flex flex-col items-start gap-2 h-full justify-between">
                                    <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                                        <Sparkles className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-headline font-bold text-lg">New In</h3>
                                        <p className="text-xs text-white/80">Fresh arrivals</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                        <Link href="/profile">
                            <Card className="border-none bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-lg overflow-hidden relative h-full transition-transform hover:scale-[1.02]">
                                <CardContent className="p-4 flex flex-col items-start gap-2 h-full justify-between">
                                    <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                                        <Award className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-headline font-bold text-lg">Rewards</h3>
                                        <p className="text-xs text-white/80">Check points</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    </div>
                </div>

                {/* Deal of the Day */}
                <div className="px-4 mb-8">
                    <div className="bg-gradient-to-r from-amber-200 to-yellow-400 rounded-2xl p-4 flex items-center justify-between shadow-md relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 bg-white/30 w-24 h-24 rounded-full blur-xl"></div>
                        <div className="z-10">
                            <h3 className="font-headline font-bold text-lg text-amber-900 leading-tight">Deal of<br />the Day</h3>
                            <p className="text-xs text-amber-800 font-medium mt-1">Ends in <span className="font-bold font-mono bg-white/80 px-1 rounded text-amber-900">04:32:19</span></p>
                        </div>
                        <div className="z-10 flex flex-col items-end">
                            <div className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-amber-900 shadow-sm mb-1">
                                UP TO 60% OFF
                            </div>
                            <Button size="sm" className="h-8 rounded-full bg-amber-950 text-amber-100 hover:bg-amber-900 border-none shadow-sm">
                                Grab Now
                            </Button>
                        </div>
                    </div>
                </div>

                <section className="px-4 pb-4">
                    <h2 className="font-headline text-xl font-bold mb-4 flex items-center gap-2">
                        {activeCategory === 'All' ? 'Best Sellers' : activeCategory}
                        <Link href="/categories" className="text-xs font-normal text-primary ml-auto hover:underline">View All</Link>
                    </h2>

                    {isLoadingProducts && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="aspect-[4/5] rounded-3xl bg-secondary/30 animate-pulse" />
                            ))}
                        </div>
                    )}

                    {!isLoadingProducts && products && products.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                            {products.map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>
                    ) : (
                        (!isLoadingProducts) && (
                            <div className="text-center py-12">
                                <p className="text-muted-foreground text-lg">No products found in this category.</p>
                            </div>
                        )
                    )}

                </section>

                {/* Floating Cart Bar (Zepto Style) */}
                <FloatingCartBar />
            </main>
        </div >
    );
}

function FloatingCartBar() {
    const { items, subtotal } = useCart();

    if (items.length === 0) return null;

    return (
        <div className="fixed bottom-20 md:bottom-8 left-4 right-4 z-50">
            <Link href="/cart">
                <div className="bg-primary text-primary-foreground rounded-xl p-4 shadow-xl flex items-center justify-between animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <div className="flex flex-col">
                        <span className="text-xs font-medium uppercase opacity-90">{items.reduce((acc, item) => acc + item.quantity, 0)} ITEMS</span>
                        <span className="text-lg font-bold">₹{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">View Cart</span>
                        <div className="bg-white/20 p-1 rounded-md">
                            <ShoppingCart className="h-4 w-4" />
                        </div>
                    </div>
                </div>
            </Link>
        </div>
    );
}


// Minimalistic Avatar component to avoid import issues if it's not globally available
const Avatar = ({ children }: { children: React.ReactNode }) => <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">{children}</div>
const AvatarImage = ({ src }: { src?: string }) => src ? <Image src={src} alt="avatar" width={40} height={40} className="w-full h-full object-cover" /> : null;
const AvatarFallback = ({ children }: { children: React.ReactNode }) => <div>{children}</div>
