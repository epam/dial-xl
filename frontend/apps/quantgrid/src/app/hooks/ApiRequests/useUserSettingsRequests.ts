import { useCallback } from 'react';
import { AuthContextProps } from 'react-oidc-context';

import {
  ApiErrorType,
  apiMessages,
  ApiRequestFunctionWithError,
  filesEndpointPrefix,
} from '@frontend/common';

import { FileReference } from '../../common';
import { classifyFetchError, constructPath, encodeApiUrl } from '../../utils';
import { useBackendRequest } from './index';

export const useUserSettingsRequests = (auth: AuthContextProps) => {
  const { sendDialRequest } = useBackendRequest(auth);

  const getSettingsFile: ApiRequestFunctionWithError<
    FileReference,
    { etag: string; text: string }
  > = useCallback(
    async ({ bucket, parentPath = '', name }) => {
      try {
        const url = encodeApiUrl(
          constructPath([filesEndpointPrefix, bucket, parentPath, name]),
        );

        const res = await sendDialRequest(url, { method: 'GET' });

        if (!res.ok) {
          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message: apiMessages.getSettingsServer,
              statusCode: res.status,
            },
          };
        }

        const text = await res.text();
        const etag = res.headers.get('Etag') ?? '';

        return { success: true, data: { etag, text } };
      } catch (error) {
        return {
          success: false,
          error: classifyFetchError(error, apiMessages.getSettingsClient),
        };
      }
    },
    [sendDialRequest],
  );

  const putSettingsFile: ApiRequestFunctionWithError<
    FileReference & { etag?: string; jsonText: string },
    { etag: string }
  > = useCallback(
    async ({ bucket, parentPath = '', name, etag, jsonText }) => {
      try {
        const file = new File([jsonText], name, { type: 'application/json' });
        const formData = new FormData();
        formData.append('attachment', file);

        const url = encodeApiUrl(
          constructPath([filesEndpointPrefix, bucket, parentPath, name]),
        );

        const res = await sendDialRequest(url, {
          method: 'PUT',
          body: formData,
          headers: etag ? { 'If-Match': etag } : undefined,
        });

        if (!res.ok) {
          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message: apiMessages.putSettingsServer,
              statusCode: res.status,
            },
          };
        }

        return {
          success: true,
          data: {
            etag: res.headers.get('Etag') ?? '',
          },
        };
      } catch (error) {
        return {
          success: false,
          error: classifyFetchError(error, apiMessages.putSettingsClient),
        };
      }
    },
    [sendDialRequest],
  );

  return { getSettingsFile, putSettingsFile };
};
