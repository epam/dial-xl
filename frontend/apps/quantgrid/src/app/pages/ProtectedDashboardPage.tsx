import { withAuthenticationRequired } from 'react-oidc-context';

import { DashboardPage } from './DashboardPage';

export const ProtectedDashboardPage = withAuthenticationRequired(
  DashboardPage,
  {
    OnRedirecting: () => <div>Redirecting to the login page...</div>,
  }
);
