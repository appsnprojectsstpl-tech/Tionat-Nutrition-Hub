'use client';

import { useFirestore, useUser } from "@/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { logAdminAction } from "@/lib/audit-logger";

export default function AdminSettingsPage() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();

    // Config State
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [minOrderValue, setMinOrderValue] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Fetch Settings
    useEffect(() => {
        if (!firestore) return;
        const fetchSettings = async () => {
            try {
                const docRef = doc(firestore, 'system', 'settings');
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    setMaintenanceMode(snap.data().maintenanceMode || false);
                    setMinOrderValue(snap.data().minOrderValue || 0);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, [firestore]);

    const handleSave = async () => {
        if (!firestore) return;
        setIsSaving(true);
        try {
            await updateDoc(doc(firestore, 'system', 'settings'), {
                maintenanceMode,
                minOrderValue: Number(minOrderValue),
                updatedAt: serverTimestamp()
            });

            // Log Action
            await logAdminAction(firestore, {
                action: 'SYSTEM_CONFIG_UPDATE',
                performedBy: user?.email || 'unknown',
                targetId: 'settings',
                targetType: 'SYSTEM',
                details: `Maintenance: ${maintenanceMode}, MinOrder: ${minOrderValue}`,
                status: 'SUCCESS'
            });

            toast({ title: "Settings Updated", description: "System configuration saved." });
        } catch (e) {
            toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div>Loading settings...</div>;

    return (
        <div className="space-y-6 max-w-2xl">
            <h1 className="text-3xl font-bold font-headline">System Settings</h1>

            <Card className="border-destructive/20 bg-destructive/5">
                <CardHeader>
                    <CardTitle className="text-destructive">Maintenance Mode</CardTitle>
                    <CardDescription>
                        When enabled, only Admins can access the app. Users will see a maintenance screen.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                    <Label htmlFor="maintenance-mode" className="font-bold">Enable Maintenance Mode</Label>
                    <Switch
                        id="maintenance-mode"
                        checked={maintenanceMode}
                        onCheckedChange={setMaintenanceMode}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Order Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="min-order">Minimum Order Value (₹)</Label>
                        <Input
                            type="number"
                            id="min-order"
                            value={minOrderValue}
                            onChange={(e) => setMinOrderValue(Number(e.target.value))}
                        />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
