import { useEffect, useMemo } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { toast } from 'react-toastify';

import {
  shareIdStorageKey,
  shareProjectBucketStorageKey,
  shareProjectNameStorageKey,
  shareProjectPathStorageKey,
} from '../common';
import { useAcceptShare } from '../hooks';
import { routeParams, routes } from '../types';

export function SharePage() {
  const navigate = useNavigate();
  const { shareId } = useParams();
  const [searchParams] = useSearchParams();
  const auth = useAuth();

  const { acceptShareProject, acceptShareFiles } = useAcceptShare();

  const urlProjectPath = useMemo(
    () => searchParams.get(routeParams.projectPath),
    [searchParams],
  );
  const urlProjectName = useMemo(
    () => searchParams.get(routeParams.projectName),
    [searchParams],
  );
  const urlProjectBucket = useMemo(
    () => searchParams.get(routeParams.projectBucket),
    [searchParams],
  );

  useEffect(() => {
    if (auth.isLoading) return;

    if (!auth.isAuthenticated && shareId) {
      sessionStorage.setItem(shareIdStorageKey, shareId);
      if (urlProjectBucket) {
        sessionStorage.setItem(shareProjectBucketStorageKey, urlProjectBucket);
      }
      if (urlProjectName) {
        sessionStorage.setItem(shareProjectNameStorageKey, urlProjectName);
      }
      if (urlProjectPath) {
        sessionStorage.setItem(shareProjectPathStorageKey, urlProjectPath);
      }

      navigate(routes.login);

      return;
    }

    const resultedShareId =
      shareId || sessionStorage.getItem(shareIdStorageKey);
    const resultedProjectBucket =
      urlProjectBucket || sessionStorage.getItem(shareProjectBucketStorageKey);
    const resultedProjectName =
      urlProjectName || sessionStorage.getItem(shareProjectNameStorageKey);
    const resultedProjectPath =
      urlProjectPath || sessionStorage.getItem(shareProjectPathStorageKey);

    sessionStorage.removeItem(shareIdStorageKey);
    sessionStorage.removeItem(shareProjectBucketStorageKey);
    sessionStorage.removeItem(shareProjectNameStorageKey);
    sessionStorage.removeItem(shareProjectPathStorageKey);

    if (resultedShareId && resultedProjectBucket && resultedProjectName) {
      acceptShareProject({
        invitationId: resultedShareId,
        projectBucket: resultedProjectBucket,
        projectName: resultedProjectName,
        projectPath: resultedProjectPath,
      });
    } else if (resultedShareId) {
      acceptShareFiles({ invitationId: resultedShareId });
    } else {
      toast.error(
        'Share link is invalid or already expired. Please recheck it and try again',
      );

      navigate('/');

      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth]);

  return null;
}
