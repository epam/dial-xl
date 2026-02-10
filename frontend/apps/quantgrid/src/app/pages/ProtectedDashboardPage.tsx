import { withAuthenticationRequired } from 'react-oidc-context';

import { DashboardPage } from './DashboardPage';
import { LoginRedirectingPage } from './LoginRedirectingPage';

export const ProtectedDashboardPage = withAuthenticationRequired(
  DashboardPage,
  {
    OnRedirecting: () => <LoginRedirectingPage />,
  },
);
