'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Timer } from 'lucide-react';

interface FlashSaleConfig {
    isActive: boolean;
    title: string;
    endTime: string; // ISO string for form
    targetLink: string;
    backgroundColor: string;
}

export default function MarketingPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [config, setConfig] = useState<FlashSaleConfig>({
        isActive: false,
        title: 'Flash Sale! Get 50% Off',
        endTime: '',
        targetLink: '/search?category=sale',
        backgroundColor: '#ef4444' // red-500
    });

    useEffect(() => {
        if (!firestore) return;
        const loadConfig = async () => {
            const docRef = doc(firestore, 'marketing', 'flash_sale');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                // Convert Timestamp to datetime-local string format YYYY-MM-DDTHH:mm
                let timeStr = '';
                if (data.endTime) {
                    const date = data.endTime.toDate ? data.endTime.toDate() : new Date(data.endTime);
                    // Adjust to local ISO string slightly hacky or use library
                    // Here we just use toISOString().slice(0, 16) but need to handle timezone offset for input type="datetime-local" correctly
                    // Simple approach:
                    const offset = date.getTimezoneOffset() * 60000;
                    const localISOTime = (new Date(date.getTime() - offset)).toISOString().slice(0, 16);
                    timeStr = localISOTime;
                }

                setConfig({
                    isActive: data.isActive ?? false,
                    title: data.title ?? '',
                    endTime: timeStr,
                    targetLink: data.targetLink ?? '',
                    backgroundColor: data.backgroundColor ?? '#ef4444'
                });
            }
            setLoading(false);
        };
        loadConfig();
    }, [firestore]);


    const handleSave = async () => {
        if (!firestore) return;
        setSubmitting(true);
        try {
            const docRef = doc(firestore, 'marketing', 'flash_sale');
            await setDoc(docRef, {
                ...config,
                endTime: config.endTime ? new Date(config.endTime) : null
            });
            toast({ title: "Updated", description: "Flash sale settings saved." });
        } catch (e) {
            console.error(e);
            toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold font-headline">Marketing Tools</h1>
                <p className="text-muted-foreground">Manage campaigns and urgent offers.</p>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Timer className="w-5 h-5 text-primary" />
                        <CardTitle>Flash Sale Banner</CardTitle>
                    </div>
                    <CardDescription>
                        Display a countdown timer at the top of the homepage.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center gap-4 border p-4 rounded-lg bg-secondary/20">
                        <Switch
                            checked={config.isActive}
                            onCheckedChange={(c) => setConfig(prev => ({ ...prev, isActive: c }))}
                        />
                        <Label>Enable Flash Sale Banner</Label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Sale Title</Label>
                            <Input
                                value={config.title}
                                onChange={e => setConfig(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="e.g. Midnight Sale!"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>End Time</Label>
                            <Input
                                type="datetime-local"
                                value={config.endTime}
                                onChange={e => setConfig(prev => ({ ...prev, endTime: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Target Link</Label>
                            <Input
                                value={config.targetLink}
                                onChange={e => setConfig(prev => ({ ...prev, targetLink: e.target.value }))}
                                placeholder="/search?category=deals"
                            />
                        </div>
                        {/* Color picker - optional, keep simple for now */}
                    </div>

                    <Button onClick={handleSave} disabled={submitting}>
                        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Configuration
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
