import { withAuthenticationRequired } from 'react-oidc-context';

import { SharePage } from './SharePage';

export const ProtectedSharePage = withAuthenticationRequired(SharePage, {
  OnRedirecting: () => <div>Redirecting to the login page...</div>,
});
