import { Route, Routes } from 'react-router-dom';

import {
  ErrorPage,
  ProtectedAppPage,
  ProtectedDashboardPage,
  ProtectedSharePage,
} from './app';

export const routes = {
  home: '/home',
  project: '/project',
  recent: '/recent',
  sharedByMe: '/shared-by-me',
  sharedWithMe: '/shared-with-me',
  public: '/public',
  share: '/share',
};

export const routeParams = {
  folderBucket: 'bucket',
  projectBucket: 'projectBucket',
  projectPath: 'projectPath',
  projectName: 'projectName',
  sheetName: 'sheetName',
};

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<ProtectedDashboardPage />} path="/" />
      <Route element={<ProtectedDashboardPage />} path={routes.recent + '/*'} />
      <Route element={<ProtectedDashboardPage />} path={routes.home + '/*'} />
      <Route
        element={<ProtectedDashboardPage />}
        path={routes.sharedByMe + '/*'}
      />
      <Route
        element={<ProtectedDashboardPage />}
        path={routes.sharedWithMe + '/*'}
      />
      <Route element={<ProtectedDashboardPage />} path={routes.public + '/*'} />
      <Route
        element={<ProtectedAppPage />}
        path={routes.project + '/:projectName/:sheetName?'}
      />
      <Route
        element={<ProtectedSharePage />}
        path={routes.share + '/:shareId'}
      />
      <Route element={<ErrorPage />} path="*" />
    </Routes>
  );
}
