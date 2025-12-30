"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onOrderUpdate = exports.adjustInventory = exports.updateOrderStatus = exports.createOrder = exports.verifyRazorpayPayment = void 0;
const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const crypto = require("crypto");
admin.initializeApp();
const db = admin.firestore();
exports.verifyRazorpayPayment = functions.https.onCall(async (data, context) => {
    var _a, _b;
    // 1. Authentication Check
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    const { orderId, paymentId, signature } = data;
    if (!orderId || !paymentId || !signature) {
        throw new functions.https.HttpsError("invalid-argument", "Missing required payment details.");
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
        if ((orderData === null || orderData === void 0 ? void 0 : orderData.status) === "Paid" || ((_a = orderData === null || orderData === void 0 ? void 0 : orderData.payment) === null || _a === void 0 ? void 0 : _a.status) === "SUCCESS") {
            return { success: true, message: "Order already processed." };
        }
        // 4. Verify Signature
        // In production, use functions.config().razorpay.key_secret
        const secret = process.env.RAZORPAY_KEY_SECRET || "YOUR_TEST_SECRET";
        const generatedSignature = crypto
            .createHmac("sha256", secret)
            .update(((_b = orderData === null || orderData === void 0 ? void 0 : orderData.payment) === null || _b === void 0 ? void 0 : _b.gatewayOrderId) + "|" + paymentId)
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
            var _a;
            const freshOrderSnap = await transaction.get(orderRef);
            if (!freshOrderSnap.exists)
                throw new Error("Order missing during transaction.");
            const currentOrderData = freshOrderSnap.data();
            if ((currentOrderData === null || currentOrderData === void 0 ? void 0 : currentOrderData.status) === "Paid")
                return; // Idempotency check inside transaction
            const items = (currentOrderData === null || currentOrderData === void 0 ? void 0 : currentOrderData.items) || [];
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
                const currentStock = ((_a = invSnap.data()) === null || _a === void 0 ? void 0 : _a.stock) || 0;
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
    }
    catch (error) {
        // If stock error, we might want to catch it specifically?
        // For now, simple fail.
        console.error("Payment Verification Failed:", error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});
exports.createOrder = functions.https.onCall(async (data, context) => {
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
            const price = (productData === null || productData === void 0 ? void 0 : productData.price) || 0;
            // Phase 3: Check Stock here (skipping for now as per Phase 1 scope, strictly strict ordering)
            calculatedTotal += price * item.quantity;
            validatedItems.push({
                productId: item.productId,
                name: productData === null || productData === void 0 ? void 0 : productData.name,
                priceAtBooking: price,
                quantity: item.quantity,
                variantId: item.variantId || 'default'
            });
        }
        // 2. Create Firestore Order (State: CREATED)
        const orderRef = db.collection('orders').doc();
        const orderId = orderRef.id;
        const orderPayload = {
            id: orderId,
            userId,
            financials: {
                subtotal: calculatedTotal,
                tax: 0,
                deliveryFee: 0,
                totalAmount: calculatedTotal,
                currency: "INR"
            },
            items: validatedItems,
            status: "Created",
            payment: {
                method: paymentMethod,
                status: "PENDING",
                signatureVerified: false,
                gatewayOrderId: null
            },
            logistics: {
                addressSnapshot: shippingAddress
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
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
                amount: calculatedTotal * 100,
                currency: "INR",
                receipt: orderId,
                notes: { userId }
            });
            gatewayOrderId = rzpOrder.id;
            // Update payload with gateway ID
            orderPayload.payment = Object.assign(Object.assign({}, orderPayload.payment), { gatewayOrderId });
        }
        await orderRef.set(orderPayload);
        return {
            success: true,
            orderId,
            totalAmount: calculatedTotal,
            gatewayOrderId,
            currency: "INR"
        };
    }
    catch (error) {
        console.error("Create Order Failed:", error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError("internal", error.message || "An internal error occurred.");
    }
});
exports.updateOrderStatus = functions.https.onCall(async (data, context) => {
    var _a;
    // 1. Auth & Role Check
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Authentication required.");
    }
    // Fetch user role (Assuming custom claims or reading from Firestore)
    const db = admin.firestore();
    const userDoc = await db.collection("users").doc(context.auth.uid).get();
    const userRole = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.role;
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
    }
    catch (error) {
        console.error("Update Order Failed:", error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});
exports.adjustInventory = functions.https.onCall(async (data, context) => {
    var _a;
    // 1. Auth & Role Check
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Authentication required.");
    }
    const db = admin.firestore();
    const userDoc = await db.collection("users").doc(context.auth.uid).get();
    const userRole = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.role;
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
            var _a;
            const doc = await t.get(inventoryRef);
            let newStock = 0;
            if (!doc.exists) {
                if (type === 'set')
                    newStock = change;
                else
                    newStock = change; // Default start
                t.set(inventoryRef, { productId, stock: newStock });
            }
            else {
                const currentStock = ((_a = doc.data()) === null || _a === void 0 ? void 0 : _a.stock) || 0;
                if (type === 'set')
                    newStock = change;
                else if (type === 'increment')
                    newStock = currentStock + change;
                else if (type === 'decrement')
                    newStock = currentStock - change;
                if (newStock < 0)
                    throw new functions.https.HttpsError("failed-precondition", "Stock cannot be negative.");
                t.update(inventoryRef, { stock: newStock });
            }
        });
        return { success: true };
    }
    catch (error) {
        console.error("Adjust Inventory Failed:", error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});
exports.onOrderUpdate = functions.firestore
    .document('orders/{orderId}')
    .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const previousData = change.before.data();
    if (!newData || !previousData)
        return;
    if (newData.status === previousData.status)
        return;
    console.log(`Order ${context.params.orderId} status changed to ${newData.status}. Triggering FCM...`);
    // Actual FCM logic would require fetching user token and using admin.messaging()
});
//# sourceMappingURL=index.js.map