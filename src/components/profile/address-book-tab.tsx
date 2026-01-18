'use client';

import { PlusCircle, Home, Trash2, Edit, Briefcase, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useFirestore, useUser } from "@/firebase";
import { doc, arrayRemove } from "firebase/firestore";
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { AddressDialog } from '@/components/address-dialog';
import { useAddress } from '@/providers/address-provider';
import { logUserAction } from '@/lib/audit-logger';

export function AddressBookTab() {
    const { user } = useAuth();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { savedAddresses } = useAddress();

    // Remove duplicates
    const uniqueAddresses = Array.from(new Set(savedAddresses));

    const handleDeleteAddress = async (addressToDelete: string) => {
        if (!user || !firestore) return;

        if (confirm('Are you sure you want to delete this address?')) {
            const userProfileRef = doc(firestore, 'users', user.uid);

            try {
                await updateDocumentNonBlocking(userProfileRef, {
                    addresses: arrayRemove(addressToDelete)
                });

                logUserAction(firestore, {
                    userId: user.uid,
                    action: 'PROFILE_UPDATE',
                    details: `Deleted address: ${addressToDelete}`
                });

                toast({
                    title: 'Address Removed',
                    description: 'The selected address has been deleted.',
                    variant: 'destructive'
                });
            } catch (error) {
                console.error("Error deleting address:", error);
                toast({
                    title: "Error",
                    description: "Failed to delete address. Please try again.",
                    variant: "destructive"
                });
            }
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="font-headline">Manage Addresses</CardTitle>
                    <CardDescription>Add or remove your delivery addresses.</CardDescription>
                </div>
                <AddressDialog onSave={() => { /* Listener handles update */ }}>
                    <Button variant="outline" size="sm">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add New
                    </Button>
                </AddressDialog>
            </CardHeader>
            <CardContent className="space-y-4">
                {uniqueAddresses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed rounded-lg">
                        <Home className="h-8 w-8 text-muted-foreground opacity-50 mb-2" />
                        <p className="text-sm text-muted-foreground">No addresses saved yet.</p>
                        <p className="text-xs text-muted-foreground mt-1">Add your home or work address for faster checkout.</p>
                    </div>
                ) : (
                    uniqueAddresses.map((address, index) => {
                        let label = "Home";
                        let displayAddress = address;
                        if (address.startsWith('[')) {
                            const end = address.indexOf(']');
                            if (end > -1) {
                                label = address.substring(1, end);
                                displayAddress = address.substring(end + 1).trim();
                            }
                        }

                        return (
                            <div key={`${address}-${index}`} className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="bg-secondary p-2 rounded-full h-10 w-10 flex items-center justify-center">
                                        {label === 'Work' ? <Briefcase className="h-5 w-5" /> : label === 'Other' ? <MapPin className="h-5 w-5" /> : <Home className="h-5 w-5" />}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-[10px] h-5 px-1.5">{label}</Badge>
                                            <p className="text-sm font-medium line-clamp-1">{displayAddress}</p>
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-1">{displayAddress}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <AddressDialog address={address} onSave={() => { }}>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary">
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </AddressDialog>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                                        onClick={() => handleDeleteAddress(address)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })
                )}
            </CardContent>
        </Card>
    );
}
