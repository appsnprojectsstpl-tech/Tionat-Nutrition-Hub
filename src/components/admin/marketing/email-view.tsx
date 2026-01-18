'use client';

import { useState } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, Mail } from 'lucide-react';
import { logAdminAction } from '@/lib/audit-logger';

export function EmailCampaignsView() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState(''); // Simple text for now, could be HTML
    const [audience, setAudience] = useState('all');

    const handleSend = async () => {
        if (!subject.trim() || !body.trim()) {
            toast({ title: "Validation Error", description: "Subject and Body are required.", variant: "destructive" });
            return;
        }

        if (!firestore) return;
        setSubmitting(true);

        try {
            // 1. Create Campaign Record
            const campaignRef = await addDoc(collection(firestore, 'email_campaigns'), {
                subject,
                body,
                audience,
                status: 'SCHEDULED', // or 'QUEUED' if using extension
                sentCount: 0,
                createdBy: user?.uid,
                createdAt: serverTimestamp(),
            });

            // 2. Log Action
            logAdminAction({
                action: 'CAMPAIGN_CREATE',
                performedBy: user?.email || 'unknown',
                targetId: campaignRef.id,
                targetType: 'CAMPAIGN',
                details: `Created email campaign: ${subject}`
            });

            // 3. Simulate Sending (or trigger Firebase Extension logic)
            // For now, we just reset and show success since we don't have a real mailer extension set up.
            // In a real app, a Cloud Function would listen to 'email_campaigns' creation.

            toast({
                title: "Campaign Scheduled",
                description: "Emails have been queued for sending."
            });

            setSubject('');
            setBody('');
            setAudience('all');

        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to schedule campaign.", variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Mail className="w-5 h-5 text-primary" />
                        <CardTitle>Newsletter Builder</CardTitle>
                    </div>
                    <CardDescription>
                        Send email updates to your customers.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Audience</Label>
                        <Select value={audience} onValueChange={setAudience}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Audience" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Active Users</SelectItem>
                                <SelectItem value="premium">Premium Members (Gold)</SelectItem>
                                <SelectItem value="newsletter">Newsletter Subscribers</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Subject Line</Label>
                        <Input
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="e.g. Flash Sale: 50% Off Everything!"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Email Content</Label>
                        <Textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder="Write your message here..."
                            className="min-h-[200px] font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                            Basic text format only for now. HTML support coming soon.
                        </p>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <Button onClick={handleSend} disabled={submitting}>
                            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Send Newsletter
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
