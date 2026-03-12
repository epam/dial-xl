import { useCallback } from 'react';
import { AuthContextProps } from 'react-oidc-context';

import {
  AIHint,
  ApiErrorType,
  apiMessages,
  ApiRequestFunctionWithError,
  dialAIHintsFileName,
  filesEndpointPrefix,
} from '@frontend/common';

import { FileReference } from '../../common';
import {
  classifyFetchError,
  constructPath,
  displayToast,
  encodeApiUrl,
} from '../../utils';
import { useBackendRequest } from './useBackendRequests';

export const useAIHintsRequests = (auth: AuthContextProps) => {
  const { sendDialRequest } = useBackendRequest(auth);

  const getAIHintsContent = useCallback<
    ApiRequestFunctionWithError<
      Pick<FileReference, 'bucket' | 'parentPath'> & {
        suppressErrors?: boolean;
      },
      { json: AIHint[]; version: string }
    >
  >(
    async ({ bucket, parentPath = '', suppressErrors = false }) => {
      try {
        const res = await sendDialRequest(
          encodeApiUrl(
            constructPath([
              filesEndpointPrefix,
              bucket,
              parentPath,
              dialAIHintsFileName,
            ]),
          ),
        );

        if (!res.ok) {
          if (!suppressErrors) {
            displayToast('error', apiMessages.getAIHintsServer);
          }

          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message: apiMessages.getAIHintsServer,
              statusCode: res.status,
            },
          };
        }

        const result = await res.json();
        const version = res.headers.get('Etag') ?? '';

        return {
          success: true,
          data: { json: result, version },
        };
      } catch (error) {
        if (!suppressErrors) {
          displayToast('error', apiMessages.getAIHintsClient);
        }

        return {
          success: false,
          error: classifyFetchError(error, apiMessages.getAIHintsClient),
        };
      }
    },
    [sendDialRequest],
  );

  const putAIHintsContent = useCallback<
    ApiRequestFunctionWithError<
      Pick<FileReference, 'bucket' | 'parentPath'> & {
        hints: AIHint[];
        version?: string;
      },
      { version: string }
    >
  >(
    async ({ bucket, parentPath = '', hints, version }) => {
      try {
        const data = JSON.stringify(hints);
        const file = new File([data], dialAIHintsFileName, {
          type: 'application/json',
        });
        const formData = new FormData();
        formData.append('attachment', file);

        const res = await sendDialRequest(
          encodeApiUrl(
            `${filesEndpointPrefix}/${bucket}/${
              parentPath ? parentPath + '/' : ''
            }${dialAIHintsFileName}`,
          ),
          {
            method: 'PUT',
            body: formData,
            headers: version
              ? {
                  'If-Match': version,
                }
              : undefined,
          },
        );

        if (!res.ok) {
          if (res.status === 412) {
            displayToast('error', apiMessages.putAIHintsVersion);

            return {
              success: false,
              error: {
                type: ApiErrorType.ServerError,
                message: apiMessages.putAIHintsVersion,
                statusCode: res.status,
              },
            };
          } else if (res.status === 403) {
            displayToast('error', apiMessages.putAIHintsForbidden);

            return {
              success: false,
              error: {
                type: ApiErrorType.Unauthorized,
                message: apiMessages.putAIHintsForbidden,
                statusCode: res.status,
              },
            };
          } else {
            displayToast('error', apiMessages.putAIHintsServer);

            return {
              success: false,
              error: {
                type: ApiErrorType.ServerError,
                message: apiMessages.putAIHintsServer,
                statusCode: res.status,
              },
            };
          }
        }
        const resultVersion = res.headers.get('Etag') ?? '';

        return {
          success: true,
          data: {
            version: resultVersion,
          },
        };
      } catch (error) {
        displayToast('error', apiMessages.putAIHintsClient);

        return {
          success: false,
          error: classifyFetchError(error, apiMessages.putAIHintsClient),
        };
      }
    },
    [sendDialRequest],
  );

  return { getAIHintsContent, putAIHintsContent };
};
