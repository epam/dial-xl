import { createContext } from 'react';

type ApiContextActions = {
  userBucket: string | undefined;
  userRoles: string[];
  isAdmin: boolean;
};

export const ApiContext = createContext<ApiContextActions>(
  {} as ApiContextActions
);
