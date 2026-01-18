'use client';

import { useState, useEffect } from 'react';
import { useWarehouse } from '@/context/warehouse-context';
import { useUser } from '@/firebase'; // Using existing hooks
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, AlertCircle } from 'lucide-react';

export function PincodeGuard() {
    const [isOpen, setIsOpen] = useState(false);

    // User requested to DISABLE the popup.
    // We return null immediately.
    return null;

    /* Original Logic Disabled
    const { selectedWarehouse, checkPincode, isLoading } = useWarehouse();
    // ...
    */
    const [error, setError] = useState('');
    const [isChecking, setIsChecking] = useState(false);

    useEffect(() => {
        // Super Admins see everything, no guard needed
        if (userProfile?.role === 'superadmin') {
            setIsOpen(false);
            return;
        }

        if (!isLoading && !selectedWarehouse) {
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    }, [isLoading, selectedWarehouse, userProfile]);

    const handleCheck = async () => {
        if (pincode.length !== 6) {
            setError('Please enter a valid 6-digit pincode.');
            return;
        }

        setIsChecking(true);
        setError('');

        try {
            const wh = await checkPincode(pincode);
            if (wh) {
                setIsOpen(false);
            } else {
                setError('Sorry, we do not serve this area yet.');
            }
        } catch (e) {
            setError('Something went wrong. Please try again.');
        } finally {
            setIsChecking(false);
        }
    };

    // If we have a warehouse, we show nothing (or maybe a small location bar later)
    if (selectedWarehouse) return null;

    // While loading context, show nothing to avoid flash
    if (isLoading) return null;

    return (
        <Dialog open={isOpen} onOpenChange={() => { }}>
            {/* preventClosing by passing empty handler and not including close button if possible, 
                but DialogContent usually has a close X. We can hide it with CSS or just accept it. 
                For strict gating, we can use `onInteractOutside={(e) => e.preventDefault()}` */}
            <DialogContent className="sm:max-w-md [&>button]:hidden" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
                <DialogHeader className="items-center text-center">
                    <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <MapPin className="h-8 w-8 text-primary" />
                    </div>
                    <DialogTitle className="text-xl font-headline font-bold">Location Required</DialogTitle>
                    <DialogDescription>
                        We need your pincode to check stock availability in your area.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-4">
                    <div className="relative">
                        <Input
                            placeholder="Enter 6-digit Pincode"
                            className="text-center text-lg tracking-widest"
                            maxLength={6}
                            value={pincode}
                            onChange={(e) => {
                                // Only allow numbers
                                const val = e.target.value.replace(/\D/g, '');
                                setPincode(val);
                                setError('');
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
                        />
                    </div>

                    {error && (
                        <div className="flex items-center justify-center text-destructive text-sm gap-2 bg-destructive/10 p-2 rounded-md">
                            <AlertCircle className="h-4 w-4" />
                            <span>{error}</span>
                        </div>
                    )}
                    <div className="text-center text-xs text-muted-foreground bg-secondary/50 p-2 rounded">
                        <strong>Try these:</strong> 560008 (Central), 560034 (South), 560066 (East)
                    </div>
                    <Button onClick={handleCheck} disabled={isChecking || pincode.length !== 6} className="w-full font-bold">
                        {isChecking ? 'Checking...' : 'Find Store'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
