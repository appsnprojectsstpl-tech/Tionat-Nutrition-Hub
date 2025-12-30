'use client';

import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc, arrayUnion, arrayRemove } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import { useAddress } from '@/providers/address-provider';

const addressSchema = z.object({
    address: z.string().min(10, 'Please enter a full, valid address.'),
});

type AddressFormData = z.infer<typeof addressSchema>;

interface AddressDialogProps {
    children: React.ReactNode;
    address?: string; // The address to edit, if any
    onSave?: () => void; // Callback to refetch data on parent
}

export function AddressDialog({ children, address, onSave }: AddressDialogProps) {
    const { user } = useAuth();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);

    const userProfileRef = useMemoFirebase(
        () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
        [firestore, user]
    );

    const form = useForm<AddressFormData>({
        resolver: zodResolver(addressSchema),
        defaultValues: {
            address: address || '',
        }
    });

    const { setAddress } = useAddress();

    useEffect(() => {
        if (isOpen) {
            form.reset({ address: address || '' });
        }
    }, [isOpen, address, form]);

    const onSubmit: SubmitHandler<AddressFormData> = async (data) => {
        try {
            await setAddress(data.address);
        } catch (error) {
            console.error("Error updating address:", error);
            toast({
                title: "Error",
                description: "Failed to save address.",
                variant: "destructive"
            });
            return;
        }

        toast({
            title: address ? "Address Updated" : "Address Added",
            description: "Your delivery address has been saved.",
        });

        setIsOpen(false);
        if (onSave) {
            onSave();
        }
    };

    if (!user) {
        return <>{children}</>;
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{address ? 'Edit Address' : 'Add New Address'}</DialogTitle>
                    <DialogDescription>
                        Enter your full address including city and pincode.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {/* GPS button removed - using saved addresses only */}

                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Full Address</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. 123 Main St, Anytown, 123456" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                            <Button type="submit">Save Address</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
