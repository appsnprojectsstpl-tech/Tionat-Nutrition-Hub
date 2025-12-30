export default function PrivacyPage() {
    return (
        <div className="container mx-auto p-8 max-w-3xl">
            <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
            <p className="mb-4">Effective Date: 2025-01-01</p>
            <p className="mb-4">
                Tionat Nutrition Hub ("we", "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-2">1. Information We Collect</h2>
            <ul className="list-disc pl-6 mb-4">
                <li>Personal Identification: Name, Email, Phone Number, Address.</li>
                <li>Transactional: Order history, payment references (we do not store card details).</li>
                <li>Device: IP address, device model (for app functionality).</li>
            </ul>

            <h2 className="text-xl font-semibold mt-6 mb-2">2. How We Use Your Data</h2>
            <p className="mb-4">
                We use your data to process orders, improve our services, and communicate with you regarding your account.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-2">3. Data Deletion</h2>
            <p className="mb-4">
                You have the right to request deletion of your account and data. You can do this via the "Delete Account" option in your Profile settings or by contacting support.
            </p>

            <h2 className="text-xl font-semibold mt-6 mb-2">4. Contact Us</h2>
            <p className="mb-4">
                If you have questions, please contact us at support@tionat.com.
            </p>
        </div>
    );
}
