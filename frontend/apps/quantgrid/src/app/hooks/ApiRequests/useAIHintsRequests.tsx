import { useCallback } from 'react';
import { AuthContextProps } from 'react-oidc-context';

import {
  AIHint,
  apiMessages,
  dialAIHintsFileName,
  filesEndpointPrefix,
} from '@frontend/common';

import { FileReference } from '../../common';
import { ApiRequestFunction } from '../../types';
import { constructPath, displayToast, encodeApiUrl } from '../../utils';
import { useBackendRequest } from './useBackendRequests';

export const useAIHintsRequests = (auth: AuthContextProps) => {
  const { sendDialRequest } = useBackendRequest(auth);

  const getAIHintsContent = useCallback<
    ApiRequestFunction<
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
            ])
          )
        );

        if (!res.ok) {
          if (!suppressErrors) {
            displayToast('error', apiMessages.getAIHintsServer);
          }

          return;
        }

        const result = await res.json();
        const version = res.headers.get('Etag') ?? '';

        return { json: result, version };
      } catch {
        if (!suppressErrors) {
          displayToast('error', apiMessages.getAIHintsClient);
        }

        return undefined;
      }
    },
    [sendDialRequest]
  );

  const putAIHintsContent = useCallback<
    ApiRequestFunction<
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
            }${dialAIHintsFileName}`
          ),
          {
            method: 'PUT',
            body: formData,
            headers: version
              ? {
                  'If-Match': version,
                }
              : undefined,
          }
        );

        if (!res.ok) {
          if (res.status === 412) {
            displayToast('error', apiMessages.putAIHintsVersion);
          } else if (res.status === 403) {
            displayToast('error', apiMessages.putAIHintsForbidden);
          } else {
            displayToast('error', apiMessages.putAIHintsServer);
          }

          return;
        }
        const resultVersion = res.headers.get('Etag') ?? '';

        return {
          version: resultVersion,
        };
      } catch {
        displayToast('error', apiMessages.putAIHintsClient);

        return undefined;
      }
    },
    [sendDialRequest]
  );

  return { getAIHintsContent, putAIHintsContent };
};
