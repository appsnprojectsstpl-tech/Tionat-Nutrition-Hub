'use client';

import { useState } from 'react';
import { MessageCircle, X, Search, Mail, Phone, ExternalLink, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const FAQ_DATA = [
    { q: "Where is my order?", a: " You can track your order status in real-time from the 'Orders' tab in your Profile." },
    { q: "How do I return an item?", a: "Go to your Order Details, and if the order is delivered within 48 hours, you will see a 'Return Items' button." },
    { q: "What payment methods do you accept?", a: "We accept UPI, Credit/Debit Cards, Net Banking, and Wallet payments." },
    { q: "Do you deliver to my location?", a: "We currently serve select areas in Bangalore. Check availability by entering your pincode at the top of the app." },
    { q: "My item arrived damaged.", a: "We're sorry! Please use the 'Return' option on the order details page or contact us immediately via WhatsApp." },
    { q: "How do I cancel my order?", a: "You can cancel your order within 30 minutes of placing it from the Order Details page, provided it hasn't been shipped." },
];

export function SupportWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const filteredFAQs = FAQ_DATA.filter(faq =>
        faq.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
        faq.a.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleWhatsApp = () => {
        window.open('https://wa.me/919876543210', '_blank'); // Replace with real number
    };

    const handleEmail = () => {
        window.location.href = 'mailto:support@tionat.com';
    };

    return (
        <div className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-50 flex flex-col items-end gap-4">
            {isOpen && (
                <Card className="w-[320px] md:w-[380px] h-[500px] shadow-2xl border-primary/20 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in">
                    {/* Header */}
                    <div className="bg-primary text-primary-foreground p-4 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-lg">Help & Support</h3>
                            <p className="text-xs opacity-90">We're here to help you</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="hover:bg-primary-foreground/20 text-primary-foreground">
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Search */}
                    <div className="p-4 border-b">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search our FAQ..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Content */}
                    <ScrollArea className="flex-1 p-4">
                        {searchTerm ? (
                            <div className="space-y-4">
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Search Results</h4>
                                {filteredFAQs.length > 0 ? (
                                    filteredFAQs.map((faq, i) => (
                                        <div key={i} className="bg-muted/30 rounded-lg p-3 text-sm">
                                            <p className="font-medium text-foreground mb-1">{faq.q}</p>
                                            <p className="text-muted-foreground">{faq.a}</p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-center py-4 text-muted-foreground">No results found.</p>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Common Questions</h4>
                                    <div className="space-y-1">
                                        {FAQ_DATA.slice(0, 3).map((faq, i) => (
                                            <details key={i} className="group text-sm border-b py-2 cursor-pointer">
                                                <summary className="font-medium flex items-center justify-between list-none group-open:text-primary transition-colors">
                                                    {faq.q}
                                                    <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                                                </summary>
                                                <p className="mt-2 text-muted-foreground pl-2 border-l-2 border-primary/20">{faq.a}</p>
                                            </details>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-secondary/30 rounded-xl p-4 text-center space-y-3">
                                    <p className="text-sm font-medium">Still need help?</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button variant="outline" className="w-full text-green-600 border-green-200 hover:bg-green-50" onClick={handleWhatsApp}>
                                            <div className="flex flex-col items-center gap-1 py-1">
                                                <MessageCircle className="h-5 w-5" />
                                                <span className="text-xs">WhatsApp</span>
                                            </div>
                                        </Button>
                                        <Button variant="outline" className="w-full text-blue-600 border-blue-200 hover:bg-blue-50" onClick={handleEmail}>
                                            <div className="flex flex-col items-center gap-1 py-1">
                                                <Mail className="h-5 w-5" />
                                                <span className="text-xs">Email</span>
                                            </div>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </ScrollArea>

                    {/* Footer */}
                    <div className="p-3 bg-muted/20 border-t text-center text-[10px] text-muted-foreground">
                        Tionat Support &bull; typically replies in 15m
                    </div>
                </Card>
            )}

            {!isOpen && (
                <Button
                    size="icon"
                    className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
                    onClick={() => setIsOpen(true)}
                >
                    <MessageCircle className="h-7 w-7" />
                </Button>
            )}
        </div>
    );
}
