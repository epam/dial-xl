import { decodeJwt } from 'jose';
import {
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from 'react-oidc-context';

import { useApiRequests } from '../../hooks';
import { ApiContext } from '../ApiContext';
import { AppContext } from '../AppContext';

export function ApiContextProvider({
  children,
}: PropsWithChildren<Record<string, unknown>>): JSX.Element {
  const auth = useAuth();
  const { setLoading } = useContext(AppContext);
  const { getDialBucket } = useApiRequests();
  const [userBucket, setUserBucket] = useState<string | undefined>();
  const [userRoles, setUserRoles] = useState<string[]>([]);

  const isAdmin = useMemo(() => {
    const adminRoles = window.externalEnv.adminRoles ?? [];

    return adminRoles.length
      ? !!userRoles?.some((role) => adminRoles.includes(role))
      : false;
  }, [userRoles]);

  useEffect(() => {
    const bucketAsyncFunc = async () => {
      setLoading(true);
      const bucket = await getDialBucket();
      setLoading(false);
      if (bucket) {
        setUserBucket(bucket);
      }
    };

    if (!auth.isLoading && auth.isAuthenticated) {
      bucketAsyncFunc();

      if (auth.user?.access_token) {
        const decodedJWT = decodeJwt(auth.user?.access_token);
        const userRoles =
          (decodedJWT as any)?.resource_access?.quantgrid?.roles ?? [];

        setUserRoles(userRoles);
      }
    }
  }, [
    getDialBucket,
    auth.isLoading,
    auth.isAuthenticated,
    setLoading,
    auth.user?.access_token,
  ]);

  const value = useMemo(
    () => ({
      userBucket,
      userRoles,
      isAdmin,
    }),
    [isAdmin, userBucket, userRoles]
  );

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}
