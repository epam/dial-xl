import { useCallback, useContext } from 'react';
import { useAuth } from 'react-oidc-context';

import { ProjectContext } from '../context';

export const useLogout = () => {
  const auth = useAuth();
  const { projectName, closeCurrentProject } = useContext(ProjectContext);

  const logoutWithRedirect = useCallback(async () => {
    if (projectName) {
      closeCurrentProject();
    }

    const isAuth0 = window.externalEnv.authAuthority?.includes('auth0');

    if (isAuth0) {
      // Remove all oidc tokens from local storage because auth.removeUser() can't do this properly
      for (const key in localStorage) {
        if (key.startsWith('oidc.')) {
          localStorage.removeItem(key);
        }
      }

      // Custom flow for auth0 logout
      const returnUrl = encodeURIComponent(window.location.origin);

      window.location.href = `${window.externalEnv.authAuthority}/v2/logout?client_id=${window.externalEnv.authClientId}&returnTo=${returnUrl}`;
    } else {
      await auth.revokeTokens();
      await auth.removeUser();
      await auth.signoutRedirect({
        post_logout_redirect_uri: window.location.href,
        id_token_hint: auth.user?.id_token,
      });
    }
  }, [auth, closeCurrentProject, projectName]);

  return { logoutWithRedirect };
};
