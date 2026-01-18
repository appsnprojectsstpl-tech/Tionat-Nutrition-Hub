// Actually usually we use hooks. But for a utility function we might need 'getFirestore()' or pass data.
// Let's make it a standalone function that accepts firestore instance OR uses the modular SDK if initialized.

import { collection, addDoc, serverTimestamp, runTransaction, doc, Firestore } from 'firebase/firestore';
import { LedgerEntry } from './types';

// COMMISION_RATE removed - logic is now dynamic

/**
 * Records a Sale Transaction.
 * 1. Credits Warehouse (Order Amount)
 * 2. Debits Warehouse (Platform Commission)
 */
export async function recordSaleTransaction(
    firestore: Firestore,
    warehouseId: string,
    orderId: string,
    totalAmount: number
) {
    if (!warehouseId || warehouseId === 'global') return;

    const ledgerRef = collection(firestore, 'ledger_entries');

    // Dynamic Commission Logic
    // In a real high-throughput system, we'd pass this config in context, 
    // but for transactional integrity, reading it fresh is safer (though slower).
    const configRef = doc(firestore, 'config', 'financials');

    // We rely on the transaction to read this if we want strict consistency, 
    // or read it before. Let's read inside to ensure we respect a sudden rate change.

    const warehouseRef = doc(firestore, 'warehouses', warehouseId);

    try {
        await runTransaction(firestore, async (transaction) => {
            const [whDoc, configDoc] = await Promise.all([
                transaction.get(warehouseRef),
                transaction.get(configRef)
            ]);

            if (!whDoc.exists()) return;

            // Determine Rate
            let rate = 0.10; // Default 10%
            if (configDoc.exists()) {
                const data = configDoc.data();
                if (data.globalCommissionRate !== undefined) {
                    rate = data.globalCommissionRate / 100;
                }
            }

            const commission = totalAmount * rate;
            const currentBalance = whDoc.data().ledgerBalance || 0;
            const netSale = totalAmount - commission;
            const newBalance = currentBalance + netSale;

            // 1. Credit Entry (Sale)
            const creditEntryRef = doc(ledgerRef);
            transaction.set(creditEntryRef, {
                transactionId: orderId,
                warehouseId,
                type: 'CREDIT',
                category: 'SALE',
                amount: totalAmount,
                balanceBefore: currentBalance,
                balanceAfter: currentBalance + totalAmount,
                description: `Order Sale #${orderId}`,
                timestamp: serverTimestamp()
            });

            // 2. Debit Entry (Commission)
            const debitEntryRef = doc(ledgerRef);
            transaction.set(debitEntryRef, {
                transactionId: orderId,
                warehouseId,
                type: 'DEBIT',
                category: 'COMMISSION',
                amount: commission,
                balanceBefore: currentBalance + totalAmount,
                balanceAfter: newBalance,
                description: `Platform Commission (10%)`,
                timestamp: serverTimestamp()
            });

            // 3. Update Warehouse Balance
            transaction.update(warehouseRef, { ledgerBalance: newBalance });
        });
        console.log(`Ledger recorded for Order ${orderId}`);
    } catch (e) {
        console.error("Ledger Transaction Failed", e);
        // This is a critical failure in a real app. 
        // We might want to add a "Retriable" flag or alert admin.
    }
}

/**
 * Records a Payout Transaction.
 * 1. Debits Warehouse (Payout Amount)
 * 2. Updates Ledger Balance
 */
