'use client';

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, MapPin, Send } from "lucide-react";
import { useState } from "react";

export default function ContactPage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // In a real app, send to backend
        console.log('Contact form submitted:', formData);
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 3000);
    };

    return (
        <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
            <main className="max-w-4xl mx-auto">
                <Link href="/profile" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-6">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Profile
                </Link>

                <h1 className="text-3xl font-bold font-headline mb-8">Contact Us</h1>

                <div className="grid md:grid-cols-2 gap-6">
                    <Card className="p-6">
                        <h2 className="text-xl font-semibold mb-4">Get in Touch</h2>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <Mail className="h-5 w-5 text-primary mt-1" />
                                <div>
                                    <p className="font-medium">Email</p>
                                    <a href="mailto:support@tionat.com" className="text-muted-foreground hover:text-primary">
                                        support@tionat.com
                                    </a>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Phone className="h-5 w-5 text-primary mt-1" />
                                <div>
                                    <p className="font-medium">Phone</p>
                                    <a href="tel:+911234567890" className="text-muted-foreground hover:text-primary">
                                        +91 123 456 7890
                                    </a>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <MapPin className="h-5 w-5 text-primary mt-1" />
                                <div>
                                    <p className="font-medium">Address</p>
                                    <p className="text-muted-foreground">
                                        Tionat Nutrition Hub<br />
                                        123 Health Street<br />
                                        Mumbai, India 400001
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h2 className="text-xl font-semibold mb-4">Send us a Message</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Input
                                    placeholder="Your Name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <Input
                                    type="email"
                                    placeholder="Your Email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <Input
                                    placeholder="Subject"
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <Textarea
                                    placeholder="Your Message"
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    rows={4}
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={submitted}>
                                {submitted ? (
                                    "Message Sent!"
                                ) : (
                                    <>
                                        <Send className="h-4 w-4 mr-2" />
                                        Send Message
                                    </>
                                )}
                            </Button>
                        </form>
                    </Card>
                </div>
            </main>
        </div>
    );
}
