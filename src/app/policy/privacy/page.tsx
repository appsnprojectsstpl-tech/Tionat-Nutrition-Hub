export default function PrivacyPolicy() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-3xl">
            <h1 className="text-3xl font-headline font-bold mb-6">Privacy Policy</h1>
            <div className="prose dark:prose-invert">
                <p className="text-muted-foreground mb-4">Last Updated: {new Date().toLocaleDateString()}</p>

                <section className="mb-6">
                    <h2 className="text-xl font-semibold mb-2">1. Information We Collect</h2>
                    <p>We collect information you provide directly to us, such as when you create an account, make a purchase, or contact us. This may include your name, email, phone number, and shipping address.</p>
                </section>

                <section className="mb-6">
                    <h2 className="text-xl font-semibold mb-2">2. How We Use Your Information</h2>
                    <p>We use the information we collect to process your orders, communicate with you, and improve our services.</p>
                </section>

                <section className="mb-6">
                    <h2 className="text-xl font-semibold mb-2">3. Data Security</h2>
                    <p>We implement reasonable security measures to protect your personal information.</p>
                </section>

                <section className="mb-6">
                    <h2 className="text-xl font-semibold mb-2">4. Contact Us</h2>
                    <p>If you have any questions about this Privacy Policy, please contact us at support@tionat.com.</p>
                </section>
            </div>
        </div>
    );
}
