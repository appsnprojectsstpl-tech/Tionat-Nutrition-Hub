import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin (safe for server)
const initFirebaseAdmin = () => {
    try {
        if (getApps().length === 0) {
            initializeApp();
        }
        return getFirestore();
    } catch (e) {
        console.warn("Firebase Admin failed to init (likely build time):", e);
        return null;
    }
}

const db = initFirebaseAdmin();

export const ai = genkit({
    plugins: [googleAI()],
    model: 'googleai/gemini-1.5-flash',
});

// Tool: Lookup Order
export const lookupOrder = ai.defineTool(
    {
        name: 'lookupOrder',
        description: 'Looks up an order status by its Order ID (e.g., ORD-12345). Returns status, total, and items.',
        inputSchema: z.object({
            orderId: z.string().describe('The Order ID provided by the user'),
        }),
        outputSchema: z.object({
            found: z.boolean(),
            status: z.string().optional(),
            total: z.number().optional(),
            items: z.array(z.string()).optional(),
            trackingStep: z.string().optional(),
        }),
    },
    async ({ orderId }) => {
        // Try to find the order in the 'orders' root collection (since we replicate there)
        // Or we might need to search across user subcollections if root is disjoint.
        // For now, assume root 'orders' collection availability or index.
        // If strict security, we might need a collection group query or specific user lookups.
        // Let's try root 'orders' as per previous context (rootOrderRef).

        try {
            if (!db) throw new Error("Database not initialized");
            const docRef = db.collection('orders').doc(orderId);
            const docSnap = await docRef.get();

            if (!docSnap.exists) {
                // Try searching by invoice number if strict ID fails
                const q = db.collection('orders').where('invoiceNumber', '==', orderId).limit(1);
                const querySnap = await q.get();
                if (querySnap.empty) {
                    return { found: false };
                }
                const order = querySnap.docs[0].data();
                return {
                    found: true,
                    status: order.status,
                    total: order.totalAmount,
                    items: order.orderItems?.map((i: any) => `${i.quantity}x ${i.name}`) || [],
                    trackingStep: order.status === 'Pending' ? 'Processing' : order.status
                }
            }

            const order = docSnap.data();
            if (!order) return { found: false };

            return {
                found: true,
                status: order.status,
                total: order.totalAmount,
                items: order.orderItems?.map((i: any) => `${i.quantity}x ${i.name}`) || [],
                trackingStep: order.status === 'Pending' ? 'Processing' : order.status
            };
        } catch (e) {
            console.error("Order Lookup Error", e);
            return { found: false };
        }
    }
);

// Tool: Search Products
export const searchProducts = ai.defineTool(
    {
        name: 'searchProducts',
        description: 'Searches for products in the catalog based on keywords (e.g., "protein", "bars").',
        inputSchema: z.object({
            query: z.string().describe('Search keywords'),
        }),
        outputSchema: z.object({
            products: z.array(z.object({
                name: z.string(),
                price: z.number(),
                stock: z.number(),
                id: z.string()
            }))
        }),
    },
    async ({ query }) => {
        // Simple startsWith or basic filtering. Firestore doesn't support full-text native easily without extensions.
        // We will fetch a subset (products limit 20) and filter in memory for this demo, 
        // or use a specific field index if available.
        // For a "Real" chatbot, we'd use Typesense/Algolia. 
        // Here: Fetch products and filter.

        if (!db) return { products: [] };
        const snap = await db.collection('products').limit(50).get();
        const all = snap.docs.map(d => ({ ...d.data(), id: d.id } as any));

        const lowerQ = query.toLowerCase();
        const matches = all.filter(p => p.name.toLowerCase().includes(lowerQ) || p.description?.toLowerCase().includes(lowerQ));

        return {
            products: matches.slice(0, 3).map(p => ({
                name: p.name,
                price: p.price,
                stock: p.stock,
                id: p.id
            }))
        };
    }
);

// Tool: Check Return Eligibility
export const checkReturnEligibility = ai.defineTool(
    {
        name: 'checkReturnEligibility',
        description: 'Checks if an order is eligible for return (delivered < 48 hours ago).',
        inputSchema: z.object({ orderId: z.string() }),
        outputSchema: z.object({ eligible: z.boolean(), reason: z.string().optional(), status: z.string().optional() }),
    },
    async ({ orderId }) => {
        try {
            const docRef = db.collection('orders').doc(orderId);
            const docSnap = await docRef.get();

            if (!docSnap.exists) {
                return { eligible: false, reason: "Order not found" };
            }

            const data = docSnap.data();
            if (data?.status !== 'Delivered') {
                return { eligible: false, reason: `Order status is ${data?.status}, must be Delivered.` };
            }

            if (data?.returnStatus === 'Requested' || data?.returnStatus === 'Approved') {
                return { eligible: false, reason: "Return already requested." };
            }

            return { eligible: true };
        } catch (e) {
            return { eligible: false, reason: "Error checking status" };
        }
    }
);

// Main Chat Flow
export const chatFlow = ai.defineFlow(
    {
        name: 'chatFlow',
        inputSchema: z.object({
            messages: z.array(z.object({
                role: z.enum(['user', 'model', 'system']),
                content: z.array(z.object({ text: z.string() }))
            })),
            context: z.object({
                userName: z.string().optional()
            }).optional()
        }),
        outputSchema: z.string(),
    },
    async ({ messages, context }) => {
        const userName = context?.userName || 'Friend';

        // Generate response using Gemini with tools
        const llmResponse = await ai.generate({
            prompt: messages, // Genkit usually handles the history format if compatible, or we map it.
            tools: [lookupOrder, searchProducts, checkReturnEligibility],
            config: {
                temperature: 0.3, // keep it factual
            },
            system: `You are TioBot, a helpful support assistant for Tionat Nutrition Hub. 
      - You are talking to ${userName}. Address them by name occasionally.
      - Your goal is to help customers with orders, products, and general queries.
      - Be polite, concise, and use emojis occasionally.
      - If searching for an order, ask for the Order ID if not provided.
      - If searching for products, recommend the top matches.
      - If user asks to Return an order, use 'checkReturnEligibility'. If eligible, tell them to go to "Profile -> Order Details" to click the "Return Items" button.
      - Do not hallucinate data. If you don't know, say so.
      - Current Date: ${new Date().toDateString()}`
        });

        return llmResponse.text;
    }
);
