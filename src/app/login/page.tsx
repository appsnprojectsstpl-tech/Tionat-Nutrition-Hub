'use client';

import { Suspense, useState, useEffect } from 'react';
import { AuthForm } from '@/components/auth/auth-form';

function LoginPageInternal() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div>Loading...</div>;
  }

  return <AuthForm />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginPageInternal />
    </Suspense>
  )
}
