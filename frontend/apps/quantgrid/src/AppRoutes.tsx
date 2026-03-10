import { Route, Routes } from 'react-router';

import {
  AppPage,
  ErrorPage,
  IconsPage,
  LoginRedirectingPage,
  NotFoundPage,
  ProtectedDashboardPage,
  ProtectedProjectPage,
  SharePage,
} from './app';
import { routes } from './app/types';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppPage />} path="/" />
      <Route
        element={<LoginRedirectingPage isAutoRedirect={false} />}
        path={routes.login}
      />
      <Route element={<ProtectedDashboardPage />} path={routes.recent}>
        <Route element={<ProtectedDashboardPage />} path="*" />
      </Route>
      <Route element={<ProtectedDashboardPage />} path={routes.home}>
        <Route element={<ProtectedDashboardPage />} path="*" />
      </Route>
      <Route element={<ProtectedDashboardPage />} path={routes.sharedByMe}>
        <Route element={<ProtectedDashboardPage />} path="*" />
      </Route>
      <Route element={<ProtectedDashboardPage />} path={routes.sharedWithMe}>
        <Route element={<ProtectedDashboardPage />} path="*" />
      </Route>
      <Route element={<ProtectedDashboardPage />} path={routes.public}>
        <Route element={<ProtectedDashboardPage />} path="*" />
      </Route>
      <Route
        element={<ProtectedProjectPage />}
        path={routes.project + '/:projectName/:sheetName?'}
      />
      <Route element={<SharePage />} path={routes.share + '/:shareId'} />
      <Route element={<ErrorPage />} path={routes.error} />
      {process.env.NODE_ENV === 'development' && (
        <Route element={<IconsPage />} path="/icons" />
      )}
      <Route element={<NotFoundPage />} path="*" />
    </Routes>
  );
}