export async function recordPayoutTransaction(
    firestore: Firestore,
    warehouseId: string,
    amount: number,
    reference: string // e.g., "NEFT-12345"
) {
    if (!warehouseId || amount <= 0) return;

    const ledgerRef = collection(firestore, 'ledger_entries');
    const warehouseRef = doc(firestore, 'warehouses', warehouseId);

    try {
        await runTransaction(firestore, async (transaction) => {
            const whDoc = await transaction.get(warehouseRef);
            if (!whDoc.exists()) throw new Error("Warehouse not found");

            const currentBalance = whDoc.data().ledgerBalance || 0;
            if (currentBalance < amount) {
                // Optional: Allow overdraft? Or Enforce strict?
                // For now, let's enforce non-negative balance strictly for safety.
                throw new Error(`Insufficient Balance. Current: ${currentBalance}, Requested: ${amount}`);
            }

            const newBalance = currentBalance - amount;

            // 1. Debit Entry (Payout)
            const debitEntryRef = doc(ledgerRef);
            transaction.set(debitEntryRef, {
                transactionId: `PAYOUT-${Date.now()}`,
                warehouseId,
                type: 'DEBIT',
                category: 'PAYOUT',
                amount: amount,
                balanceBefore: currentBalance,
                balanceAfter: newBalance,
                description: `Payout: ${reference}`,
                timestamp: serverTimestamp()
            });

            // 2. Update Warehouse Balance
            transaction.update(warehouseRef, { ledgerBalance: newBalance });
        });
        console.log(`Payout of ${amount} recorded for Warehouse ${warehouseId}`);
        return { success: true };
    } catch (e) {
        console.error("Payout Transaction Failed", e);
        return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
    }
}

/**
 * Records a Refund/Cancellation Transaction.
 * 1. Debits Warehouse (Refund to Customer) - Full Amount
 * 2. Credits Warehouse (Commission Reversal from Platform) - Dynamic Rate
 * 
 * Result: Warehouse loses the Net Revenue it made.
 */
export async function recordRefundTransaction(
    firestore: Firestore,
    warehouseId: string,
    orderId: string,
    totalAmount: number
) {
    if (!warehouseId || warehouseId === 'global') return;

    const ledgerRef = collection(firestore, 'ledger_entries');
    const warehouseRef = doc(firestore, 'warehouses', warehouseId);
    const configRef = doc(firestore, 'config', 'financials');

    try {
        await runTransaction(firestore, async (transaction) => {
            const [whDoc, configDoc] = await Promise.all([
                transaction.get(warehouseRef),
                transaction.get(configRef)
            ]);

            if (!whDoc.exists()) return;

            // Determine Rate
            let rate = 0.10; // Default 10%
            if (configDoc.exists()) {
                const data = configDoc.data();
                if (data.globalCommissionRate !== undefined) {
                    rate = data.globalCommissionRate / 100;
                }
            }

            const commission = totalAmount * rate;
            const currentBalance = whDoc.data().ledgerBalance || 0;
            // Net Change: -1000 (Refund) + 100 (Comm Back) = -900.
            const netChange = -totalAmount + commission;
            const newBalance = currentBalance + netChange;

            // 1. Debit Entry (Customer Refund)
            const refundRef = doc(ledgerRef);
            transaction.set(refundRef, {
                transactionId: orderId,
                warehouseId,
                type: 'DEBIT',
                category: 'REFUND',
                amount: totalAmount,
                balanceBefore: currentBalance,
                balanceAfter: currentBalance - totalAmount,
                description: `Refund for Order #${orderId}`,
                timestamp: serverTimestamp()
            });

            // 2. Credit Entry (Commission Reversal)
            const commReversalRef = doc(ledgerRef);
            transaction.set(commReversalRef, {
                transactionId: orderId,
                warehouseId,
                type: 'CREDIT',
                category: 'COMMISSION_REVERSAL',
                amount: commission,
                balanceBefore: currentBalance - totalAmount, // Sequential balance tracking
                balanceAfter: newBalance,
                description: `Commission Reversal (${(rate * 100).toFixed(1)}%)`,
                timestamp: serverTimestamp()
            });

            // 3. Update Warehouse Balance
            transaction.update(warehouseRef, { ledgerBalance: newBalance });
        });
        console.log(`Refund Ledger recorded for Order ${orderId}`);
    } catch (e) {
        console.error("Refund Ledger Transaction Failed", e);
    }
}
