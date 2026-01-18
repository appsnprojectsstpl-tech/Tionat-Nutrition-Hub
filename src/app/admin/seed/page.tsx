'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFirestore } from '@/firebase';
import { seedDatabase, undoSeedDatabase } from '@/lib/seed';
import { initializeWarehouses } from '@/lib/migration';
import { seedAmberpetWarehouses } from '@/lib/seed-amberpet'; // Import new script
import { CheckCircle, AlertCircle, RefreshCcw, Trash2, Loader2, MapPin } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { format } from 'date-fns';
import { useEffect } from 'react';

export default function SeedDataPage() {
    const firestore = useFirestore();
    const [isSeeding, setIsSeeding] = useState(false);
    const [seedStatus, setSeedStatus] = useState<'idle' | 'success' | 'migration_success' | 'error' | 'undo_success' | 'seeding'>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [lastSeededAt, setLastSeededAt] = useState<Date | null>(null);

    useEffect(() => {
        if (!firestore) return;

        const unsub = onSnapshot(doc(firestore, 'system_metadata', 'seed_info'), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                if (data.lastSeededAt) {
                    setLastSeededAt(data.lastSeededAt.toDate());
                }
            } else {
                setLastSeededAt(null);
            }
        });

        return () => unsub();
    }, [firestore]);

    const handleSeed = async () => {
        if (!firestore) return;
        setIsSeeding(true);
        setSeedStatus('idle');
        setErrorMessage(null);

        const result = await seedDatabase(firestore);

        if (result.success) {
            setSeedStatus('success');
        } else {
            setSeedStatus('error');
            setErrorMessage(result.error instanceof Error ? result.error.message : 'An unknown error occurred.');
        }

    };

    const handleMigration = async () => {
        if (!firestore) return;
        setIsSeeding(true);
        setSeedStatus('idle');
        setErrorMessage(null);

        const result = await initializeWarehouses(firestore);

        if (result.success) {
            setSeedStatus('migration_success');
        } else {
            setSeedStatus('error');
            setErrorMessage(result.error instanceof Error ? result.error.message : 'Migration failed.');
        }
        setIsSeeding(false);
    };

    const handleAmberpetSeed = async () => {
        setIsSeeding(true);
        setSeedStatus('seeding');
        try {
            const result = await seedAmberpetWarehouses(firestore);
            if (result.success) {
                setSeedStatus('success');
                alert(result.message);
            } else {
                setSeedStatus('error');
            }
        } catch (e) {
            console.error(e);
            setSeedStatus('error');
        } finally {
            setIsSeeding(false);
        }
    };

    const handleUndoSeed = async () => {
        if (!firestore) return;
        if (!confirm('Are you sure you want to revert the seed? This will delete all seeded categories, products, and mock data.')) return;

        setIsSeeding(true);
        setSeedStatus('idle');
        setErrorMessage(null);

        const result = await undoSeedDatabase(firestore);

        if (result.success) {
            setSeedStatus('undo_success');
        } else {
            setSeedStatus('error');
            setErrorMessage(result.error instanceof Error ? result.error.message : 'Failed to undo seed.');
        }

        setIsSeeding(false);
    }

    return (
        <div>
            <h1 className="text-3xl font-bold font-headline mb-6">Seed Database</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Upload Initial Data</CardTitle>
                    <CardDescription>
                        Click the button below to populate your Firestore database with the initial set of products and categories. This is a one-time operation.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-start gap-4">
                        <div className="flex gap-4">
                            <Button onClick={handleSeed} disabled={isSeeding || !firestore}>
                                {isSeeding ? 'Processing...' : 'Seed Database (Resets All)'}
                            </Button>

                            <Button onClick={handleMigration} disabled={isSeeding || !firestore} variant="secondary">
                                {isSeeding ? 'Processing...' : 'Upgrade to Warehouse Model'}
                            </Button>

                            <div className="relative flex-grow">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background px-2 text-muted-foreground">New Zones</span>
                                </div>
                            </div>

                            <Button
                                onClick={handleAmberpetSeed}
                                disabled={isSeeding || !firestore}
                                variant="default"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                {isSeeding ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating Amberpet Zone...
                                    </>
                                ) : (
                                    <>
                                        <MapPin className="mr-2 h-4 w-4" />
                                        Seed Amberpet Zone (5 Warehouses)
                                    </>
                                )}
                            </Button>

                            <Button variant="destructive" onClick={handleUndoSeed} disabled={isSeeding || !firestore || !lastSeededAt}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Undo Seed
                            </Button>
                        </div>

                        <p className="text-xs text-muted-foreground">
                            <strong>Note:</strong> "Seed Database" wipes everything. "Upgrade" only adds new Warehouse structures to existing data.
                        </p>

                        {lastSeededAt && (
                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                                <RefreshCcw className="h-3 w-3" />
                                Last seeded: {format(lastSeededAt, 'PPpp')}
                            </p>
                        )}

                        {seedStatus === 'success' && (
                            <div className="flex items-center text-green-600">
                                <CheckCircle className="h-5 w-5 mr-2" />
                                <p>Database seeded successfully!</p>
                            </div>
                        )}
                        {seedStatus === 'migration_success' && (
                            <div className="flex items-center text-blue-600">
                                <CheckCircle className="h-5 w-5 mr-2" />
                                <p>Successfully upgraded to Warehouse Model!</p>
                            </div>
                        )}
                        {seedStatus === 'undo_success' && (
                            <div className="flex items-center text-orange-600">
                                <CheckCircle className="h-5 w-5 mr-2" />
                                <p>Seed data reverted successfully!</p>
                            </div>
                        )}
                        {seedStatus === 'error' && (
                            <div className="flex items-center text-red-600">
                                <AlertCircle className="h-5 w-5 mr-2" />
                                <div>
                                    <p>Error processing request.</p>
                                    {errorMessage && <p className="text-sm">{errorMessage}</p>}
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
