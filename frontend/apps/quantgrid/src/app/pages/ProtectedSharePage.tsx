import { withAuthenticationRequired } from 'react-oidc-context';

import { LoginRedirectingPage } from './LoginRedirectingPage';
import { SharePage } from './SharePage';

export const ProtectedSharePage = withAuthenticationRequired(SharePage, {
  OnRedirecting: () => <LoginRedirectingPage />,
});
