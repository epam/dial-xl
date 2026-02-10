import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { useLocation, useNavigate } from 'react-router';

import {
  shareIdStorageKey,
  shareProjectBucketStorageKey,
  shareProjectNameStorageKey,
  shareProjectPathStorageKey,
} from '../common';
import { useUIStore } from '../store';
import { routes } from '../types';
import {
  getDashboardNavigateUrl,
  getFilesShareUrl,
  getProjectShareUrl,
} from '../utils';

export function AppPage() {
  const hideLoading = useUIStore((s) => s.hideLoading);
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();

  useEffect(() => {
    hideLoading();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (auth.isLoading) return;

    if (!auth.isAuthenticated) {
      navigate(routes.login);

      return;
    }

    const shareId = sessionStorage.getItem(shareIdStorageKey);
    const shareBucket = sessionStorage.getItem(shareProjectBucketStorageKey);
    const shareName = sessionStorage.getItem(shareProjectNameStorageKey);
    const sharePath = sessionStorage.getItem(shareProjectPathStorageKey);

    if (!shareId) {
      navigate(
        getDashboardNavigateUrl({
          folderPath: null,
          folderBucket: null,
          tab: 'home',
        }),
      );

      return;
    }

    if (!shareBucket || !shareName || !sharePath) {
      navigate(
        getFilesShareUrl({
          invitationId: shareId,
          relative: true,
        }),
      );

      return;
    }

    navigate(
      getProjectShareUrl({
        projectName: shareName,
        projectBucket: shareBucket,
        projectPath: sharePath,
        invitationId: shareId,
        relative: true,
      }),
    );
  }, [pathname, search, navigate, auth.isLoading, auth.isAuthenticated]);

  return null;
}
