import { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { Dashboard } from '../components';
import { AppContext, ProjectContext } from '../context';
import { useApiResponse } from '../hooks/useApiResponse';
import { getRecentProject } from '../services';

import '../styles';

export function DashboardPage() {
  useApiResponse();

  const navigate = useNavigate();

  const { projectName } = useContext(ProjectContext);
  const { hideLoading } = useContext(AppContext);

  useEffect(() => {
    const recentProjectName = getRecentProject();

    if (recentProjectName) {
      navigate(`/${recentProjectName}`);
    }
  }, [navigate]);

  if (!projectName) {
    hideLoading();

    return <Dashboard />;
  }

  return null;
}
