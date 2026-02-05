'use client';

import { Suspense, useState, useEffect } from 'react';
import { AuthForm } from '@/components/auth/auth-form';

function SignupPageInternal() {
    const [isClient, setIsClient] = useState(false);
    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) {
        return <div>Loading...</div>;
    }

    return <AuthForm />;
}

export default function SignupPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SignupPageInternal />
        </Suspense>
    )
}
