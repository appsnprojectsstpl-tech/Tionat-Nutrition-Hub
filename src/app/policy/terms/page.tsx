export default function TermsOfService() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-3xl">
            <h1 className="text-3xl font-headline font-bold mb-6">Terms of Service</h1>
            <div className="prose dark:prose-invert">
                <p className="text-muted-foreground mb-4">Last Updated: {new Date().toLocaleDateString()}</p>

                <section className="mb-6">
                    <h2 className="text-xl font-semibold mb-2">1. Acceptance of Terms</h2>
                    <p>By accessing or using our website, you agree to be bound by these Terms of Service.</p>
                </section>

                <section className="mb-6">
                    <h2 className="text-xl font-semibold mb-2">2. Use of Service</h2>
                    <p>You agree not to use our services for any illegal or unauthorized purpose.</p>
                </section>

                <section className="mb-6">
                    <h2 className="text-xl font-semibold mb-2">3. Product Information</h2>
                    <p>We try to be as accurate as possible with product descriptions and prices. However, we do not warrant that product descriptions or other content is accurate, complete, reliable, current, or error-free.</p>
                </section>

                <section className="mb-6">
                    <h2 className="text-xl font-semibold mb-2">4. Limitation of Liability</h2>
                    <p>Tionat Nutrition Hub shall not be liable for any indirect, incidental, special, consequential or punitive damages.</p>
                </section>
            </div>
        </div>
    );
}
