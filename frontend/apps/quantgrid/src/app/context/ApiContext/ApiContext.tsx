import { createContext } from 'react';

import { BucketFetchState } from '@frontend/common';

type ApiContextActions = {
  userBucket: string | undefined;
  userRoles: string[];
  isAdmin: boolean;
  bucketState: BucketFetchState;
  retryBucketFetch: () => void;
};

export const ApiContext = createContext<ApiContextActions>(
  {} as ApiContextActions,
);
