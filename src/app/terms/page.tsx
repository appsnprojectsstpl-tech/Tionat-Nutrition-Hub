'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, CheckCircle2, FileText, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-background">
            <main className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold font-headline mb-2">Terms of Service</h1>
                    <p className="text-muted-foreground">AGREEMENT TO OUR LEGAL TERMS</p>
                    <div className="flex justify-center mt-4">
                        <Badge variant="outline" className="text-sm px-3 py-1 bg-green-50 text-green-700 border-green-200">
                            Current Version: v1.1
                        </Badge>
                    </div>
                </div>

                <div className="grid gap-8 lg:grid-cols-3">
                    {/* Main Terms Content */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>1. Introduction</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground space-y-4">
                                <p>
                                    We are **Tionat Nutrition Hub** ("Company," "we," "us," "our"). These Legal Terms constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("you"), and Tionat Nutrition Hub, concerning your access to and use of our services.
                                </p>
                                <p>
                                    We operate the website http://tionat.com (the "Site"), as well as any other related products and services that refer to or link to these Legal Terms (the "Legal Terms") (collectively, the "Services").
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>2. Purchase & Refund Policy</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground space-y-4">
                                <p>
                                    **Orders**: All orders are subject to product availability. If an item is not in stock at the time you place your order, we will notify you and refund you the total amount of your order, using the original method of payment.
                                </p>
                                <p>
                                    **Refund Tracking**: You can track the status of your return request via your User Profile. We aim to process approved returns within 5-7 business days.
                                </p>
                                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-blue-800 text-xs">
                                    <h4 className="font-semibold flex items-center mb-1">
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        Update (Jan 9, 2026)
                                    </h4>
                                    Expanded transparency on refund timelines and pickup scheduling.
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>3. Price Integrity (Price Lock)</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground space-y-4">
                                <p>
                                    We work hard to ensure the accuracy of pricing. However, prices are subject to change without notice.
                                </p>
                                <p>
                                    **Price Lock Guarantee**: The price you see at the moment of checkout initiation is locked for a short duration. However, final verification occurs at payment submission. If a price change is detected before payment capture, the system will alert you and require a cart refresh to ensure fair billing.
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>4. User Responsibilities</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground space-y-4">
                                <p>
                                    You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account or password.
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar: Version History */}
                    <div className="lg:col-span-1">
                        <Card className="sticky top-24">
                            <CardHeader>
                                <CardTitle className="font-headline flex items-center gap-2">
                                    <Clock className="h-5 w-5" />
                                    Version History
                                </CardTitle>
                                <CardDescription>Track changes to our policies.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[400px] pr-4">
                                    <div className="space-y-6 relative border-l border-gray-200 ml-3 pl-6 py-2">
                                        {/* v1.1 */}
                                        <div className="relative">
                                            <div className="absolute -left-[29px] top-1 h-3 w-3 rounded-full bg-blue-500 ring-4 ring-white" />
                                            <div className="mb-1 flex items-center justify-between">
                                                <span className="font-bold text-sm">v1.1</span>
                                                <span className="text-xs text-muted-foreground">Jan 9, 2026</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground font-medium mb-2">Current Version</p>
                                            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                                                <li>Added visual Refund Tracker policy.</li>
                                                <li>Implemented Price Lock verification description.</li>
                                                <li>Updated User Activity recording usage.</li>
                                            </ul>
                                        </div>

                                        {/* v1.0 */}
                                        <div className="relative">
                                            <div className="absolute -left-[29px] top-1 h-3 w-3 rounded-full bg-gray-300 ring-4 ring-white" />
                                            <div className="mb-1 flex items-center justify-between">
                                                <span className="font-bold text-sm text-gray-600">v1.0</span>
                                                <span className="text-xs text-muted-foreground">Dec 1, 2025</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground font-medium mb-2">Initial Release</p>
                                            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                                                <li>Initial terms of service launch.</li>
                                                <li>Basic privacy policy governing data usage.</li>
                                            </ul>
                                        </div>
                                    </div>
                                </ScrollArea>
                                <Separator className="my-4" />
                                <Button className="w-full" asChild>
                                    <Link href="/contact">Contact Legal Team</Link>
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
