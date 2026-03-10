import { PropsWithChildren, useMemo } from 'react';

import { useProjectSubscription } from '../../hooks';
import { ProjectSubscriptionContext } from './ProjectSubscriptionContext';

export function ProjectSubscriptionProvider({
  children,
}: PropsWithChildren<Record<string, unknown>>) {
  const { subscribeToProject, unsubscribeFromCurrentProject } =
    useProjectSubscription();

  const value = useMemo(
    () => ({
      subscribeToProject,
      unsubscribeFromCurrentProject,
    }),
    [subscribeToProject, unsubscribeFromCurrentProject],
  );

  return (
    <ProjectSubscriptionContext.Provider value={value}>
      {children}
    </ProjectSubscriptionContext.Provider>
  );
}
