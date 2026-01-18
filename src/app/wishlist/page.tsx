'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ProductCard } from '@/components/product-card';
import { Button } from '@/components/ui/button';
import { useWishlist } from '@/hooks/use-wishlist';
import { useFirestore, useUser, useCollection } from '@/firebase';
import { collection, query, where, getDocs, documentId, addDoc, serverTimestamp } from 'firebase/firestore';
import { Product } from '@/lib/types';
import { Heart, Loader2, FolderPlus, Folder, LayoutGrid } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

type WishlistFolder = {
    id: string;
    name: string;
    items: string[]; // Product IDs
    createdAt: any;
};

export default function WishlistPage() {
    const { user } = useUser();
    const { wishlist: mainWishlist, isLoading: isMainLoading } = useWishlist();
    const firestore = useFirestore();

    const [activeListId, setActiveListId] = useState<string>('main');
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);

    // Create Folder State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Fetch Folders
    const { data: folders, isLoading: isFoldersLoading } = useCollection<WishlistFolder>(
        (user && firestore) ? collection(firestore, `users/${user.uid}/wishlist_lists`) : null
    );

    // Identify current list items
    const currentListItems = activeListId === 'main'
        ? mainWishlist
        : folders?.find(f => f.id === activeListId)?.items || [];

    // Fetch Products for current List
    useEffect(() => {
        const fetchProducts = async () => {
            if (!firestore || currentListItems.length === 0) {
                setProducts([]);
                return;
            }

            setIsLoadingProducts(true);
            try {
                // Determine IDs to fetch
                const ids = currentListItems;

                // Chunk queries (Firestore 'in' limit 10)
                const chunks = [];
                for (let i = 0; i < ids.length; i += 10) {
                    chunks.push(ids.slice(i, i + 10));
                }

                let allProducts: Product[] = [];
                for (const chunk of chunks) {
                    const q = query(collection(firestore, 'products'), where(documentId(), 'in', chunk));
                    const snapshot = await getDocs(q);
                    allProducts = [...allProducts, ...snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product))];
                }
                setProducts(allProducts);
            } catch (error) {
                console.error("Error fetching products", error);
            } finally {
                setIsLoadingProducts(false);
            }
        };

        fetchProducts();
    }, [firestore, currentListItems]); // Re-run when active list items change

    const handleCreateFolder = async () => {
        if (!newFolderName.trim() || !user || !firestore) return;
        setIsCreating(true);
        try {
            await addDoc(collection(firestore, `users/${user.uid}/wishlist_lists`), {
                name: newFolderName,
                items: [],
                createdAt: serverTimestamp()
            });
            toast({ title: "Folder Created", description: `"${newFolderName}" is ready.` });
            setNewFolderName('');
            setIsCreateOpen(false);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to create folder.", variant: "destructive" });
        } finally {
            setIsCreating(false);
        }
    };

    if (isMainLoading || (isFoldersLoading && activeListId !== 'main')) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading your collections...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <main className="container mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row gap-8">

                    {/* Sidebar / Top Bar */}
                    <div className="w-full md:w-64 flex-shrink-0 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="font-headline font-semibold text-lg">Your Collections</h2>
                            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon"><FolderPlus className="h-5 w-5" /></Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>New Wishlist Folder</DialogTitle>
                                        <DialogDescription>Create a collection to organize your items.</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-2 py-4">
                                        <Label>Folder Name</Label>
                                        <Input
                                            placeholder="e.g. Gym Stack, Holiday Gifts"
                                            value={newFolderName}
                                            onChange={(e) => setNewFolderName(e.target.value)}
                                        />
                                    </div>
                                    <DialogFooter>
                                        <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                                        <Button onClick={handleCreateFolder} disabled={isCreating}>Create</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>

                        <div className="flex flex-row md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                            <Button
                                variant={activeListId === 'main' ? "secondary" : "ghost"}
                                className={cn("justify-start flex-shrink-0", activeListId === 'main' && "bg-pink-50 text-pink-700 hover:bg-pink-100")}
                                onClick={() => setActiveListId('main')}
                            >
                                <Heart className={cn("mr-2 h-4 w-4", activeListId === 'main' ? "fill-pink-500 text-pink-500" : "")} />
                                All Favorites
                                <span className="ml-auto text-xs opacity-60 bg-background/50 px-1.5 py-0.5 rounded-full">{mainWishlist.length}</span>
                            </Button>

                            <Separator className="hidden md:block" />

                            {folders?.map(folder => (
                                <Button
                                    key={folder.id}
                                    variant={activeListId === folder.id ? "secondary" : "ghost"}
                                    className="justify-start flex-shrink-0"
                                    onClick={() => setActiveListId(folder.id)}
                                >
                                    <Folder className="mr-2 h-4 w-4 text-amber-500" />
                                    <span className="truncate max-w-[120px]">{folder.name}</span>
                                    <span className="ml-auto text-xs opacity-60 px-1.5 py-0.5 rounded-full">{folder.items?.length || 0}</span>
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1">
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold font-headline mb-1">
                                {activeListId === 'main' ? 'My Wishlist' : folders?.find(f => f.id === activeListId)?.name}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {products.length} Items • <Link href="/" className="underline hover:text-primary">Continue Shopping</Link>
                            </p>
                        </div>

                        {isLoadingProducts ? (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="h-64 bg-secondary/30 animate-pulse rounded-xl" />
                                <div className="h-64 bg-secondary/30 animate-pulse rounded-xl" />
                            </div>
                        ) : products.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center bg-secondary/10 rounded-3xl border border-dashed border-border/50">
                                <div className="bg-background p-4 rounded-full mb-4 shadow-sm">
                                    <LayoutGrid className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-semibold mb-1">This collection is empty</h3>
                                <p className="text-muted-foreground max-w-xs mb-6">
                                    Start adding products to organize your nutrition plan.
                                </p>
                                <Button asChild variant="outline">
                                    <Link href="/">Browse Products</Link>
                                </Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                                {products.map((product) => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
