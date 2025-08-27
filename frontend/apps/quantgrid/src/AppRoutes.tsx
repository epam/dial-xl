import { Route, Routes } from 'react-router-dom';

import {
  ErrorPage,
  ProtectedAppPage,
  ProtectedDashboardPage,
  ProtectedSharePage,
} from './app';
import { IconsPage } from './app/pages/IconsPage';
import { routes } from './app/types';

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
      {process.env.NODE_ENV === 'development' && (
        <Route element={<IconsPage />} path="/icons" />
      )}
      <Route element={<ErrorPage />} path="*" />
    </Routes>
  );
}
