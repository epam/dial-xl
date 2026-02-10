import { useCallback } from 'react';
import { AuthContextProps } from 'react-oidc-context';

import { apiMessages } from '@frontend/common';

import { getApiUrl } from '../../services';
import { ApiRequestFunction } from '../../types';
import { displayToast } from '../../utils';
import { fetchWithProgress } from '../../utils/fetch';

export function useBackendRequest(auth: AuthContextProps) {
  const sendAuthorizedRequest = useCallback(
    (
      path: string,
      params?: Omit<RequestInit, 'headers'> & {
        headers?: Record<string, string>;
      }
    ) => {
      const reqHeaders = params?.headers || {};

      if (auth.user?.access_token) {
        reqHeaders['Authorization'] = `Bearer ${auth.user?.access_token}`;
      }

      const pathWithApiUrl = getApiUrl() + path;

      return fetch(pathWithApiUrl, { ...params, headers: reqHeaders });
    },
    [auth]
  );

  const sendDialRequest = useCallback(
    (
      path: string,
      params?: Omit<RequestInit, 'headers'> & {
        headers?: Record<string, string>;
      }
    ) => {
      const reqHeaders = params?.headers || {};

      if (auth.user?.access_token) {
        reqHeaders['Authorization'] = `Bearer ${auth.user?.access_token}`;
      }

      const fullPath = window.externalEnv.dialBaseUrl + path;

      return fetch(fullPath, { ...params, headers: reqHeaders });
    },
    [auth]
  );

  const sendDialRequestWithProgress = useCallback(
    (
      path: string,
      params?: Omit<RequestInit, 'headers'> & {
        headers?: Record<string, string>;
      },
      onProgress?: (progress: number, event: ProgressEvent<EventTarget>) => void
    ) => {
      const reqHeaders = params?.headers || {};

      if (auth.user?.access_token) {
        reqHeaders['Authorization'] = `Bearer ${auth.user?.access_token}`;
      }

      const fullPath = window.externalEnv.dialBaseUrl + path;

      const result = fetchWithProgress(
        fullPath,
        { ...params, headers: reqHeaders },
        onProgress
      );

      return result;
    },
    [auth]
  );

  const getDialBucket = useCallback<
    ApiRequestFunction<void, string>
  >(async () => {
    try {
      const res = await sendDialRequest(`/v1/bucket`);

      if (!res.ok) {
        displayToast('error', apiMessages.getBucketServer);

        return undefined;
      }

      const data: { bucket: string } = await res.json();

      return data.bucket;
    } catch {
      displayToast('error', apiMessages.getBucketClient);

      return;
    }
  }, [sendDialRequest]);

  return {
    getDialBucket,
    sendDialRequest,
    sendAuthorizedRequest,
    sendDialRequestWithProgress,
  };
}
