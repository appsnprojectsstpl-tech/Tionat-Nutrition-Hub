import { chatFlow } from '@/ai/chat';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { messages, context } = body;

        // Ensure messages are in the format expected by Genkit
        // Simple mapping if needed, but client should send { role, content: [{ text }] }

        const responseText = await chatFlow({ messages, context });

        return NextResponse.json({ text: responseText });
    } catch (error: any) {
        console.error("Chat API Error Detailed:", error.message, error.stack);
        return NextResponse.json({ error: error.message || "Failed to generate response" }, { status: 500 });
    }
}
