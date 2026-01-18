'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, MessageSquare, Send, X, Loader2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/firebase";

type Message = {
    role: 'user' | 'model' | 'system';
    content: { text: string }[];
};

export function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', content: [{ text: "Hi! I'm TioBot 🤖. How can I help you today? \n\nI can check your **Order Status** or find **Products** for you." }] }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    const { user } = useAuth();
    const userName = user?.displayName || user?.email?.split('@')[0] || 'Friend';

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: Message = { role: 'user', content: [{ text: input.trim() }] };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMsg], // Send history
                    context: { userName }
                })
            });

            const data = await response.json();

            if (data.text) {
                setMessages(prev => [...prev, { role: 'model', content: [{ text: data.text }] }]);
            } else {
                setMessages(prev => [...prev, { role: 'model', content: [{ text: "Sorry, I encountered an error. Please try again." }] }]);
            }

        } catch (error) {
            console.error("Chat Error", error);
            setMessages(prev => [...prev, { role: 'model', content: [{ text: "Network error. Please check your connection." }] }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <Card className="w-[350px] h-[500px] mb-4 shadow-xl border-green-600/20 flex flex-col animate-in slide-in-from-bottom-10 fade-in duration-300">
                    <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-primary-foreground p-4 rounded-t-lg flex flex-row justify-between items-center space-y-0">
                        <div className="flex items-center gap-2">
                            <div className="bg-white/20 p-1.5 rounded-full">
                                <Bot className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-base">TioBot Support</CardTitle>
                                <p className="text-xs opacity-90">Always here to help</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-8 w-8" onClick={() => setIsOpen(false)}>
                            <X className="h-5 w-5" />
                        </Button>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 overflow-hidden bg-slate-50 relative">
                        <ScrollArea className="h-full p-4">
                            <div className="space-y-4">
                                {messages.map((msg, i) => (
                                    <div key={i} className={cn("flex w-full", msg.role === 'user' ? "justify-end" : "justify-start")}>
                                        <div className={cn(
                                            "max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                                            msg.role === 'user'
                                                ? "bg-green-600 text-white rounded-tr-none"
                                                : "bg-white text-slate-800 border border-slate-200 rounded-tl-none"
                                        )}>
                                            {/* Simple formatting for bold text */}
                                            {msg.content[0].text.split('\n').map((line, j) => (
                                                <p key={j} className="min-h-[1.2em]">
                                                    {line.split('**').map((part, k) =>
                                                        k % 2 === 1 ? <strong key={k}>{part}</strong> : part
                                                    )}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex justify-start w-full">
                                        <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                                            <span className="text-xs text-muted-foreground">Thinking...</span>
                                        </div>
                                    </div>
                                )}
                                <div ref={scrollRef} />
                            </div>
                        </ScrollArea>
                    </CardContent>
                    <CardFooter className="p-3 bg-white border-t">
                        <form
                            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                            className="flex w-full gap-2"
                        >
                            <Input
                                placeholder="Type a message..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                className="flex-1 focus-visible:ring-green-500"
                            />
                            <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="bg-green-600 hover:bg-green-700">
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>
                    </CardFooter>
                </Card>
            )}

            {/* Float Button */}
            {!isOpen && (
                <Button
                    size="lg"
                    className="h-14 w-14 rounded-full shadow-lg bg-green-600 hover:bg-green-700 animate-in zoom-in duration-300"
                    onClick={() => setIsOpen(true)}
                >
                    <MessageSquare className="h-6 w-6 text-white" />
                </Button>
            )}
        </div>
    );
}
