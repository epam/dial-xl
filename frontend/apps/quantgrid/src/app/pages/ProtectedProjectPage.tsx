import { withAuthenticationRequired } from 'react-oidc-context';

import { LoginRedirectingPage } from './LoginRedirectingPage';
import { ProjectPage } from './ProjectPage';

export const ProtectedProjectPage = withAuthenticationRequired(ProjectPage, {
  OnRedirecting: () => <LoginRedirectingPage />,
});
