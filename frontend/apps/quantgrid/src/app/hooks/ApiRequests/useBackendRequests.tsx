import { useCallback } from 'react';
import { AuthContextProps } from 'react-oidc-context';

import {
  ApiErrorType,
  apiMessages,
  ApiRequestFunctionWithError,
} from '@frontend/common';

import { getApiUrl } from '../../services';
import { classifyFetchError } from '../../utils/';
import { fetchWithProgress } from '../../utils/fetch';

export function useBackendRequest(auth: AuthContextProps) {
  const sendAuthorizedRequest = useCallback(
    (
      path: string,
      params?: Omit<RequestInit, 'headers'> & {
        headers?: Record<string, string>;
      },
    ) => {
      const reqHeaders = params?.headers || {};

      if (auth.user?.access_token) {
        reqHeaders['Authorization'] = `Bearer ${auth.user?.access_token}`;
      }

      const pathWithApiUrl = getApiUrl() + path;

      return fetch(pathWithApiUrl, { ...params, headers: reqHeaders });
    },
    [auth],
  );

  const sendDialRequest = useCallback(
    (
      path: string,
      params?: Omit<RequestInit, 'headers'> & {
        headers?: Record<string, string>;
      },
    ) => {
      const reqHeaders = params?.headers || {};

      if (auth.user?.access_token) {
        reqHeaders['Authorization'] = `Bearer ${auth.user?.access_token}`;
      }

      const fullPath = window.externalEnv.dialBaseUrl + path;

      return fetch(fullPath, { ...params, headers: reqHeaders });
    },
    [auth],
  );

  const sendRequestWithProgress = useCallback(
    (
      baseUrl: string,
      path: string,
      params?: Omit<RequestInit, 'headers'> & {
        headers?: Record<string, string>;
      },
      onProgress?: (
        progress: number,
        event: ProgressEvent<EventTarget>,
      ) => void,
    ) => {
      const reqHeaders = params?.headers || {};

      if (auth.user?.access_token) {
        reqHeaders['Authorization'] = `Bearer ${auth.user?.access_token}`;
      }

      const fullPath = baseUrl + path;

      const result = fetchWithProgress(
        fullPath,
        { ...params, headers: reqHeaders },
        onProgress,
      );

      return result;
    },
    [auth],
  );

  const getDialBucket = useCallback<
    ApiRequestFunctionWithError<void, string>
  >(async () => {
    try {
      const res = await sendDialRequest(`/v1/bucket`);

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          return {
            success: false,
            error: {
              type: ApiErrorType.Unauthorized,
              message: apiMessages.unauthorizedRequest,
              statusCode: res.status,
            },
          };
        }

        return {
          success: false,
          error: {
            type: ApiErrorType.ServerError,
            message: apiMessages.getBucketServer,
            statusCode: res.status,
          },
        };
      }

      const data: { bucket: string } = await res.json();

      return {
        success: true,
        data: data.bucket,
      };
    } catch (error) {
      return {
        success: false,
        error: classifyFetchError(error, apiMessages.getBucketClient),
      };
    }
  }, [sendDialRequest]);

  return {
    getDialBucket,
    sendDialRequest,
    sendAuthorizedRequest,
    sendRequestWithProgress,
  };
}
