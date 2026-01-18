'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Banner } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from '@/components/ui/switch';
import { Image, ImagePlus, Loader2, Trash2 } from 'lucide-react';

const bannerSchema = z.object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
    link: z.string().optional(),
    order: z.coerce.number().default(0),
    isActive: z.boolean().default(true),
});

type BannerFormData = z.infer<typeof bannerSchema>;

export default function BannersPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);

    const bannerQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'banners'), orderBy('order', 'asc'));
    }, [firestore]);

    const { data: banners, isLoading } = useCollection<Banner>(bannerQuery);

    const form = useForm<BannerFormData>({
        resolver: zodResolver(bannerSchema),
        defaultValues: {
            isActive: true,
            order: 0
        }
    });

    const onSubmit = async (data: BannerFormData) => {
        if (!firestore) return;

        if (!selectedImage) {
            toast({ title: "Image Required", description: "Please select an image for the banner.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Upload Image
            const storage = getStorage();
            const storageRef = ref(storage, `banners/${Date.now()}_${selectedImage.name}`);
            await uploadBytes(storageRef, selectedImage);
            const imageUrl = await getDownloadURL(storageRef);

            // 2. Save Banner
            const bannerRef = doc(collection(firestore, 'banners'));
            await setDoc(bannerRef, {
                id: bannerRef.id,
                imageUrl,
                ...data
            });

            toast({ title: "Banner Created", description: "New banner has been added to the homepage." });
            setIsDialogOpen(false);
            form.reset();
            setSelectedImage(null);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to create banner.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure?")) return;
        await deleteDoc(doc(firestore!, 'banners', id));
        toast({ title: "Banner Deleted" });
    };

    const toggleStatus = async (banner: Banner) => {
        await updateDoc(doc(firestore!, 'banners', banner.id), { isActive: !banner.isActive });
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold font-headline">Banner Manager</h1>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <ImagePlus className="w-4 h-4 mr-2" />
                            Add Banner
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Banner</DialogTitle>
                            <DialogDescription>Upload a banner for the homepage hero carousel.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div>
                                <Label>Banner Image (Landscape)</Label>
                                <Input type="file" accept="image/*" onChange={(e) => setSelectedImage(e.target.files?.[0] || null)} />
                            </div>
                            <div>
                                <Label>Title (Optional)</Label>
                                <Input {...form.register('title')} placeholder="e.g. Summer Sale" />
                            </div>
                            <div>
                                <Label>Subtitle (Optional)</Label>
                                <Input {...form.register('subtitle')} placeholder="e.g. Flat 50% Off" />
                            </div>
                            <div>
                                <Label>Link URL (Optional)</Label>
                                <Input {...form.register('link')} placeholder="e.g. /category/protein" />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <Label>Order</Label>
                                    <Input type="number" {...form.register('order')} />
                                </div>
                                <div className="flex items-center gap-2 mt-6">
                                    <Label>Active</Label>
                                    <Switch checked={form.watch('isActive')} onCheckedChange={(v) => form.setValue('isActive', v)} />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Create Banner
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Active Banners</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Preview</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Link</TableHead>
                                <TableHead>Order</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? <TableRow><TableCell colSpan={6}>Loading...</TableCell></TableRow> :
                                banners?.map((banner) => (
                                    <TableRow key={banner.id}>
                                        <TableCell>
                                            <div className="relative w-32 h-16 rounded-lg overflow-hidden bg-muted">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={banner.imageUrl} alt="banner" className="object-cover w-full h-full" />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <p className="font-semibold">{banner.title || '-'}</p>
                                            <p className="text-xs text-muted-foreground">{banner.subtitle}</p>
                                        </TableCell>
                                        <TableCell className="text-xs">{banner.link || '-'}</TableCell>
                                        <TableCell>{banner.order}</TableCell>
                                        <TableCell>
                                            <Switch checked={banner.isActive} onCheckedChange={() => toggleStatus(banner)} />
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(banner.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            }
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
