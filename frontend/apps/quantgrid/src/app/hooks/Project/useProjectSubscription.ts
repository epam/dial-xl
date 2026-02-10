import { useCallback, useContext, useRef } from 'react';
import { toast } from 'react-toastify';

import {
  appMessages,
  dialProjectFileExtension,
  NotificationEvent,
  parseSSEResponse,
} from '@frontend/common';

import { ProjectResourceContext, ProjectSessionContext } from '../../context';
import { displayToast } from '../../utils';
import { useApiRequests } from '../useApiRequests';
import { useCloseProject } from './useCloseProject';

export function useProjectSubscription() {
  const { _projectState, getProjectFromServer, inflightRequest, remoteEtag } =
    useContext(ProjectResourceContext);
  const { isTemporaryStateRef } = useContext(ProjectSessionContext);
  const closeCurrentProject = useCloseProject();

  const { getProjectFileNotifications: getProjectFileNotificationsRequest } =
    useApiRequests();

  const projectSubscriptionControllerRef = useRef<AbortController | null>(null);

  const onDeleteProjectNotification = useCallback(() => {
    displayToast('info', appMessages.currentProjectRemoved);
    // eslint-disable-next-line no-console
    console.warn('Redirect to home because of project have been removed');
    closeCurrentProject();
  }, [closeCurrentProject]);

  const onRetryGetProject = useCallback(async () => {
    const st = _projectState.current;
    if (!st) return;

    await getProjectFromServer({
      path: st.path,
      bucket: st.bucket,
      projectName: st.projectName,
    });
  }, [_projectState, getProjectFromServer]);

  const onUpdateProjectNotification = useCallback(
    async (etag: string | null | undefined) => {
      if (isTemporaryStateRef.current) return;

      if (inflightRequest.current !== null) {
        remoteEtag.current = etag ?? null;

        return;
      }

      const st = _projectState.current;
      if (!st) return;

      if (etag !== st.version) {
        await getProjectFromServer({
          path: st.path,
          bucket: st.bucket,
          projectName: st.projectName,
        });
      }
    },
    [
      _projectState,
      getProjectFromServer,
      inflightRequest,
      isTemporaryStateRef,
      remoteEtag,
    ]
  );

  const subscribeToProject = useCallback(
    async ({
      bucket,
      path,
      projectName,
    }: {
      bucket: string;
      path?: string | null;
      projectName: string;
    }) => {
      projectSubscriptionControllerRef.current?.abort();

      projectSubscriptionControllerRef.current = new AbortController();
      let retries = 0;

      while (true) {
        // Needed try for Aborting exception
        try {
          const res = await getProjectFileNotificationsRequest({
            projectUrl: `${bucket}/${
              path ? path + '/' : ''
            }${projectName}${dialProjectFileExtension}`,
            controller: projectSubscriptionControllerRef.current,
          });

          if (!res) {
            if (!projectSubscriptionControllerRef.current.signal.aborted) {
              displayToast('error', appMessages.subscribeError);
            }

            return;
          }

          if (retries > 0 && !isTemporaryStateRef.current) {
            onRetryGetProject();
          }

          retries = 0;

          return await parseSSEResponse(
            res,
            {
              onData: (e: NotificationEvent) => {
                if (e.action === 'DELETE') onDeleteProjectNotification();
                if (e.action === 'UPDATE') onUpdateProjectNotification(e.etag);
              },
            },
            projectSubscriptionControllerRef.current
          );
        } catch (e) {
          // Aborted by the browser (for example, when a user tries to save the page).
          // “network error” appears when the subscription request is active
          // “Failed to fetch” appears when the subscription request is pending after a retry.
          if (
            e instanceof TypeError &&
            (e.message === 'network error' || e.message === 'Failed to fetch')
          ) {
            retries++;

            continue;
          }

          if (e instanceof DOMException && e.name === 'AbortError') {
            toast.dismiss();

            return;
          }

          if (retries > 3) {
            return;
          }

          displayToast('error', appMessages.connectionLost);
          retries++;

          continue;
        }
      }
    },
    [
      getProjectFileNotificationsRequest,
      onDeleteProjectNotification,
      onRetryGetProject,
      onUpdateProjectNotification,
      isTemporaryStateRef,
    ]
  );

  const unsubscribeFromCurrentProject = useCallback(() => {
    if (
      projectSubscriptionControllerRef.current &&
      !projectSubscriptionControllerRef.current?.signal.aborted
    ) {
      projectSubscriptionControllerRef.current.abort();
    }
  }, []);

  return {
    subscribeToProject,
    unsubscribeFromCurrentProject,
  };
}
