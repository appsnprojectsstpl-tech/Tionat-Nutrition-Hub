"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onOrderUpdate = exports.adjustInventory = exports.updateOrderStatus = exports.completeCODOrder = exports.verifyRazorpayPayment = exports.createOrderHTTP = void 0;
const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const crypto = require("crypto");
const cors = require("cors");
admin.initializeApp();
const db = admin.firestore();
// CORS middleware - allow all origins
const corsHandler = cors({ origin: true });
// HTTP function with CORS for createOrder
exports.createOrderHTTP = functions.https.onRequest((req, res) => {
    return corsHandler(req, res, async () => {
        var _a, _b, _c, _d;
        try {
            // Only allow POST
            if (req.method !== 'POST') {
                res.status(405).json({ error: { code: 'method-not-allowed', message: 'Only POST allowed' } });
                return;
            }
            // Get auth token from header
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                res.status(401).json({ error: { code: 'unauthenticated', message: 'Missing auth token' } });
                return;
            }
            const idToken = authHeader.split('Bearer ')[1];
            let userId;
            try {
                const decodedToken = await admin.auth().verifyIdToken(idToken);
                userId = decodedToken.uid;
            }
            catch (e) {
                console.error('[createOrderHTTP] Auth error:', e);
                res.status(401).json({ error: { code: 'unauthenticated', message: 'Invalid auth token' } });
                return;
            }
            console.log('[createOrderHTTP] Request body:', JSON.stringify(req.body));
            const { items, shippingAddress, paymentMethod } = req.body.data || req.body;
            if (!items || !Array.isArray(items) || items.length === 0) {
                res.status(400).json({ error: { code: 'invalid-argument', message: 'Cart cannot be empty' } });
                return;
            }
            if (!shippingAddress) {
                res.status(400).json({ error: { code: 'invalid-argument', message: 'Shipping address required' } });
                return;
            }
            console.log(`[createOrder] Starting for User: ${userId}, Method: ${paymentMethod}`);
            const productRefs = items.map((item) => db.collection('products').doc(item.productId));
            const productSnaps = await db.getAll(...productRefs);
            // Check Inventory
            const inventoryRefs = items.map((item) => db.collection('inventory').doc(item.productId));
            const inventorySnaps = await db.getAll(...inventoryRefs);
            let calculatedTotal = 0;
            const validatedItems = [];
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const snap = productSnaps[i];
                const invSnap = inventorySnaps[i];
                if (!snap.exists) {
                    console.error(`[createOrder] Product not found: ${item.productId}`);
                    res.status(404).json({ error: { code: 'not-found', message: `Product "${item.name || item.productId}" not available` } });
                    return;
                }
                const productData = snap.data();
                const price = productData === null || productData === void 0 ? void 0 : productData.price;
                if (typeof price !== 'number') {
                    console.error(`[createOrder] Invalid price for product: ${item.productId}`);
                    res.status(500).json({ error: { code: 'data-loss', message: `Price error for product "${productData === null || productData === void 0 ? void 0 : productData.name}"` } });
                    return;
                }
                // Inventory Validation
                if (!invSnap.exists) {
                    console.error(`[createOrder] Inventory missing for product: ${item.productId}`);
                    res.status(500).json({ error: { code: 'internal', message: `Inventory missing for "${(productData === null || productData === void 0 ? void 0 : productData.name) || item.name}"` } });
                    return;
                }
                const stock = ((_a = invSnap.data()) === null || _a === void 0 ? void 0 : _a.stock) || 0;
                if (stock < item.quantity) {
                    res.status(409).json({ error: { code: 'resource-exhausted', message: `Insufficient stock for "${(productData === null || productData === void 0 ? void 0 : productData.name) || item.name}". Available: ${stock}` } });
                    return;
                }
                calculatedTotal += price * item.quantity;
                validatedItems.push({
                    productId: item.productId,
                    name: (productData === null || productData === void 0 ? void 0 : productData.name) || item.name,
                    priceAtBooking: price,
                    quantity: item.quantity,
                    variantId: item.variantId || 'default',
                    image: (productData === null || productData === void 0 ? void 0 : productData.image) || ((_b = productData === null || productData === void 0 ? void 0 : productData.images) === null || _b === void 0 ? void 0 : _b[0]) || null
                });
            }
            const settingsSnap = await db.collection('settings').doc('financials').get();
            const settings = settingsSnap.data() || {};
            let taxAmount = 0;
            let deliveryFeeAmount = 0;
            if ((_c = settings.deliveryFee) === null || _c === void 0 ? void 0 : _c.enabled) {
                deliveryFeeAmount = Number(settings.deliveryFee.amount) || 0;
            }
            if ((_d = settings.tax) === null || _d === void 0 ? void 0 : _d.enabled) {
                const taxRate = Number(settings.tax.rate) || 0;
                taxAmount = Math.round((calculatedTotal * taxRate) / 100);
            }
            const finalTotal = calculatedTotal + taxAmount + deliveryFeeAmount;
            // --- Coupon Handling ---
            const { couponCode } = req.body.data || req.body;
            let discountAmount = 0;
            let couponRef = null;
            if (couponCode) {
                console.log(`[createOrder] Validating coupon: ${couponCode}`);
                const couponQuery = await db.collection('coupons').where('code', '==', couponCode).limit(1).get();
                if (!couponQuery.empty) {
                    const couponSnap = couponQuery.docs[0];
                    const couponData = couponSnap.data();
                    couponRef = couponSnap.ref;
                    // Validate
                    const now = admin.firestore.Timestamp.now();
                    const expiry = couponData.expiryDate; // Timestamp
                    let isValid = true;
                    if (!couponData.isActive)
                        isValid = false;
                    if (expiry && expiry.toMillis() < now.toMillis())
                        isValid = false;
                    if (calculatedTotal < (couponData.minOrderValue || 0))
                        isValid = false;
                    if (couponData.usageLimit && (couponData.usedCount || 0) >= couponData.usageLimit)
                        isValid = false;
                    if (isValid) {
                        if (couponData.discountType === 'PERCENTAGE') {
                            let discount = (calculatedTotal * couponData.discountValue) / 100;
                            if (couponData.maxDiscount)
                                discount = Math.min(discount, couponData.maxDiscount);
                            discountAmount = discount;
                        }
                        else {
                            discountAmount = couponData.discountValue;
                        }
                        // Ensure discount doesn't exceed total
                        if (discountAmount > calculatedTotal)
                            discountAmount = calculatedTotal;
                        console.log(`[createOrder] Coupon applied: ${couponCode}, Discount: ${discountAmount}`);
                    }
                    else {
                        console.warn(`[createOrder] Coupon invalid or conditions not met: ${couponCode}`);
                    }
                }
            }
            const totalWithDiscount = Math.max(0, finalTotal - discountAmount);
            // Skip Razorpay for now - only COD
            let gatewayOrderId = null;
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
                    discountApplied: discountAmount,
                    totalAmount: totalWithDiscount,
                    currency: "INR"
                },
                payment: {
                    method: paymentMethod,
                    status: "PENDING",
                    gatewayOrderId: gatewayOrderId,
                    signatureVerified: false
                },
                couponCode: couponCode || null,
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
            const batch = db.batch();
            batch.set(orderRef, orderPayload);
            // Increment Coupon Usage
            if (couponRef) {
                batch.update(couponRef, { usedCount: admin.firestore.FieldValue.increment(1) });
            }
            const userOrderRef = db.collection('users').doc(userId).collection('orders').doc(orderId);
            batch.set(userOrderRef, orderPayload);
            await batch.commit();
            console.log(`[createOrder] Success. Order ID: ${orderId}`);
            res.status(200).json({
                result: {
                    success: true,
                    orderId,
                    totalAmount: totalWithDiscount,
                    gatewayOrderId,
                    currency: "INR"
                }
            });
        }
        catch (error) {
            console.error("[createOrder] Fatal Error:", error);
            res.status(500).json({ error: { code: 'internal', message: error.message || 'Internal error' } });
        }
    });
});
// Keep other functions as onCall
exports.verifyRazorpayPayment = functions.https.onCall(async (data, context) => {
    var _a, _b;
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }
    const { orderId, paymentId, signature } = data;
    if (!orderId || !paymentId || !signature) {
        throw new functions.https.HttpsError("invalid-argument", "Missing payment details");
    }
    try {
        const orderRef = db.collection("orders").doc(orderId);
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) {
            throw new functions.https.HttpsError("not-found", "Order not found");
        }
        const orderData = orderSnap.data();
        if ((orderData === null || orderData === void 0 ? void 0 : orderData.status) === "Paid" || ((_a = orderData === null || orderData === void 0 ? void 0 : orderData.payment) === null || _a === void 0 ? void 0 : _a.status) === "SUCCESS") {
            return { success: true, message: "Order already processed" };
        }
        const secret = process.env.RAZORPAY_KEY_SECRET || "YOUR_TEST_SECRET";
        const generatedSignature = crypto
            .createHmac("sha256", secret)
            .update(((_b = orderData === null || orderData === void 0 ? void 0 : orderData.payment) === null || _b === void 0 ? void 0 : _b.gatewayOrderId) + "|" + paymentId)
            .digest("hex");
        if (generatedSignature !== signature) {
            await orderRef.update({
                "payment.status": "FAILED",
                "payment.failureReason": "Signature Mismatch",
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            throw new functions.https.HttpsError("permission-denied", "Invalid signature");
        }
        await db.runTransaction(async (transaction) => {
            var _a;
            const freshOrderSnap = await transaction.get(orderRef);
            if (!freshOrderSnap.exists)
                throw new Error("Order missing");
            const currentOrderData = freshOrderSnap.data();
            if ((currentOrderData === null || currentOrderData === void 0 ? void 0 : currentOrderData.status) === "Paid")
                return;
            const items = (currentOrderData === null || currentOrderData === void 0 ? void 0 : currentOrderData.items) || [];
            const inventoryUpdates = [];
            for (const item of items) {
                const invRef = db.collection("inventory").doc(item.productId);
                const invSnap = await transaction.get(invRef);
                if (!invSnap.exists) {
                    throw new Error(`Inventory missing for ${item.name}`);
                }
                const currentStock = ((_a = invSnap.data()) === null || _a === void 0 ? void 0 : _a.stock) || 0;
                if (currentStock < item.quantity) {
                    throw new Error(`Insufficient stock for ${item.name}`);
                }
                inventoryUpdates.push({ ref: invRef, newStock: currentStock - item.quantity });
            }
            for (const update of inventoryUpdates) {
                transaction.update(update.ref, { stock: update.newStock });
            }
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
exports.completeCODOrder = functions.https.onCall(async (data, context) => {
    var _a, _b;
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }
    const userDoc = await db.collection("users").doc(context.auth.uid).get();
    const userRole = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.role;
    if (userRole !== "admin" && userRole !== "superadmin") {
        throw new functions.https.HttpsError("permission-denied", "Admin access required");
    }
    const { orderId } = data;
    if (!orderId) {
        throw new functions.https.HttpsError("invalid-argument", "Missing orderId");
    }
    try {
        const orderRef = db.collection("orders").doc(orderId);
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) {
            throw new functions.https.HttpsError("not-found", "Order not found");
        }
        const orderData = orderSnap.data();
        if (((_b = orderData === null || orderData === void 0 ? void 0 : orderData.payment) === null || _b === void 0 ? void 0 : _b.method) !== 'COD') {
            throw new functions.https.HttpsError("failed-precondition", "Only for COD orders");
        }
        if ((orderData === null || orderData === void 0 ? void 0 : orderData.status) === "Paid") {
            return { success: true, message: "Already paid" };
        }
        await db.runTransaction(async (transaction) => {
            var _a;
            // Re-read order inside transaction for concurrency safety
            const freshOrderSnap = await transaction.get(orderRef);
            if (!freshOrderSnap.exists) {
                throw new functions.https.HttpsError("not-found", "Order not found");
            }
            const currentOrderData = freshOrderSnap.data();
            if ((currentOrderData === null || currentOrderData === void 0 ? void 0 : currentOrderData.status) === "Paid") {
                return; // Already paid, idempotent
            }
            const items = (currentOrderData === null || currentOrderData === void 0 ? void 0 : currentOrderData.items) || [];
            // Check Inventory Availability First (All Reads)
            const inventoryChecks = [];
            for (const item of items) {
                const invRef = db.collection("inventory").doc(item.productId);
                const invSnap = await transaction.get(invRef);
                if (!invSnap.exists) {
                    throw new functions.https.HttpsError("internal", `Inventory missing for ${item.name}`);
                }
                const currentStock = ((_a = invSnap.data()) === null || _a === void 0 ? void 0 : _a.stock) || 0;
                if (currentStock < item.quantity) {
                    throw new functions.https.HttpsError("failed-precondition", `Insufficient stock for ${item.name}`);
                }
                // Store for update phase
                inventoryChecks.push({ ref: invRef, newStock: currentStock - item.quantity });
            }
            // Perform Inventory Updates (All Writes)
            for (const check of inventoryChecks) {
                transaction.update(check.ref, { stock: check.newStock });
            }
            // Update Order
            transaction.update(orderRef, {
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
            const userId = currentOrderData === null || currentOrderData === void 0 ? void 0 : currentOrderData.userId;
            if (userId) {
                const userOrderRef = db.collection("users").doc(userId).collection("orders").doc(orderId);
                transaction.update(userOrderRef, {
                    status: "Paid",
                    "payment.status": "SUCCESS",
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
        });
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
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }
    const userDoc = await db.collection("users").doc(context.auth.uid).get();
    const userRole = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.role;
    if (userRole !== "admin" && userRole !== "superadmin") {
        throw new functions.https.HttpsError("permission-denied", "Admin access required");
    }
    const { orderId, status } = data;
    if (!orderId || !status) {
        throw new functions.https.HttpsError("invalid-argument", "Missing orderId or status");
    }
    try {
        const orderRef = db.collection("orders").doc(orderId);
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) {
            throw new functions.https.HttpsError("not-found", "Order not found");
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
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Authentication required");
    }
    const userDoc = await db.collection("users").doc(context.auth.uid).get();
    const userRole = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.role;
    if (userRole !== "admin" && userRole !== "superadmin") {
        throw new functions.https.HttpsError("permission-denied", "Admin access required");
    }
    const { productId, change, type } = data;
    if (!productId || change === undefined) {
        throw new functions.https.HttpsError("invalid-argument", "Missing productId or change");
    }
    if (!['set', 'increment', 'decrement'].includes(type)) {
        throw new functions.https.HttpsError("invalid-argument", "Invalid type");
    }
    const inventoryRef = db.collection("inventory").doc(productId);
    try {
        await db.runTransaction(async (t) => {
            var _a;
            const doc = await t.get(inventoryRef);
            let newStock = 0;
            if (!doc.exists) {
                if (type === 'set') {
                    newStock = change;
                }
                else if (type === 'increment') {
                    newStock = change;
                }
                else {
                    throw new Error("Cannot decrement non-existent inventory");
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
                    throw new Error("Stock cannot be negative");
                }
                t.update(inventoryRef, { stock: newStock });
            }
        });
        return { success: true };
    }
    catch (error) {
        console.error("[adjustInventory] Error:", error);
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
    console.log(`Order ${context.params.orderId} status changed to ${newData.status}`);
});
//# sourceMappingURL=index.js.map