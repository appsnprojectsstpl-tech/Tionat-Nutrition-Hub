
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
  getDocs,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { perfMonitor } from '@/lib/performance-utils';

type InternalQuery = any;
type WithId<T> = T & { id: string };

// ... existing code ...

export type UseCollectionResult<T> = {
  data: (T & { id: string })[] | null;
  isLoading: boolean;
  error: FirestoreError | Error | null;
  refetch: () => Promise<void>;
};

export function useCollection<T = any>(

  memoizedTargetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>) & { __memo?: boolean }) | null | undefined,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);
  const timerRef = useRef<any>(null);

  const fetchData = useCallback(async (isInitial = false) => {
    if (!memoizedTargetRefOrQuery) {
      setData(null);
      if (isInitial) setIsLoading(false);
      setError(null);
      return;
    }

    if (isInitial) setIsLoading(true);

    try {
      const snapshot = await getDocs(memoizedTargetRefOrQuery);
      const results: ResultItemType[] = snapshot.docs.map(doc => ({ ...(doc.data() as T), id: doc.id }));
      setData(results);
      setError(null);
    } catch (e) {
      const path: string =
        memoizedTargetRefOrQuery.type === 'collection'
          ? (memoizedTargetRefOrQuery as CollectionReference).path
          // @ts-ignore
          : (memoizedTargetRefOrQuery as unknown as InternalQuery)._query.path.canonicalString()
      const contextualError = new FirestorePermissionError({ operation: 'list', path });
      setError(contextualError);
      setData(null);
      errorEmitter.emit('permission-error', contextualError);
    } finally {
      if (isInitial) setIsLoading(false);
    }
  }, [memoizedTargetRefOrQuery]);

  useEffect(() => {
    if (!memoizedTargetRefOrQuery) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Start timer
    const path = memoizedTargetRefOrQuery.type === 'collection'
      ? (memoizedTargetRefOrQuery as CollectionReference).path
      : (memoizedTargetRefOrQuery as unknown as InternalQuery)._query.path.canonicalString();

    if (process.env.NODE_ENV === 'development') {
      timerRef.current = perfMonitor.startTimer(`firestore_sub:${path}`);
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      memoizedTargetRefOrQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: ResultItemType[] = [];
        for (const doc of snapshot.docs) {
          results.push({ ...(doc.data() as T), id: doc.id });
        }
        setData(results);
        setError(null);
        setIsLoading(false);

        // Log performance (only for initial load or significant updates)
        if (timerRef.current && process.env.NODE_ENV === 'development') {
          timerRef.current({ count: results.length, fromCache: snapshot.metadata.fromCache });
        }
      },
      (error: FirestoreError) => {
        const path: string =
          memoizedTargetRefOrQuery.type === 'collection'
            ? (memoizedTargetRefOrQuery as CollectionReference).path
            : (memoizedTargetRefOrQuery as unknown as InternalQuery)._query.path.canonicalString()

        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path,
        })

        setError(contextualError)
        setData(null)
        setIsLoading(false)

        errorEmitter.emit('permission-error', contextualError);
      }
    );

    return () => unsubscribe();
  }, [memoizedTargetRefOrQuery]);

  if (memoizedTargetRefOrQuery && !memoizedTargetRefOrQuery.__memo) {
    throw new Error('Firebase query was not properly memoized using useMemoFirebase');
  }

  const refetch = useCallback(async () => {
    await fetchData(false);
  }, [fetchData]);

  return { data, isLoading, error, refetch };
}
