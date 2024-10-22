import { decodeJwt } from 'jose';
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from 'react-oidc-context';

import { publicAdminRole } from '@frontend/common';

import { useApiRequests } from '../hooks/useApiRequests';
import { AppContext } from './AppContext';

type ApiContextActions = {
  userBucket: string | undefined;
  userRoles: string[];
  isAdmin: boolean;
};

export const ApiContext = createContext<ApiContextActions>(
  {} as ApiContextActions
);

export function ApiContextProvider({
  children,
}: PropsWithChildren<Record<string, unknown>>): JSX.Element {
  const auth = useAuth();
  const { setLoading } = useContext(AppContext);
  const { getBucket } = useApiRequests();
  const [userBucket, setUserBucket] = useState<string | undefined>();
  const [userRoles, setUserRoles] = useState<string[]>([]);

  const isAdmin = useMemo(() => {
    return !!userRoles?.includes(publicAdminRole);
  }, [userRoles]);

  useEffect(() => {
    const bucketAsyncFunc = async () => {
      setLoading(true);
      const bucket = await getBucket();
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
    getBucket,
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
