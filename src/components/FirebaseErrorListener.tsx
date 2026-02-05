import { useState, useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

/**
 * Listens for global 'permission-error' events and shows a toast.
 * DOES NOT CRASH THE APP.
 */
export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      // Log to console but DO NOT show toast to avoid spamming the user
      console.warn("Caught Permission Error (Non-Fatal):", error);
      // toast({
      //   variant: "destructive",
      //   title: "Access Denied",
      //   description: `Permission error: ${error.operation || 'unknown'} on ${error.path || 'unknown'}`,
      //   duration: 5000,
      // });
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [toast]);

  return null;
}
