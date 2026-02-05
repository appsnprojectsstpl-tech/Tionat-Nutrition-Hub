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
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useAuth, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import { useAddress } from '@/providers/address-provider';

// Enhanced Schema with Label
const addressSchema = z.object({
    address: z.string().min(10, 'Please enter a full, valid address.'),
    label: z.enum(['Home', 'Work', 'Other']).default('Home'),
});

type AddressFormData = z.infer<typeof addressSchema>;

interface AddressDialogProps {
    children: React.ReactNode;
    address?: string; // The address to edit, if any
    onSave?: () => void; // Callback to refetch data on parent
}

export function AddressDialog({ children, address, onSave }: AddressDialogProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const { setAddress } = useAddress();

    // Parse existing address to extract label if possible
    // Format: "[Label] Address"
    const getInitialValues = () => {
        let initialLabel: 'Home' | 'Work' | 'Other' = 'Home';
        let initialAddr = address || '';

        // Robust Regex Parsing
        // Matches: [Home] Street... or [Work] Street...
        const labelRegex = /^\[(Home|Work|Other)\]\s*(.+)$/i;
        const match = address ? address.match(labelRegex) : null;

        if (match) {
            // match[1] is Label, match[2] is Address
            const extractedLabel = match[1];
            // Normalize case just in case
            const normalizedLabel = extractedLabel.charAt(0).toUpperCase() + extractedLabel.slice(1).toLowerCase();

            if (['Home', 'Work', 'Other'].includes(normalizedLabel)) {
                initialLabel = normalizedLabel as 'Home' | 'Work' | 'Other';
                initialAddr = match[2].trim();
            }
        }

        return { label: initialLabel, address: initialAddr };
    };

    const form = useForm<AddressFormData>({
        resolver: zodResolver(addressSchema),
        defaultValues: getInitialValues(),
    });

    useEffect(() => {
        if (isOpen) {
            form.reset(getInitialValues());
        }
    }, [isOpen, address, form]);

    const onSubmit: SubmitHandler<AddressFormData> = async (data) => {
        const fullAddress = data.label === 'Other' ? data.address : `[${data.label}] ${data.address}`;
        try {
            await setAddress(fullAddress);
            toast({ title: "Address Saved", description: "Your address has been saved." });
            setIsOpen(false);
            if (onSave) onSave();
        } catch (error) {
            console.error("Error updating address:", error);
            toast({
                title: "Error",
                description: "Failed to save address.",
                variant: "destructive"
            });
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
                        Enter your delivery details.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="label"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Address Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Home">Home</SelectItem>
                                            <SelectItem value="Work">Work</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Full Address</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. 123 Main St, Bangalore" {...field} />
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
