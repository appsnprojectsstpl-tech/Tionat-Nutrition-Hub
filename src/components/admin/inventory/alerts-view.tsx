"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Bell, Mail, MessageSquare, Save, AlertTriangle } from "lucide-react";

export function AlertsSettingsView() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    // In a real app, these would come from Firestore 'settings/alerts'
    const [config, setConfig] = useState({
        lowStockThreshold: 5,
        enableEmail: true,
        enableSMS: false,
        adminEmail: "admin@tionat.com", // Default
        adminPhone: ""
    });

    const handleSave = async () => {
        setIsLoading(true);
        // Simulate backend save
        await new Promise(r => setTimeout(r, 800));

        // Here we would write to firestore
        // await setDoc(doc(firestore, 'settings', 'alerts'), config);

        toast({
            title: "Settings Saved",
            description: "Alert preferences have been updated."
        });
        setIsLoading(false);
    };

    const handleTestAlert = async () => {
        toast({
            title: "Test Alert Sent",
            description: `Simulating ${config.enableEmail ? 'Email' : ''} ${config.enableSMS ? '& SMS' : ''} to admin.`
        });
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
                {/* Configuration Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bell className="h-5 w-5" />
                            Notification Settings
                        </CardTitle>
                        <CardDescription>Configure when and how you receive inventory alerts.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        <div className="space-y-4">
                            <h3 className="font-medium text-sm text-muted-foreground border-b pb-2">Triggers</h3>
                            <div className="grid gap-2">
                                <Label htmlFor="threshold">Low Stock Threshold</Label>
                                <div className="flex gap-2 items-center">
                                    <Input
                                        id="threshold"
                                        type="number"
                                        value={config.lowStockThreshold}
                                        onChange={(e) => setConfig({ ...config, lowStockThreshold: parseInt(e.target.value) })}
                                        className="w-24"
                                    />
                                    <span className="text-sm text-muted-foreground">units</span>
                                </div>
                                <p className="text-xs text-muted-foreground">Products below this quantity will trigger an alert.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-medium text-sm text-muted-foreground border-b pb-2">Channels</h3>

                            <div className="flex items-center justify-between space-x-2">
                                <div className="flex flex-col space-y-1">
                                    <Label className="flex items-center gap-2">
                                        <Mail className="h-4 w-4" /> Email Notifications
                                    </Label>
                                    <span className="text-xs text-muted-foreground">Send daily summary to admin email.</span>
                                </div>
                                <Switch
                                    checked={config.enableEmail}
                                    onCheckedChange={(c) => setConfig({ ...config, enableEmail: c })}
                                />
                            </div>

                            {config.enableEmail && (
                                <Input
                                    value={config.adminEmail}
                                    onChange={(e) => setConfig({ ...config, adminEmail: e.target.value })}
                                    placeholder="Enter Admin Email"
                                />
                            )}

                            <div className="flex items-center justify-between space-x-2 pt-2">
                                <div className="flex flex-col space-y-1">
                                    <Label className="flex items-center gap-2">
                                        <MessageSquare className="h-4 w-4" /> SMS Alerts
                                    </Label>
                                    <span className="text-xs text-muted-foreground">Get instant texts for critical stockouts (Requires Credits).</span>
                                </div>
                                <Switch
                                    checked={config.enableSMS}
                                    onCheckedChange={(c) => setConfig({ ...config, enableSMS: c })}
                                />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="justify-between border-t pt-6">
                        <Button variant="ghost" onClick={handleTestAlert}>Test Alert</Button>
                        <Button onClick={handleSave} disabled={isLoading}>
                            <Save className="mr-2 h-4 w-4" />
                            Save Preferences
                        </Button>
                    </CardFooter>
                </Card>

                {/* Status Card */}
                <Card className="bg-orange-50/50 border-orange-100">
                    <CardHeader>
                        <CardTitle className="text-orange-900">Alert Service Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Alert className="bg-white border-orange-200">
                            <AlertTriangle className="h-4 w-4 text-orange-600" />
                            <AlertTitle className="text-orange-800">Email Service: Active</AlertTitle>
                            <AlertDescription className="text-xs text-orange-700 mt-1">
                                Using simulated email provider. In production, configure SendGrid/AWS SES.
                            </AlertDescription>
                        </Alert>
                        <Alert className="bg-white border-orange-200">
                            <AlertTriangle className="h-4 w-4 text-orange-600" />
                            <AlertTitle className="text-orange-800">SMS Service: Sandbox</AlertTitle>
                            <AlertDescription className="text-xs text-orange-700 mt-1">
                                Twilio API keys missing. SMS will be logged to console only.
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
