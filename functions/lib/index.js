"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onOrderUpdate = exports.adjustInventory = exports.updateOrderStatus = exports.completeCODOrder = exports.createOrder = exports.verifyRazorpayPayment = void 0;
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
            // 2. Update Order in /orders
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
            // 3. Update User's Order Copy
            const userId = currentOrderData === null || currentOrderData === void 0 ? void 0 : currentOrderData.userId;
            if (userId) {
                const userOrderRef = db.collection("users").doc(userId).collection("orders").doc(orderId);
                transaction.update(userOrderRef, {
                    status: "Paid",
                    "payment.status": "SUCCESS",
                    "payment.gatewayPaymentId": paymentId,
                    "payment.signatureVerified": true,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
        });
        return { success: true, orderId };
    }
    catch (error) {
        console.error("[verifyRazorpayPayment] Error:", error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});
exports.createOrder = functions.https.onCall(async (data, context) => {
    var _a, _b, _c;
    // 1. Authentication Check
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in to place an order.");
    }
    const { items, shippingAddress, paymentMethod } = data;
    // 2. Input Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
        throw new functions.https.HttpsError("invalid-argument", "Cart cannot be empty.");
    }
    if (!shippingAddress) {
        throw new functions.https.HttpsError("invalid-argument", "Shipping address is required.");
    }
    const userId = context.auth.uid;
    const db = admin.firestore();
    try {
        console.log(`[createOrder] Starting for User: ${userId}, Method: ${paymentMethod}`);
        // 3. Fetch Products in Parallel (Performance Optimization)
        const productRefs = items.map((item) => db.collection('products').doc(item.productId));
        const productSnaps = await db.getAll(...productRefs);
        let calculatedTotal = 0;
        const validatedItems = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const snap = productSnaps[i];
            if (!snap.exists) {
                console.error(`[createOrder] Product not found: ${item.productId}`);
                throw new functions.https.HttpsError("not-found", `Product "${item.name || item.productId}" is no longer available.`);
            }
            const productData = snap.data();
            const price = productData === null || productData === void 0 ? void 0 : productData.price;
            // Validate Price
            if (typeof price !== 'number') {
                console.error(`[createOrder] Invalid price for product: ${item.productId}`, productData);
                throw new functions.https.HttpsError("data-loss", `Price error for product "${productData === null || productData === void 0 ? void 0 : productData.name}". Please contact support.`);
            }
            calculatedTotal += price * item.quantity;
            validatedItems.push({
                productId: item.productId,
                name: (productData === null || productData === void 0 ? void 0 : productData.name) || item.name,
                priceAtBooking: price,
                quantity: item.quantity,
                variantId: item.variantId || 'default',
                image: (productData === null || productData === void 0 ? void 0 : productData.image) || ((_a = productData === null || productData === void 0 ? void 0 : productData.images) === null || _a === void 0 ? void 0 : _a[0]) || null
            });
        }
        // 4. Calculate Financials
        const settingsSnap = await db.collection('settings').doc('financials').get();
        const settings = settingsSnap.data() || {};
        let taxAmount = 0;
        let deliveryFeeAmount = 0;
        // Delivery Fee Logic
        if ((_b = settings.deliveryFee) === null || _b === void 0 ? void 0 : _b.enabled) {
            deliveryFeeAmount = Number(settings.deliveryFee.amount) || 0;
        }
        // Tax Logic
        if ((_c = settings.tax) === null || _c === void 0 ? void 0 : _c.enabled) {
            const taxRate = Number(settings.tax.rate) || 0;
            taxAmount = Math.round((calculatedTotal * taxRate) / 100);
        }
        const finalTotal = calculatedTotal + taxAmount + deliveryFeeAmount;
        // 5. Razorpay Order Creation (if needed)
        let gatewayOrderId = null;
        if (paymentMethod === 'RAZORPAY') {
            try {
                const Razorpay = require('razorpay');
                const keyId = process.env.RAZORPAY_KEY_ID;
                const keySecret = process.env.RAZORPAY_KEY_SECRET;
                if (!keyId || !keySecret) {
                    console.warn("[createOrder] Missing Razorpay Env Vars. Ensure they are set in functions:config or .env");
                }
                const instance = new Razorpay({
                    key_id: keyId || 'rzp_test_missing_id',
                    key_secret: keySecret || 'rzp_test_missing_secret',
                });
                const rzpOrder = await instance.orders.create({
                    amount: Math.round(finalTotal * 100),
                    currency: "INR",
                    receipt: `order_${Date.now()}_${userId.substring(0, 5)}`,
                    notes: { userId }
                });
                gatewayOrderId = rzpOrder.id;
            }
            catch (rzpError) {
                console.error("[createOrder] Razorpay Error:", rzpError);
                throw new functions.https.HttpsError("unavailable", "Payment gateway initialization failed. Please try COD or try again later.");
            }
        }
        // 6. Create Order Document
        const orderRef = db.collection('orders').doc();
        const orderId = orderRef.id;
        const orderPayload = {
            id: orderId,
            userId,
            status: "Created",
            items: validatedItems,
            financials: {
                subtotal: calculatedTotal,
                tax: taxAmount,
                deliveryFee: deliveryFeeAmount,
                totalAmount: finalTotal,
                currency: "INR"
            },
            payment: {
                method: paymentMethod,
                status: "PENDING",
                gatewayOrderId: gatewayOrderId,
                signatureVerified: false
            },
            logistics: {
                addressSnapshot: shippingAddress
            },
            timeline: [{
                    state: "Created",
                    timestamp: new Date(),
                    actor: "user",
                    metadata: { userId }
                }],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            orderDate: admin.firestore.FieldValue.serverTimestamp(),
        };
        // 7. Write to both /orders and /users/{userId}/orders
        const batch = db.batch();
        batch.set(orderRef, orderPayload);
        const userOrderRef = db.collection('users').doc(userId).collection('orders').doc(orderId);
        batch.set(userOrderRef, orderPayload);
        await batch.commit();
        console.log(`[createOrder] Success. Order ID: ${orderId}`);
        return {
            success: true,
            orderId,
            totalAmount: finalTotal,
            gatewayOrderId,
            currency: "INR"
        };
    }
    catch (error) {
        console.error("[createOrder] Fatal Error:", error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError("internal", error.message || "Something went wrong while placing the order.");
    }
});
exports.completeCODOrder = functions.https.onCall(async (data, context) => {
    var _a, _b;
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
    const { orderId } = data;
    if (!orderId) {
        throw new functions.https.HttpsError("invalid-argument", "Missing orderId.");
    }
    try {
        const orderRef = db.collection("orders").doc(orderId);
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) {
            throw new functions.https.HttpsError("not-found", "Order not found.");
        }
        const orderData = orderSnap.data();
        if (((_b = orderData === null || orderData === void 0 ? void 0 : orderData.payment) === null || _b === void 0 ? void 0 : _b.method) !== 'COD') {
            throw new functions.https.HttpsError("failed-precondition", "This function is only for COD orders.");
        }
        if ((orderData === null || orderData === void 0 ? void 0 : orderData.status) === "Paid") {
            return { success: true, message: "Order already marked as paid." };
        }
        // Update both global and user-specific order
        const batch = db.batch();
        batch.update(orderRef, {
            status: "Paid",
            "payment.status": "SUCCESS",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            timeline: admin.firestore.FieldValue.arrayUnion({
                state: "Paid",
                timestamp: new Date(),
                actor: "admin",
                metadata: { adminId: context.auth.uid, method: "COD" }
            })
        });
        const userId = orderData === null || orderData === void 0 ? void 0 : orderData.userId;
        if (userId) {
            const userOrderRef = db.collection("users").doc(userId).collection("orders").doc(orderId);
            batch.update(userOrderRef, {
                status: "Paid",
                "payment.status": "SUCCESS",
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        await batch.commit();
        return { success: true };
    }
    catch (error) {
        console.error("[completeCODOrder] Error:", error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError("internal", error.message);
    }
});
exports.updateOrderStatus = functions.https.onCall(async (data, context) => {
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
    const { orderId, status } = data;
    if (!orderId || !status) {
        throw new functions.https.HttpsError("invalid-argument", "Missing orderId or status.");
    }
    try {
        const orderRef = db.collection("orders").doc(orderId);
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) {
            throw new functions.https.HttpsError("not-found", "Order not found.");
        }
        const orderData = orderSnap.data();
        const userId = orderData === null || orderData === void 0 ? void 0 : orderData.userId;
        const batch = db.batch();
        batch.update(orderRef, {
            status: status,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            timeline: admin.firestore.FieldValue.arrayUnion({
                state: status,
                timestamp: new Date(),
                actor: "admin",
                metadata: { adminId: context.auth.uid }
            })
        });
        if (userId) {
            const userOrderRef = db.collection("users").doc(userId).collection("orders").doc(orderId);
            batch.update(userOrderRef, {
                status: status,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        await batch.commit();
        return { success: true };
    }
    catch (error) {
        console.error("[updateOrderStatus] Error:", error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
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
    if (!['set', 'increment', 'decrement'].includes(type)) {
        throw new functions.https.HttpsError("invalid-argument", "Type must be 'set', 'increment', or 'decrement'.");
    }
    const inventoryRef = db.collection("inventory").doc(productId);
    try {
        await db.runTransaction(async (t) => {
            var _a;
            const doc = await t.get(inventoryRef);
            let newStock = 0;
            if (!doc.exists) {
                // If inventory doesn't exist, create it
                if (type === 'set') {
                    newStock = change;
                }
                else if (type === 'increment') {
                    newStock = change; // Start from 0 + change
                }
                else {
                    // decrement from 0 would be negative
                    throw new Error("Cannot decrement non-existent inventory.");
                }
                t.set(inventoryRef, { productId, stock: newStock });
            }
            else {
                const currentStock = ((_a = doc.data()) === null || _a === void 0 ? void 0 : _a.stock) || 0;
                if (type === 'set') {
                    newStock = change;
                }
                else if (type === 'increment') {
                    newStock = currentStock + change;
                }
                else if (type === 'decrement') {
                    newStock = currentStock - change;
                }
                if (newStock < 0) {
                    throw new Error("Stock cannot be negative.");
                }
                t.update(inventoryRef, { stock: newStock });
            }
        });
        return { success: true };
    }
    catch (error) {
        console.error("[adjustInventory] Error:", error);
        // Convert transaction errors to HttpsError
        if (error.message.includes("cannot be negative") || error.message.includes("Cannot decrement")) {
            throw new functions.https.HttpsError("failed-precondition", error.message);
        }
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