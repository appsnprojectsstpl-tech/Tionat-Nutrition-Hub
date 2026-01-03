import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

admin.initializeApp();
const db = admin.firestore();



export const verifyRazorpayPayment = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
    // 1. Authentication Check
    if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "The function must be called while authenticated."
        );
    }

    const { orderId, paymentId, signature } = data;

    if (!orderId || !paymentId || !signature) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Missing required payment details."
        );
    }

    try {
        // 2. Fetch Order Snapshot
        const orderRef = db.collection("orders").doc(orderId);
        const orderSnap = await orderRef.get();

        if (!orderSnap.exists) {
            throw new functions.https.HttpsError("not-found", "Order does not exist.");
        }

        const orderData = orderSnap.data();

        // 3. Idempotency Check
        if (orderData?.status === "Paid" || orderData?.payment?.status === "SUCCESS") {
            return { success: true, message: "Order already processed." };
        }

        // 4. Verify Signature
        // In production, use functions.config().razorpay.key_secret
        const secret = process.env.RAZORPAY_KEY_SECRET || "YOUR_TEST_SECRET";
        const generatedSignature = crypto
            .createHmac("sha256", secret)
            .update(orderData?.payment?.gatewayOrderId + "|" + paymentId)
            .digest("hex");

        if (generatedSignature !== signature) {
            // Log attempt
            await orderRef.update({
                "payment.status": "FAILED",
                "payment.failureReason": "Signature Mismatch",
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            throw new functions.https.HttpsError("permission-denied", "Invalid payment signature.");
        }

        // 5. Update Order State & Decrement Inventory (Transaction)
        await db.runTransaction(async (transaction) => {
            const freshOrderSnap = await transaction.get(orderRef);
            if (!freshOrderSnap.exists) throw new Error("Order missing during transaction.");

            const currentOrderData = freshOrderSnap.data();
            if (currentOrderData?.status === "Paid") return; // Idempotency check inside transaction

            const items = currentOrderData?.items || [];

            const inventoryUpdates = [];

            // Check Stock
            for (const item of items) {
                const invRef = db.collection("inventory").doc(item.productId);
                const invSnap = await transaction.get(invRef);

                if (!invSnap.exists) {
                    // Fallback: Check product doc if inventory migration not done? 
                    // Or strictly enforce inventory doc. Let's enforce or assume 0.
                    throw new Error(`Inventory missing for ${item.name} (${item.productId})`);
                }

                const currentStock = invSnap.data()?.stock || 0;
                if (currentStock < item.quantity) {
                    throw new Error(`Insufficient stock for ${item.name}. Available: ${currentStock}, Requested: ${item.quantity}`);
                }

                inventoryUpdates.push({ ref: invRef, newStock: currentStock - item.quantity });
            }

            // If we got here, all stock is available.
            // 1. Decrement Stock
            for (const update of inventoryUpdates) {
                transaction.update(update.ref, { stock: update.newStock });
            }

            // 2. Update Order
            transaction.update(orderRef, {
                status: "Paid",
                "payment.status": "SUCCESS",
                "payment.gatewayPaymentId": paymentId,
                "payment.signatureVerified": true,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                timeline: admin.firestore.FieldValue.arrayUnion({
                    state: "Paid",
                    timestamp: new Date(),
                    actor: "system",
                    metadata: { method: "RAZORPAY", paymentId }
                })
            });
        });

        return { success: true, orderId };

    } catch (error: any) {
        // If stock error, we might want to catch it specifically?
        // For now, simple fail.
        console.error("Payment Verification Failed:", error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});

export const createOrder = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
    }

    const { items, shippingAddress, paymentMethod } = data;
    // Basic validation
    if (!items || items.length === 0) {
        throw new functions.https.HttpsError("invalid-argument", "Cart is empty.");
    }

    const userId = context.auth.uid;
    const db = admin.firestore();

    try {
        // 1. Calculate Total & Validate Prices Server-Side
        let calculatedTotal = 0;
        const validatedItems = [];

        console.log("Processing order for items:", JSON.stringify(items));

        for (const item of items) {
            console.log(`Looking up product: ${item.productId}`);
            const productDoc = await db.collection('products').doc(item.productId).get();
            if (!productDoc.exists) {
                throw new functions.https.HttpsError("not-found", `Product ${item.productId} not found.`);
            }
            const productData = productDoc.data();
            if (!productData || typeof productData.price !== 'number') {
                throw new functions.https.HttpsError("failed-precondition", `Invalid or missing price for product ${item.productId}.`);
            }
            const price = productData.price;

            // Phase 3: Check Stock here (skipping for now as per Phase 1 scope, strictly strict ordering)

            calculatedTotal += price * item.quantity;
            validatedItems.push({
                productId: item.productId,
                name: productData.name, // Source of Truth
                priceAtBooking: price,   // Snapshot
                quantity: item.quantity,
                variantId: item.variantId || 'default'
            });
        }

        // 1b. Fetch Tax & Delivery Settings
        const settingsSnap = await db.collection('settings').doc('financials').get();
        const settings = settingsSnap.exists ? settingsSnap.data() : {};

        let taxAmount = 0;
        let deliveryFeeAmount = 0;

        // Calculate Tax
        if (settings?.tax?.enabled && typeof settings.tax.rate === 'number') {
            // Formula: round((subtotal * rate) / 100, 2)
            const rawTax = (calculatedTotal * settings.tax.rate) / 100;
            taxAmount = Math.round(rawTax * 100) / 100;
        }

        // Calculate Delivery Fee
        if (settings?.deliveryFee?.enabled && typeof settings.deliveryFee.amount === 'number') {
            deliveryFeeAmount = settings.deliveryFee.amount;
        }

        const finalTotal = calculatedTotal + taxAmount + deliveryFeeAmount;

        // 2. Create Firestore Order (State: CREATED)
        const orderRef = db.collection('orders').doc();
        const orderId = orderRef.id;

        const orderPayload = {
            id: orderId,
            userId,
            financials: {
                subtotal: calculatedTotal,
                tax: taxAmount,
                deliveryFee: deliveryFeeAmount,
                totalAmount: finalTotal,
                currency: "INR"
            },
            items: validatedItems,
            status: "Created",
            payment: {
                method: paymentMethod,
                status: "PENDING",
                signatureVerified: false,
                gatewayOrderId: null as string | null
            },
            logistics: {
                addressSnapshot: shippingAddress
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            timeline: [{
                state: "Created",
                timestamp: new Date(),
                actor: "user",
                metadata: { userId }
            }]
        };

        // 3. Create Razorpay Order if method is Razorpay
        let gatewayOrderId = null;
        if (paymentMethod === 'RAZORPAY') {
            const Razorpay = require('razorpay');
            const instance = new Razorpay({
                key_id: process.env.RAZORPAY_KEY_ID || 'TEST_KEY_ID',
                key_secret: process.env.RAZORPAY_KEY_SECRET || 'TEST_KEY_SECRET',
            });

            const rzpOrder = await instance.orders.create({
                amount: Math.round(finalTotal * 100), // smallest currency unit, rounded to ensure integer
                currency: "INR",
                receipt: orderId,
                notes: { userId }
            });
            gatewayOrderId = rzpOrder.id;

            // Update payload with gateway ID
            orderPayload.payment = {
                ...orderPayload.payment,
                gatewayOrderId
            };
        }

        await orderRef.set(orderPayload);

        return {
            success: true,
            orderId,
            totalAmount: finalTotal,
            gatewayOrderId,
            currency: "INR"
        };

    } catch (error: any) {
        console.error("Create Order Failed:", error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError("internal", error.message || "An internal error occurred.");
    }
});

export const updateOrderStatus = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
    // 1. Auth & Role Check
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Authentication required.");
    }

    // Fetch user role (Assuming custom claims or reading from Firestore)
    const db = admin.firestore();
    const userDoc = await db.collection("users").doc(context.auth.uid).get();
    const userRole = userDoc.data()?.role;

    if (userRole !== "admin" && userRole !== "superadmin") {
        throw new functions.https.HttpsError("permission-denied", "Admin access required.");
    }

    const { orderId, status } = data;
    if (!orderId || !status) {
        throw new functions.https.HttpsError("invalid-argument", "Missing orderId or status.");
    }

    const orderRef = db.collection("orders").doc(orderId);

    try {
        await orderRef.update({
            status: status,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            timeline: admin.firestore.FieldValue.arrayUnion({
                state: status,
                timestamp: new Date(),
                actor: "admin",
                metadata: { adminId: context.auth.uid }
            })
        });
        return { success: true };
    } catch (error: any) {
        console.error("Update Order Failed:", error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});

