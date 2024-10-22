import { withAuthenticationRequired } from 'react-oidc-context';

import { AppPage } from './AppPage';

export const ProtectedAppPage = withAuthenticationRequired(AppPage, {
  OnRedirecting: () => <div>Redirecting to the login page...</div>,
});
