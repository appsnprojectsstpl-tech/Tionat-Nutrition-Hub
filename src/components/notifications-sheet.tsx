'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck, Info, Package, Tag } from "lucide-react";
import { useNotifications, Notification } from "@/hooks/use-notifications";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from 'date-fns';
import { cn } from "@/lib/utils";

export function NotificationsSheet() {
    const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications();

    const getIcon = (type: Notification['type']) => {
        switch (type) {
            case 'order': return <Package className="h-5 w-5 text-blue-500" />;
            case 'promo': return <Tag className="h-5 w-5 text-purple-500" />;
            default: return <Info className="h-5 w-5 text-gray-500" />;
        }
    }

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-6 w-6" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-background animate-pulse" />
                    )}
                </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md flex flex-col">
                <SheetHeader className="space-y-4 pb-4 border-b">
                    <div className="flex items-center justify-between">
                        <SheetTitle className="font-headline text-xl">Notifications</SheetTitle>
                        {unreadCount > 0 && (
                            <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs">
                                Mark all read
                            </Button>
                        )}
                    </div>
                </SheetHeader>

                <ScrollArea className="flex-1 -mx-6 px-6">
                    <div className="flex flex-col gap-1 py-4">
                        {notifications.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground">
                                <Bell className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                <p>No new notifications</p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    onClick={() => markAsRead(notification.id)}
                                    className={cn(
                                        "flex items-start gap-4 p-4 rounded-xl transition-colors cursor-pointer",
                                        notification.isRead ? "bg-background hover:bg-secondary/30" : "bg-secondary/20 hover:bg-secondary/40"
                                    )}
                                >
                                    <div className={cn("p-2 rounded-full shrink-0", notification.isRead ? "bg-secondary" : "bg-white shadow-sm")}>
                                        {getIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className={cn("text-sm font-semibold", !notification.isRead && "text-primary")}>
                                                {notification.title}
                                            </h4>
                                            <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                                                {notification.createdAt ? formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground leading-snug">
                                            {notification.body}
                                        </p>
                                    </div>
                                    {!notification.isRead && (
                                        <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
