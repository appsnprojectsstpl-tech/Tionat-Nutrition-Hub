'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Activity, Lock, FileText, ShieldAlert } from "lucide-react";
import { useFirestore, useUser } from "@/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { updateDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates";

export default function SystemHealthPage() {
    const firestore = useFirestore();
    const { userProfile } = useUser();
    const { toast } = useToast();

    // Real DB State
    const [settings, setSettings] = useState<any>(null);

    // Listen to System Settings
    const settingsRef = doc(firestore, 'system', 'settings');
    import { onSnapshot } from "firebase/firestore";
    import { useEffect } from "react";

    useEffect(() => {
        if (!firestore) return;
        const unsub = onSnapshot(doc(firestore, 'system/settings'), (doc) => {
            setSettings(doc.data());
        });
        return () => unsub();
    }, [firestore]);


    const toggleMaintenanceMode = async () => {
        const newState = !settings?.maintenanceMode;
        try {
            await updateDocumentNonBlocking(settingsRef, { maintenanceMode: newState }, { merge: true });
            toast({
                title: newState ? "MAINTENANCE MODE ON" : "Maintenance Mode Off",
                description: newState ? "Storefront is now locked." : "Storefront is live.",
                variant: newState ? "destructive" : "default"
            });
        } catch (e) {
            // Create if missing
            await setDocumentNonBlocking(settingsRef, { maintenanceMode: newState }, { merge: true });
        }
    };

    const toggleEmergencyMode = async () => {
        const newState = !settings?.emergencyReadOnly;
        await updateDocumentNonBlocking(settingsRef, { emergencyReadOnly: newState }, { merge: true });
        toast({
            title: newState ? "EMERGENCY MODE ACTIVATED" : "System Normal",
            description: newState ? "All writes are now blocked globally." : "Write access restored.",
            variant: newState ? "destructive" : "default"
        });
    }

    if (userProfile?.role !== 'superadmin') {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
                <ShieldAlert className="h-12 w-12 text-red-500" />
                <h1 className="text-2xl font-bold">Access Restricted</h1>
                <p>Only Super Admins can access System Controls.</p>
            </div>
        );
    }

    const toggleEmergencyMode = async () => {
        // TODO: Implement actual write to config/system
        const newState = !isEmergencyReadOnly;
        setIsEmergencyReadOnly(newState);
        toast({
            title: newState ? "EMERGENCY MODE ACTIVATED" : "System Normal",
            description: newState ? "All writes are now blocked globally." : "Write access restored.",
            variant: newState ? "destructive" : "default"
        });
    };

    return (
        <div className="flex flex-col gap-6 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-headline tracking-tight">System & Governance</h1>
                    <p className="text-muted-foreground">Control plane for system-wide policies and emergency overrides.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={isEmergencyReadOnly ? "destructive" : "outline"} className="px-4 py-1">
                        {isEmergencyReadOnly ? "READ-ONLY MODE" : "HEALTHY"}
                    </Badge>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Database Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold flex items-center gap-2">
                            <Activity className="text-green-500 h-5 w-5" /> Online
                        </div>
                        <p className="text-xs text-muted-foreground">Latency: 24ms</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Global Commission</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">10.0%</div>
                        <p className="text-xs text-muted-foreground">Default Rate</p>
                    </CardContent>
                </Card>
                <Card className={isEmergencyReadOnly ? "border-l-4 border-l-red-500 bg-red-50" : "border-l-4 border-l-gray-300"}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Write Access</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold flex items-center gap-2">
                            {isEmergencyReadOnly ? <Lock className="h-5 w-5" /> : "Unlocked"}
                        </div>
                        <p className="text-xs text-muted-foreground">{isEmergencyReadOnly ? "Writes Blocked" : "Normal Operation"}</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="audit" className="w-full">
                <TabsList>
                    <TabsTrigger value="audit">Audit Trail</TabsTrigger>
                    <TabsTrigger value="config">Configuration</TabsTrigger>
                    <TabsTrigger value="danger">Danger Zone</TabsTrigger>
                </TabsList>

                <TabsContent value="audit" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Global Audit Log</CardTitle>
                            <CardDescription>Recent suspicious or critical actions.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-center p-8 text-muted-foreground border-2 border-dashed rounded-lg">
                                <FileText className="mr-2 h-4 w-4" /> Audit Log Component Placeholder
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="config" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Financial Configuration</CardTitle>
                            <CardDescription>Manage global commission rates and tax defaults.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 max-w-sm">
                                <div className="grid gap-2">
                                    <Label>Default Commission Rate (%)</Label>
                                    <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" defaultValue="10" />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Admin Session PIN</Label>
                                    <div className="flex gap-2">
                                        <input
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                            placeholder="Set 6-digit PIN"
                                            defaultValue={settings?.adminPin}
                                            onChange={(e) => setSettings({ ...settings, adminPin: e.target.value })}
                                        />
                                        <Button onClick={async () => {
                                            if (settings?.adminPin) {
                                                await updateDocumentNonBlocking(settingsRef, { adminPin: settings.adminPin }, { merge: true });
                                                toast({ title: "PIN Updated", description: "New Admin PIN saved." });
                                            }
                                        }}>Save</Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="danger" className="mt-4">
                    <Card className="border-red-200">
                        <CardHeader>
                            <CardTitle className="text-red-600 flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5" /> Emergency Controls
                            </CardTitle>
                            <CardDescription>
                                These actions affect the entire platform availability.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between border p-4 rounded-lg bg-yellow-50/50 mb-4">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Maintenance Mode</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Locks the storefront. Only Admins can access.
                                    </p>
                                </div>
                                <Switch
                                    checked={settings?.maintenanceMode || false}
                                    onCheckedChange={toggleMaintenanceMode}
                                />
                            </div>

                            <div className="flex items-center justify-between border p-4 rounded-lg bg-red-50/50">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Emergency Read-Only Mode</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Prevents ALL users (including admins) from creating orders or updating stock.
                                    </p>
                                </div>
                                <Switch
                                    checked={settings?.emergencyReadOnly || false}
                                    onCheckedChange={toggleEmergencyMode}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
