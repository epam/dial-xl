import { createContext } from 'react';

export type ProjectSubscriptionActions = {
  unsubscribeFromCurrentProject: () => void;
};

type ProjectSubscriptionInternalActions = {
  subscribeToProject: ({
    bucket,
    path,
    projectName,
  }: {
    bucket: string;
    path?: string | null;
    projectName: string;
  }) => Promise<void>;
};

export const ProjectSubscriptionContext = createContext<
  ProjectSubscriptionActions & ProjectSubscriptionInternalActions
>({} as ProjectSubscriptionActions & ProjectSubscriptionInternalActions);
