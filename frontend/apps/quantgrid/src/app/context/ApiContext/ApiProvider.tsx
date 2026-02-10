import { decodeJwt } from 'jose';
import {
  type JSX,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from 'react-oidc-context';

import { BucketFetchState } from '@frontend/common';

import { useApiRequests } from '../../hooks';
import { useUIStore } from '../../store';
import { ApiContext } from './ApiContext';

export function ApiContextProvider({
  children,
}: PropsWithChildren<Record<string, unknown>>): JSX.Element {
  const auth = useAuth();
  const setLoading = useUIStore((s) => s.setLoading);
  const { getDialBucket } = useApiRequests();
  const [userBucket, setUserBucket] = useState<string | undefined>();
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [bucketState, setBucketState] = useState<BucketFetchState>({
    loading: false,
  });

  const isAdmin = useMemo(() => {
    const adminRoles = window.externalEnv.adminRoles ?? [];

    return adminRoles.length
      ? !!userRoles?.some((role) => adminRoles.includes(role))
      : false;
  }, [userRoles]);

  const fetchBucket = useCallback(async () => {
    setBucketState({ loading: true });
    setLoading(true);

    const result = await getDialBucket();

    setLoading(false);

    if (result.success) {
      setUserBucket(result.data);
      setBucketState({ loading: false, bucket: result.data });
    } else {
      setBucketState({ loading: false, error: result.error });
    }
  }, [getDialBucket, setLoading]);

  const retryBucketFetch = useCallback(() => {
    fetchBucket();
  }, [fetchBucket]);

  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated) {
      fetchBucket();

      if (auth.user?.access_token) {
        const decodedJWT = decodeJwt(auth.user?.access_token);
        const userRoles =
          (decodedJWT as any)?.resource_access?.quantgrid?.roles ?? [];

        setUserRoles(userRoles);
      }
    }
  }, [
    fetchBucket,
    auth.isLoading,
    auth.isAuthenticated,
    auth.user?.access_token,
  ]);

  const value = useMemo(
    () => ({
      userBucket,
      userRoles,
      isAdmin,
      bucketState,
      retryBucketFetch,
    }),
    [userBucket, userRoles, isAdmin, bucketState, retryBucketFetch],
  );

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}
