'use client';

import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useFirestore, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { LoyaltyProgram } from '@/lib/types';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

const loyaltySchema = z.object({
    pointsPerRupee: z.coerce.number().min(0, "Must be a positive number"),
    pointsToRupeeConversion: z.coerce.number().min(0, "Must be a positive number"),
    tierBronzeDiscount: z.coerce.number().min(0).max(100, "Must be between 0 and 100"),
    tierSilverDiscount: z.coerce.number().min(0).max(100, "Must be between 0 and 100"),
    tierGoldDiscount: z.coerce.number().min(0).max(100, "Must be between 0 and 100"),
});

type LoyaltyFormData = z.infer<typeof loyaltySchema>;

export function LoyaltyView() {
    const firestore = useFirestore();
    const { toast } = useToast();

    const { user, isUserLoading } = useUser();

    const loyaltyConfigRef = useMemoFirebase(
        () => (firestore && user ? doc(firestore, 'loyaltyProgram', 'config') : null),
        [firestore, user]
    );

    const { data: loyaltyConfig, isLoading } = useDoc<LoyaltyProgram>(loyaltyConfigRef);

    const form = useForm<LoyaltyFormData>({
        resolver: zodResolver(loyaltySchema),
        defaultValues: {
            pointsPerRupee: 1,
            pointsToRupeeConversion: 0.25,
            tierBronzeDiscount: 5,
            tierSilverDiscount: 10,
            tierGoldDiscount: 15,
        }
    });

    useEffect(() => {
        if (loyaltyConfig) {
            form.reset(loyaltyConfig);
        }
    }, [loyaltyConfig, form]);


    const onSubmit: SubmitHandler<LoyaltyFormData> = (data) => {
        if (!loyaltyConfigRef) return;

        setDocumentNonBlocking(loyaltyConfigRef, data, { merge: true });

        toast({
            title: "Settings Saved",
            description: "Loyalty program rules have been updated successfully.",
        });
    };

    return (
        <div className="flex flex-col gap-4">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Earning Points</CardTitle>
                            <CardDescription>Define how customers earn loyalty points.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <FormField
                                control={form.control}
                                name="pointsPerRupee"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Points per Rupee Spent</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="1" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            How many points a customer earns for each Rupee spent.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Redeeming Points</CardTitle>
                            <CardDescription>Define the value of loyalty points when redeemed.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <FormField
                                control={form.control}
                                name="pointsToRupeeConversion"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Rupees per 100 Points</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="25" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            The discount value (in Rupees) a customer gets for redeeming 100 points.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Tier Discounts</CardTitle>
                            <CardDescription>Set the percentage discount for each loyalty tier.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid sm:grid-cols-3 gap-4">
                            <FormField
                                control={form.control}
                                name="tierBronzeDiscount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Bronze Tier Discount (%)</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="5" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="tierSilverDiscount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Silver Tier Discount (%)</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="10" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="tierGoldDiscount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Gold Tier Discount (%)</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="15" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>
                    <Button type="submit" disabled={form.formState.isSubmitting || isLoading}>
                        {isLoading ? 'Loading...' : 'Save Settings'}
                    </Button>
                </form>
            </Form>
        </div>
    )
}
