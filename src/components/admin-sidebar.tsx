
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
} from "lucide-react"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider,
} from "@/components/ui/tooltip"

import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"

const adminNavLinks = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/admin/products", icon: Package, label: "Products" },
    { href: "/admin/orders", icon: ShoppingBag, label: "Orders" },
    { href: "/admin/users", icon: Users, label: "Users" },
    { href: "/admin/import", icon: Upload, label: "Bulk Import" },
    { href: "/admin/loyalty", icon: Gem, label: "Loyalty" },
    { href: "/admin/coupons", icon: TicketPercent, label: "Coupons" },
    { href: "/admin/seed", icon: Database, label: "Seed Data" },
]

export function AdminSidebar() {
    const pathname = usePathname();
    const isMobile = useIsMobile();

    const mobileLinks = [
        { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
        { href: "/admin/products", icon: Package, label: "Products" },
        { href: "/admin/orders", icon: ShoppingBag, label: "Orders" },
        { href: "/admin/coupons", icon: TicketPercent, label: "Coupons" },
        { href: "/admin/users", icon: Users, label: "Customers" },
        { href: "/", icon: Home, label: "Home" },
    ]

    if (isMobile) {
        return (
            <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background border-t">
                <div className="grid h-full max-w-lg grid-cols-5 mx-auto font-medium">
                    {mobileLinks.map(link => {
                        const isActive = pathname === link.href;
                        return (
                            <Link
                                key={link.label}
                                href={link.href}
                                className={cn(
                                    "inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 dark:hover:bg-gray-800 group",
                                    isActive ? "text-primary" : "text-muted-foreground"
                                )}>
                                <link.icon className="w-5 h-5 mb-1" />
                                <span className="text-xs">{link.label}</span>
                            </Link>
                        )
                    })}
                </div>
            </div>
        )
    }

    return (
        <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
            <TooltipProvider>
                <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">

                    {adminNavLinks.map(link => {
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
