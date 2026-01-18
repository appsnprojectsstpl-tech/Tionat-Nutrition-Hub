import { AlertTriangle } from "lucide-react";

export default function MaintenancePage() {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 p-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100">
                <AlertTriangle className="h-10 w-10 text-yellow-600" />
            </div>
            <h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Under Maintenance
            </h1>
            <p className="mt-4 max-w-lg text-lg text-gray-500">
                We are currently performing scheduled maintenance to improve our services.
                Please check back soon.
            </p>
        </div>
    );
}
