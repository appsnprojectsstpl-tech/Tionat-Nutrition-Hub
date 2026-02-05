'use client';

import Link from "next/link";
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from "lucide-react";

export function Footer() {
    return (
        <footer className="bg-secondary/30 border-t border-border mt-auto">
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="space-y-4">
                        <h3 className="text-2xl font-headline font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-600">
                            TIONAT
                        </h3>
                        <p className="text-sm text-muted-foreground max-w-xs">
                            Your premium destination for nutrition and wellness. Delivering health focused products directly to your doorstep.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="font-bold mb-4 text-foreground">Shop</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/categories" className="hover:text-primary transition-colors">All Categories</Link></li>
                            <li><Link href="/offers" className="hover:text-primary transition-colors">Special Offers</Link></li>
                            <li><Link href="/search?q=new" className="hover:text-primary transition-colors">New Arrivals</Link></li>
                            <li><Link href="/search?q=bestsellers" className="hover:text-primary transition-colors">Best Sellers</Link></li>
                        </ul>
                    </div>

                    {/* Support */}
                    <div>
                        <h4 className="font-bold mb-4 text-foreground">Support</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/profile" className="hover:text-primary transition-colors">My Order</Link></li>
                            <li><Link href="/profile/help" className="hover:text-primary transition-colors">Help & FAQ</Link></li>
                            <li><Link href="/profile/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
                            <li><Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="font-bold mb-4 text-foreground">Contact</h4>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            <li className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-primary" />
                                <span>+91 98765 43210</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-primary" />
                                <span>support@tionat.com</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-primary mt-0.5" />
                                <span>Hitech City, Hyderabad,<br />Telangana 500081</span>
                            </li>
                        </ul>
                        <div className="flex gap-4 mt-6">
                            <Link href="#" className="p-2 bg-background rounded-full hover:bg-primary hover:text-white transition-all shadow-sm">
                                <Instagram className="h-4 w-4" />
                            </Link>
                            <Link href="#" className="p-2 bg-background rounded-full hover:bg-primary hover:text-white transition-all shadow-sm">
                                <Facebook className="h-4 w-4" />
                            </Link>
                            <Link href="#" className="p-2 bg-background rounded-full hover:bg-primary hover:text-white transition-all shadow-sm">
                                <Twitter className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="border-t border-border/50 mt-12 pt-8 text-center text-xs text-muted-foreground">
                    <p>&copy; {new Date().getFullYear()} Tionat Nutrition Hub. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
