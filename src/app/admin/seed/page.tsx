'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFirestore } from '@/firebase';
import { seedDatabase } from '@/lib/seed';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function SeedDataPage() {
    const firestore = useFirestore();
    const [isSeeding, setIsSeeding] = useState(false);
    const [seedStatus, setSeedStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

        setIsSeeding(false);
    };

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
                        <Button onClick={handleSeed} disabled={isSeeding || !firestore}>
                            {isSeeding ? 'Seeding...' : 'Seed Database'}
                        </Button>
                        {seedStatus === 'success' && (
                            <div className="flex items-center text-green-600">
                                <CheckCircle className="h-5 w-5 mr-2" />
                                <p>Database seeded successfully!</p>
                            </div>
                        )}
                        {seedStatus === 'error' && (
                            <div className="flex items-center text-red-600">
                                <AlertCircle className="h-5 w-5 mr-2" />
                                <div>
                                    <p>Error seeding database.</p>
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
