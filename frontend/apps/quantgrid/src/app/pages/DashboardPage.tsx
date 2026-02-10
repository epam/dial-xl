import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { projectFolderAppdata, projectFolderXl } from '@frontend/common';

import { Dashboard, DashboardModals } from '../components';
import { DashboardContextProvider } from '../context';
import { useUIStore } from '../store';
import { routes } from '../types';

export function DashboardPage() {
  const hideLoading = useUIStore((s) => s.hideLoading);
  const { pathname, search } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    hideLoading();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Do not allow direct access to "/appdata/" or "/appdata/xl" without a folder in the shared tabs
  useEffect(() => {
    const parts = pathname.split('/').filter(Boolean);

    if (parts.length === 0) return;

    const base = parts[0];
    if (![routes.sharedByMe, routes.sharedWithMe].includes('/' + base)) return;

    if (parts[1] !== projectFolderAppdata) return;
    const hasXl = parts[2] === projectFolderXl;
    const folderIndex = hasXl ? 3 : 2;

    const isMissingFolder = parts.length <= folderIndex;

    if (isMissingFolder) {
      navigate(`/${base}${search}`, { replace: true });
    }
  }, [pathname, search, navigate]);

  return (
    <DashboardContextProvider>
      <Dashboard />
      <DashboardModals />
    </DashboardContextProvider>
  );
}
