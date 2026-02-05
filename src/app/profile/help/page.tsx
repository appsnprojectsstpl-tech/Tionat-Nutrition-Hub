'use client';

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft, HelpCircle, MessageCircle, Phone, Mail } from "lucide-react";

export default function HelpPage() {
    return (
        <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
            <main className="max-w-4xl mx-auto">
                <Link href="/profile" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-6">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Profile
                </Link>

                <h1 className="text-3xl font-bold font-headline mb-8">Help & FAQ</h1>

                <div className="grid gap-6">
                    <Card className="p-6">
                        <div className="flex items-start gap-4">
                            <HelpCircle className="h-6 w-6 text-primary mt-1" />
                            <div>
                                <h2 className="text-xl font-semibold mb-2">Frequently Asked Questions</h2>
                                <div className="space-y-4 text-muted-foreground">
                                    <div>
                                        <h3 className="font-medium text-foreground mb-1">How do I track my order?</h3>
                                        <p>Go to your profile and click on "Order History" to see all your orders and their current status.</p>
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-foreground mb-1">What is the return policy?</h3>
                                        <p>We accept returns within 7 days of delivery. Items must be unopened and in original packaging.</p>
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-foreground mb-1">How long does delivery take?</h3>
                                        <p>We offer 10-minute delivery for most locations. Delivery time may vary based on your area.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-start gap-4">
                            <MessageCircle className="h-6 w-6 text-primary mt-1" />
                            <div className="flex-1">
                                <h2 className="text-xl font-semibold mb-4">Need More Help?</h2>
                                <div className="grid gap-3">
                                    <Link href="/profile/contact">
                                        <Button className="w-full justify-start" variant="outline">
                                            <Mail className="h-4 w-4 mr-2" />
                                            Contact Support
                                        </Button>
                                    </Link>
                                    <Button className="w-full justify-start" variant="outline" asChild>
                                        <a href="tel:+911234567890">
                                            <Phone className="h-4 w-4 mr-2" />
                                            Call Us: +91 123 456 7890
                                        </a>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </main>
        </div>
    );
}
