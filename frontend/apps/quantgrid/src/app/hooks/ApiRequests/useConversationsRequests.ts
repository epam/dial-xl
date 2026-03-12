import { useCallback } from 'react';
import { AuthContextProps } from 'react-oidc-context';

import { Message } from '@epam/ai-dial-overlay';
import {
  ApiErrorType,
  apiMessages,
  ApiRequestFunctionWithError,
  conversationsEndpointPrefix,
  MetadataResourceType,
  ResourceMetadata,
} from '@frontend/common';

import { FileReference } from '../../common';
import {
  classifyFetchError,
  constructPath,
  displayToast,
  encodeApiUrl,
} from '../../utils';
import { useBackendRequest, useResourceRequests } from '.';

export const useConversationResourceRequests = (auth: AuthContextProps) => {
  const { sendDialRequest } = useBackendRequest(auth);
  const { getResourceMetadata } = useResourceRequests(auth);

  const getConversation = useCallback<
    ApiRequestFunctionWithError<
      FileReference,
      { messages: Message[] } & unknown
    >
  >(
    async ({ bucket, parentPath = '', name }) => {
      try {
        const res = await sendDialRequest(
          encodeApiUrl(
            constructPath([
              conversationsEndpointPrefix,
              bucket,
              parentPath,
              name,
            ]),
          ),
        );

        if (!res.ok) {
          displayToast('error', apiMessages.getConversationServer);

          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message: apiMessages.getConversationServer,
              statusCode: res.status,
            },
          };
        }

        const json = await res.json();

        return {
          success: true,
          data: json,
        };
      } catch (error) {
        displayToast('error', apiMessages.getConversationClient);

        return {
          success: false,
          error: classifyFetchError(error, apiMessages.getConversationClient),
        };
      }
    },
    [sendDialRequest],
  );

  const putConversation = useCallback<
    ApiRequestFunctionWithError<
      FileReference & {
        conversation: { messages: Message[] } & unknown;
      },
      { messages: Message[] } & unknown
    >
  >(
    async ({ bucket, parentPath, name, conversation }) => {
      try {
        const res = await sendDialRequest(
          encodeApiUrl(
            constructPath([
              conversationsEndpointPrefix,
              bucket,
              parentPath,
              name,
            ]),
          ),
          {
            method: 'PUT',
            body: JSON.stringify(conversation),
          },
        );

        if (!res.ok) {
          displayToast('error', apiMessages.putConversationServer);

          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message: apiMessages.putConversationServer,
              statusCode: res.status,
            },
          };
        }

        return {
          success: true,
          data: await res.json(),
        };
      } catch (error) {
        displayToast('error', apiMessages.putConversationClient);

        return {
          success: false,
          error: classifyFetchError(error, apiMessages.putConversationClient),
        };
      }
    },
    [sendDialRequest],
  );

  const getConversations = useCallback<
    ApiRequestFunctionWithError<
      {
        folder: string;
        suppressErrors?: boolean;
      },
      ResourceMetadata[]
    >
  >(
    async ({ folder, suppressErrors }) => {
      const fileMetadata = await getResourceMetadata({
        resourceType: MetadataResourceType.CONVERSATION,
        path: folder,
        suppressErrors: true,
        withPermissions: true,
      });

      if (!fileMetadata.success && !suppressErrors) {
        displayToast('error', apiMessages.getConversationsServer);
      }

      return fileMetadata.success
        ? {
            success: true,
            data: fileMetadata.data.items ?? [],
          }
        : {
            success: false,
            error: fileMetadata.error,
          };
    },
    [getResourceMetadata],
  );

  const deleteConversation = useCallback(
    async (
      bucket: string,
      parentPath: string | null | undefined,
      name: string,
    ) => {
      const url = encodeApiUrl(
        constructPath([conversationsEndpointPrefix, bucket, parentPath, name]),
      );

      return await sendDialRequest(url, {
        method: 'DELETE',
      });
    },
    [sendDialRequest],
  );

  // Storage implementation of move conversation
  // Be careful - it's often needed to update conversation content when moving to another project
  // and this function not cover this
  const moveConversation = useCallback(
    async (
      bucket: string,
      parentPath: string | null | undefined,
      name: string,
      destinationFolder: string,
    ) => {
      return await sendDialRequest('/v1/ops/resource/move', {
        method: 'POST',
        body: JSON.stringify({
          sourceUrl: encodeApiUrl(
            constructPath(['conversations', bucket, parentPath, name]),
          ),
          destinationUrl: encodeApiUrl(`${destinationFolder}${name}`),
        }),
      });
    },
    [sendDialRequest],
  );

  // Storage implementation of copy conversation
  // Be careful - it's often needed to update conversation content when copying to another project
  // and this function not cover this
  const copyConversation = useCallback(
    async (
      bucket: string,
      parentPath: string | null | undefined,
      name: string,
      destinationFolder: string,
    ) => {
      return await sendDialRequest('/v1/ops/resource/copy', {
        method: 'POST',
        body: JSON.stringify({
          sourceUrl: encodeApiUrl(
            constructPath(['conversations', bucket, parentPath, name]),
          ),
          destinationUrl: encodeApiUrl(`${destinationFolder}${name}`),
        }),
      });
    },
    [sendDialRequest],
  );

  return {
    getConversation,
    putConversation,
    deleteConversation,
    moveConversation,
    getConversations,
    copyConversation,
  };
};
