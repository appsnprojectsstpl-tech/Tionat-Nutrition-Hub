
'use client'
import Link from "next/link"
import {
    Home,
    LayoutDashboard,
    Package,
    ShoppingBag,
    Users,
    Shield,
    Gem,
    Database,
    Upload,
    TicketPercent,
    Store,
    Boxes,
    Image,
    Megaphone,
    ClipboardList,
    ArrowRightLeft,
    ScanBarcode,
    FileText,
} from "lucide-react"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider,
} from "@/components/ui/tooltip"

import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Menu as MenuIcon, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"

const adminNavLinks = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/admin/inventory", icon: Boxes, label: "Inventory" },
    { href: "/admin/products", icon: Package, label: "Products" },
    { href: "/admin/orders", icon: ShoppingBag, label: "Orders" },
    { href: "/admin/finance", icon: FileText, label: "Finance" },
    { href: "/admin/users", icon: Users, label: "Users" },

    { href: "/admin/marketing", icon: Megaphone, label: "Marketing" },
    { href: "/admin/warehouses", icon: Store, label: "Warehouses" },
    { href: "/admin/audit-logs", icon: ShieldAlert, label: "Audit Logs" },
    { href: "/admin/settings", icon: Shield, label: "Settings" }, // Maintenance & System Config
    { href: "/admin/seed", icon: Database, label: "Seed Data" },
]

import { useUser } from "@/firebase";

export function AdminSidebar() {
    const pathname = usePathname();
    const isMobile = useIsMobile();
    const { userProfile } = useUser();

    // Define restricted links for Warehouse Admin
    // They can only see: Dashboard, Products, Orders
    // We can filter the main list.
    const allowedForWarehouse = ['Dashboard', 'Inventory', 'Products', 'Orders', 'Purchase Orders', 'Transfers', 'Home'];

    const filteredNavLinks = adminNavLinks.filter(link => {
        if (userProfile?.role === 'warehouse_admin') {
            return allowedForWarehouse.includes(link.label);
        }
        if (userProfile?.role !== 'superadmin') {
            // Hide Super Admin only links from regular Admin
            if (['Warehouses', 'Audit Logs', 'Settings', 'Seed Data'].includes(link.label)) return false;
        }
        return true; // Superadmin sees all
    });

    const filteredMobileLinks = [
        { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
        { href: "/admin/inventory", icon: Boxes, label: "Inventory" },
        { href: "/admin/orders", icon: ShoppingBag, label: "Orders" },
        { href: "/admin/coupons", icon: TicketPercent, label: "Coupons" },
        { href: "/admin/users", icon: Users, label: "Customers" },
        { href: "/", icon: Home, label: "Home" },
    ].filter(link => {
        if (userProfile?.role === 'warehouse_admin') {
            return allowedForWarehouse.includes(link.label);
        }
        return true;
    });

    if (isMobile) {
        return (
            <div className="fixed top-0 left-0 z-50 w-full h-14 bg-background border-b flex items-center px-4 justify-between">
                <div className="flex items-center gap-3">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="md:hidden">
                                <MenuIcon className="h-5 w-5" />
                                <span className="sr-only">Toggle Menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[80vw] sm:w-[350px] p-0">
                            <div className="p-6">
                                <SheetTitle className="mb-6 font-bold font-headline tracking-tight">Admin Console</SheetTitle>
                                <nav className="flex flex-col space-y-2">
                                    {filteredMobileLinks.map(link => {
                                        const isActive = pathname === link.href;
                                        return (
                                            <Link
                                                key={link.label}
                                                href={link.href}
                                                className={cn(
                                                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                                                    isActive
                                                        ? "bg-primary/10 text-primary font-bold"
                                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                                )}
                                            >
                                                <link.icon className="h-5 w-5" />
                                                <span className="text-sm">{link.label}</span>
                                            </Link>
                                        )
                                    })}
                                </nav>
                            </div>
                        </SheetContent>
                    </Sheet>
                    <span className="font-bold sm:hidden">Admin</span>
                </div>
            </div>
        )
    }

    return (
        <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
            <TooltipProvider>
                <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">

                    {filteredNavLinks.map(link => {
                        const isActive = pathname === link.href;
                        return (
                            <Tooltip key={link.label}>
                                <TooltipTrigger asChild>
                                    <Link
                                        href={link.href}
                                        className={cn(
                                            "flex h-9 w-9 items-center justify-center rounded-lg transition-colors md:h-8 md:w-8",
                                            isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <link.icon className="h-5 w-5" />
                                        <span className="sr-only">{link.label}</span>
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent side="right">{link.label}</TooltipContent>
                            </Tooltip>
                        )
                    })}
                </nav>
            </TooltipProvider>
        </aside>
    )
}