export const adjustInventory = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
    // 1. Auth & Role Check
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Authentication required.");
    }

    const db = admin.firestore();
    const userDoc = await db.collection("users").doc(context.auth.uid).get();
    const userRole = userDoc.data()?.role;

    if (userRole !== "admin" && userRole !== "superadmin") {
        throw new functions.https.HttpsError("permission-denied", "Admin access required.");
    }

    const { productId, change, type } = data; // type: 'set' | 'increment' | 'decrement'

    if (!productId || change === undefined) {
        throw new functions.https.HttpsError("invalid-argument", "Missing productId or change value.");
    }

    // Product ref unused if we trust inventory collection logic below
    // const productRef = db.collection("products").doc(productId);
    // Or inventory collection if separated? Phase 0 analysis showed 'stock' in products mainly, 
    // but types.ts had Inventory type. Let's assume 'products' collection has 'stock' field for now as per widespread pattern.
    // If strict separation is needed, we'd use 'inventory' collection.
    // Let's check types.ts again? 
    // Step 129 showed: export type Inventory = { productId: string; stock: number; }
    // But Step 131 (Admin Dashboard) uses useCollection('products').
    // I'll assume 'inventory' is separate or part of product. 
    // Safest is to check product doc for 'stock' or 'inventory' collection. 
    // Given Phase 3 is "Inventory Integrity", I'll stick to a simple update on 'inventory' collection if it exists, or 'products'.
    // I'll update 'products' collection's stock field for simplicity unless I see 'inventory' usage.
    // Step 227 (firestore.rules) has match /inventory/{productId}. So it IS separate.

    const inventoryRef = db.collection("inventory").doc(productId);

    try {
        await db.runTransaction(async (t) => {
            const doc = await t.get(inventoryRef);
            let newStock = 0;

            if (!doc.exists) {
                if (type === 'set') newStock = change;
                else newStock = change; // Default start
                t.set(inventoryRef, { productId, stock: newStock });
            } else {
                const currentStock = doc.data()?.stock || 0;
                if (type === 'set') newStock = change;
                else if (type === 'increment') newStock = currentStock + change;
                else if (type === 'decrement') newStock = currentStock - change;

                if (newStock < 0) throw new functions.https.HttpsError("failed-precondition", "Stock cannot be negative.");

                t.update(inventoryRef, { stock: newStock });
            }
        });

        return { success: true };
    } catch (error: any) {
        console.error("Adjust Inventory Failed:", error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});

export const onOrderUpdate = functions.firestore
    .document('orders/{orderId}')
    .onUpdate(async (change: functions.Change<functions.firestore.DocumentSnapshot>, context: functions.EventContext) => {
        const newData = change.after.data();
        const previousData = change.before.data();

        if (!newData || !previousData) return;

        if (newData.status === previousData.status) return;

        console.log(`Order ${context.params.orderId} status changed to ${newData.status}. Triggering FCM...`);
        // Actual FCM logic would require fetching user token and using admin.messaging()
    });
