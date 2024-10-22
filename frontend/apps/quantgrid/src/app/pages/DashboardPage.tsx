import { useContext, useEffect } from 'react';

import { Dashboard } from '../components';
import {
  AppContext,
  DashboardContextProvider,
  ProjectContext,
} from '../context';

export function DashboardPage() {
  const { hideLoading } = useContext(AppContext);
  const { projectName, closeCurrentProject } = useContext(ProjectContext);

  useEffect(() => {
    if (projectName) {
      closeCurrentProject(true);
    }

    hideLoading();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DashboardContextProvider>
      <Dashboard />
    </DashboardContextProvider>
  );
}
