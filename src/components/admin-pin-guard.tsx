'use client';

import { useFirestore } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function AdminPinGuard({ children }: { children: React.ReactNode }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isVerified, setIsVerified] = useState(false);
    const [pin, setPin] = useState("");
    const [loading, setLoading] = useState(false);
    const [shouldShowDialog, setShouldShowDialog] = useState(false);

    useEffect(() => {
        // Check Session Storage
        const verified = sessionStorage.getItem('admin_pin_verified');
        if (verified === 'true') {
            setIsVerified(true);
        } else {
            setShouldShowDialog(true);
        }
    }, []);

    const handleVerify = async () => {
        if (!firestore) return;
        setLoading(true);
        try {
            const settingsDoc = await getDoc(doc(firestore, 'system', 'settings'));
            const dbPin = settingsDoc.data()?.adminPin || '123456'; // Default Fallback

            if (pin === dbPin) {
                sessionStorage.setItem('admin_pin_verified', 'true');
                setIsVerified(true);
                setShouldShowDialog(false);
                toast({ title: "Access Granted", description: "Session verified." });
            } else {
                toast({ title: "Access Denied", description: "Incorrect PIN.", variant: "destructive" });
                setPin("");
            }
        } catch (e) {
            console.error("PIN Check Failed", e);
            toast({ title: "Error", description: "Could not verify PIN.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    if (isVerified) {
        return <>{children}</>;
    }

    if (!shouldShowDialog) return null; // Loading state before mounting

    return (
        <Dialog open={true}>
            <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5 text-amber-500" />
                        Admin Security
                    </DialogTitle>
                    <DialogDescription>
                        Please enter the Admin Session PIN to continue.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex items-center space-x-2 py-4">
                    <Input
                        type="password"
                        placeholder="Enter 6-digit PIN"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        className="text-center text-lg tracking-widest"
                        maxLength={6}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleVerify();
                        }}
                    />
                </div>
                <DialogFooter className="sm:justify-between">
                    <Button variant="ghost" onClick={() => window.location.href = '/'}>Go Home</Button>
                    <Button onClick={handleVerify} disabled={loading || pin.length < 4}>
                        {loading ? "Verifying..." : "Unlock Dashboard"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
