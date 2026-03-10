import { useCallback } from 'react';
import { useNavigate } from 'react-router';

import { appMessages } from '@frontend/common';

import { routes } from '../types';
import { displayToast, getProjectNavigateUrl } from '../utils';
import { useApiRequests } from './useApiRequests';

export function useAcceptShare() {
  const navigate = useNavigate();
  const { acceptResourcesShare: acceptShareRequest } = useApiRequests();

  const acceptShareProject = useCallback(
    async ({
      invitationId,
      projectBucket,
      projectName,
      projectPath,
    }: {
      invitationId: string;
      projectBucket: string;
      projectName: string;
      projectPath: string | null | undefined;
    }) => {
      const acceptShare = await acceptShareRequest({ invitationId });

      if (!acceptShare) {
        // eslint-disable-next-line no-console
        console.warn('Redirect to home because of error while accepting share');
        navigate(routes.home);

        return;
      }

      navigate(
        getProjectNavigateUrl({
          projectBucket,
          projectName,
          projectPath,
        }),
      );
      displayToast('info', appMessages.acceptProjectShareRequest);
    },
    [acceptShareRequest, navigate],
  );

  const acceptShareFiles = useCallback(
    async ({ invitationId }: { invitationId: string }) => {
      const acceptShare = await acceptShareRequest({ invitationId });

      if (acceptShare) {
        displayToast('info', appMessages.acceptFilesShareRequest);
      }

      navigate(routes.sharedWithMe);
    },
    [acceptShareRequest, navigate],
  );

  return {
    acceptShareProject,
    acceptShareFiles,
  };
}
