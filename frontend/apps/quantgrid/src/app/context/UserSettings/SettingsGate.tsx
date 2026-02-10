import { PropsWithChildren, useContext, useEffect } from 'react';

import { BucketErrorState } from '../../components/ErrorStates';
import { useUserSettingsStore } from '../../store';
import { ApiContext } from '../ApiContext';

export function SettingsGate({ children }: PropsWithChildren) {
  const { userBucket, bucketState, retryBucketFetch } = useContext(ApiContext);
  const markHydrated = useUserSettingsStore((s) => s.markHydrated);
  const hydrated = useUserSettingsStore((s) => s.hydrated);

  useEffect(() => {
    if (bucketState.error && !bucketState.loading && !hydrated) {
      // Mark as hydrated with default settings when bucket fetch failed
      markHydrated();
    }
  }, [
    userBucket,
    bucketState.error,
    bucketState.loading,
    markHydrated,
    hydrated,
  ]);

  // Show full-page error only for bucket fetch failures
  if (bucketState.error && !bucketState.loading) {
    return (
      <BucketErrorState error={bucketState.error} onRetry={retryBucketFetch} />
    );
  }

  // Show loading state only while fetching bucket or hydrating settings
  if (bucketState.loading || !hydrated) {
    return null;
  }

  return children;
}
