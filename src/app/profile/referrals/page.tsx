'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc, updateDoc, collection, query, where, getDocs, runTransaction, serverTimestamp, increment } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Copy, Share2, Users, Gift } from 'lucide-react';
import Link from 'next/link';

export default function ReferralPage() {
    const { user, userProfile } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [referralCode, setReferralCode] = useState('');
    const [referralCount, setReferralCount] = useState(0);
    const [claimCode, setClaimCode] = useState('');
    const [isClaiming, setIsClaiming] = useState(false);

    // 1. Generate Code if missing
    useEffect(() => {
        if (!userProfile || !user || !firestore) return;

        if (userProfile.referralCode) {
            setReferralCode(userProfile.referralCode);
            // Fetch stats
            const fetchStats = async () => {
                const q = query(collection(firestore, 'users'), where('referredBy', '==', userProfile.referralCode));
                const snap = await getDocs(q);
                setReferralCount(snap.size);
            };
            fetchStats();
        } else {
            // Generate Code
            const generateAndSave = async () => {
                const base = (userProfile.firstName || 'USER').slice(0, 4).toUpperCase();
                const random = Math.floor(1000 + Math.random() * 9000); // 4 digits
                const newCode = `${base}${random}`;

                // ideally check uniqueness but low collision chance for MVP
                try {
                    await updateDoc(doc(firestore, 'users', user.uid), {
                        referralCode: newCode
                    });
                    setReferralCode(newCode);
                } catch (e) {
                    console.error("Failed to generate code", e);
                }
            };
            generateAndSave();
        }
    }, [userProfile, user, firestore]);

    const handleCopy = () => {
        navigator.clipboard.writeText(referralCode);
        toast({ title: "Copied!", description: "Referral code copied to clipboard." });
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Join Tionat Nutrition Hub',
                    text: `Use my code ${referralCode} to get 50 Loyalty Points!`,
                    url: window.location.origin
                });
            } catch (err) {
                console.log("Share cancelled");
            }
        } else {
            handleCopy();
        }
    };

    const handleClaim = async () => {
        if (!firestore || !user) return;
        if (!claimCode) return;
        if (userProfile?.referredBy) {
            toast({ title: "Already Referred", description: "You have already claimed a referral bonus.", variant: "destructive" });
            return;
        }
        if (claimCode === referralCode) {
            toast({ title: "Invalid Code", description: "You cannot refer yourself.", variant: "destructive" });
            return;
        }

        setIsClaiming(true);
        try {
            await runTransaction(firestore, async (transaction) => {
                // Find referrer
                const q = query(collection(firestore, 'users'), where('referralCode', '==', claimCode));
                const snap = await getDocs(q);

                if (snap.empty) {
                    throw new Error("Invalid referral code.");
                }

                const referrerDoc = snap.docs[0];
                const referrerId = referrerDoc.id;

                // 1. Update Me (ReferredBy + Points)
                const myRef = doc(firestore, 'users', user.uid);
                transaction.update(myRef, {
                    referredBy: claimCode,
                    loyaltyPoints: increment(50)
                });

                // 2. Update Referrer (Points)
                const referrerRef = doc(firestore, 'users', referrerId);
                transaction.update(referrerRef, {
                    loyaltyPoints: increment(100)
                });

                // 3. Log History Me
                const myHistRef = doc(collection(firestore, `users/${user.uid}/loyalty_history`));
                transaction.set(myHistRef, {
                    type: 'EARN',
                    points: 50,
                    reason: `Referred by ${claimCode}`,
                    createdAt: serverTimestamp()
                });

                // 4. Log History Referrer
                const refHistRef = doc(collection(firestore, `users/${referrerId}/loyalty_history`));
                transaction.set(refHistRef, {
                    type: 'EARN',
                    points: 100,
                    reason: `Referral Bonus (${userProfile?.firstName || 'User'})`,
                    createdAt: serverTimestamp()
                });
            });

            toast({ title: "Success!", description: "You earned 50 points!" });
            setClaimCode('');
            // Profile update might take a moment to reflect in UI hooks
        } catch (e: any) {
            toast({ title: "Claim Failed", description: e.message, variant: "destructive" });
        } finally {
            setIsClaiming(false);
        }
    };

    if (!user) return <div className="p-8">Please login.</div>;

    return (
        <div className="container max-w-md py-6 space-y-6 mx-auto">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/profile"><ArrowLeft className="w-5 h-5" /></Link>
                </Button>
                <h1 className="text-2xl font-bold font-headline">Refer & Earn</h1>
            </div>

            <Card className="bg-gradient-to-br from-violet-500 to-purple-600 text-white border-none shadow-xl">
                <CardHeader className="text-center pb-2">
                    <Gift className="w-12 h-12 mx-auto mb-2 text-yellow-300 animate-bounce" />
                    <CardTitle className="text-2xl">Invite Friends</CardTitle>
                    <CardDescription className="text-violet-100">
                        They get <span className="font-bold text-yellow-300">50 pts</span>. You get <span className="font-bold text-yellow-300">100 pts</span>!
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/20 text-center">
                        <Label className="text-violet-200 text-xs uppercase tracking-widest">Your Referral Code</Label>
                        <div className="text-3xl font-mono font-bold tracking-wider mt-1 select-all">
                            {referralCode || '...'}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleCopy} variant="secondary" className="flex-1 bg-white text-violet-600 hover:bg-violet-50">
                            <Copy className="mr-2 h-4 w-4" /> Copy
                        </Button>
                        <Button onClick={handleShare} variant="secondary" className="flex-1 bg-white text-violet-600 hover:bg-violet-50">
                            <Share2 className="mr-2 h-4 w-4" /> Share
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Users className="w-5 h-5 text-gray-500" />
                        Your Impact
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Friends Referred</span>
                        <span className="text-2xl font-bold">{referralCount}</span>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                        Total earned: {referralCount * 100} pts
                    </div>
                </CardContent>
            </Card>

            {!userProfile?.referredBy ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Have a code?</CardTitle>
                        <CardDescription>Enter a friend's code to claim your welcome bonus.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex gap-2">
                        <Input
                            placeholder="Enter Code"
                            className="uppercase"
                            value={claimCode}
                            onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
                        />
                        <Button onClick={handleClaim} disabled={isClaiming || !claimCode}>
                            {isClaiming ? '...' : 'Claim'}
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="text-center text-sm text-green-600 font-medium bg-green-50 p-4 rounded-lg">
                    ✅ You claimed a referral bonus from {userProfile.referredBy}.
                </div>
            )}
        </div>
    );
}
