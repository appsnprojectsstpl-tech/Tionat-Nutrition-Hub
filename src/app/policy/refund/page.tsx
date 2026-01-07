export default function RefundPolicy() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-3xl">
            <h1 className="text-3xl font-headline font-bold mb-6">Refund & Cancellation Policy</h1>
            <div className="prose dark:prose-invert">
                <p className="text-muted-foreground mb-4">Last Updated: {new Date().toLocaleDateString()}</p>

                <section className="mb-6">
                    <h2 className="text-xl font-semibold mb-2">1. Cancellation Policy</h2>
                    <p>You may cancel your order within 30 minutes of placing it if the status is still 'Created' or 'Pending'. Once the order is processed or shipped, it cannot be cancelled.</p>
                </section>

                <section className="mb-6">
                    <h2 className="text-xl font-semibold mb-2">2. Returns</h2>
                    <p>We accept returns for damaged or incorrect items within 7 days of delivery. Consumable food products cannot be returned if the seal is broken.</p>
                </section>

                <section className="mb-6">
                    <h2 className="text-xl font-semibold mb-2">3. Refunds</h2>
                    <p>Refunds will be processed within 5-7 business days to the original payment method after the return is approved.</p>
                </section>
            </div>
        </div>
    );
}
