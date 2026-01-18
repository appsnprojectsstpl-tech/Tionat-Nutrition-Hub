'use client';

import { Suspense } from 'react';
import { useAuth, useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Smartphone, Globe, ShoppingBag } from "lucide-react";
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

interface ActivityLog {
    id: string;
    type: 'LOGIN' | 'ORDER' | 'PROFILE_UPDATE' | 'ADDRESS_CHANGE';
    description: string;
    timestamp: any;
    device?: string;
    location?: string;
}

function ActivityContent() {
    const { user, isUserLoading } = useAuth();
    const router = useRouter();
    const firestore = useFirestore();

    const logsQuery = (firestore && user)
        ? query(
            collection(firestore, `users/${user.uid}/activity_logs`),
            orderBy('timestamp', 'desc'),
            limit(20)
        )
        : null;

    const { data: logs, isLoading } = useCollection<ActivityLog>(logsQuery);

    if (isUserLoading) return <div className="p-8 text-center">Loading...</div>;
    if (!user) {
        router.push('/login');
        return null;
    }

    return (
        <div className="min-h-screen bg-background">
            <main className="container mx-auto px-4 py-8 max-w-2xl">
                <Button variant="ghost" onClick={() => router.back()} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Profile
                </Button>

                <div className="mb-6">
                    <h1 className="text-2xl font-bold font-headline flex items-center gap-2">
                        <Shield className="h-6 w-6 text-green-600" />
                        Account Activity
                    </h1>
                    <p className="text-muted-foreground">
                        Review the security and activity of your account.
                    </p>
                </div>

                <div className="space-y-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Current Session</CardTitle>
                        </CardHeader>
                        <CardContent className="flex items-center gap-4">
                            <div className="bg-green-100 p-2 rounded-full">
                                <Globe className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="font-medium text-sm">Active now</p>
                                <p className="text-xs text-muted-foreground">Chrome on Windows</p>
                            </div>
                        </CardContent>
                    </Card>

                    <h3 className="text-lg font-semibold mt-6 mb-2">Recent History</h3>

                    {isLoading && <p className="text-center py-4 text-muted-foreground">Loading history...</p>}

                    {!isLoading && (!logs || logs.length === 0) && (
                        <div className="text-center py-8 border rounded-lg border-dashed">
                            <p className="text-muted-foreground">No recent activity recorded.</p>
                            <p className="text-xs text-muted-foreground mt-1">Activities generally appear here within 5 minutes.</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        {logs?.map((log) => (
                            <div key={log.id} className="flex gap-4 items-start p-4 border rounded-lg bg-card">
                                <div className="mt-1">
                                    {log.type === 'ORDER' ? <ShoppingBag className="h-5 w-5 text-blue-500" /> :
                                        log.type === 'LOGIN' ? <Shield className="h-5 w-5 text-green-500" /> :
                                            <Smartphone className="h-5 w-5 text-slate-500" />}
                                </div>
                                <div>
                                    <p className="font-medium text-sm">{log.description}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {log.timestamp?.toDate ? format(log.timestamp.toDate(), 'PP p') : 'Just now'}
                                    </p>
                                    {log.location && <p className="text-xs text-muted-foreground mt-1">{log.location}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}

export default function ActivityPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ActivityContent />
        </Suspense>
    );
}
