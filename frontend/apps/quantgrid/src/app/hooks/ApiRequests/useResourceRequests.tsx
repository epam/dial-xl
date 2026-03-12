import { useCallback } from 'react';
import { AuthContextProps } from 'react-oidc-context';

import {
  ApiErrorType,
  apiMessages,
  ApiRequestFunctionWithError,
  conversationsEndpointType,
  filesEndpointType,
  GetMetadataParams,
  MetadataNodeType,
  MetadataResourceType,
  ResourceMetadata,
  ResourcePermission,
  SharedByMeMetadata,
  SharedWithMeMetadata,
} from '@frontend/common';

import {
  classifyFetchError,
  constructPath,
  displayToast,
  encodeApiUrl,
} from '../../utils';
import { useBackendRequest } from './useBackendRequests';

const resourceTypeToEndpoint = {
  [MetadataResourceType.FILE]: filesEndpointType,
  [MetadataResourceType.CONVERSATION]: conversationsEndpointType,
};

export const useResourceRequests = (auth: AuthContextProps) => {
  const { sendDialRequest } = useBackendRequest(auth);

  const getResourceMetadata = useCallback<
    ApiRequestFunctionWithError<
      {
        resourceType: MetadataResourceType;
        path: string | null | undefined;
        isRecursive?: boolean;
        suppressErrors?: boolean;
        withPermissions?: boolean;
      },
      ResourceMetadata
    >
  >(
    async ({
      path,
      isRecursive = false,
      suppressErrors = false,
      withPermissions = false,
      resourceType,
    }) => {
      try {
        let finalItems: ResourceMetadata[] = [];
        let resourcesMetadata: ResourceMetadata | undefined;
        let currentNextToken: string | undefined;
        const resourceEndpointType = resourceTypeToEndpoint[resourceType];

        do {
          const searchParams = new URLSearchParams({
            limit: '1000',
            ...(isRecursive
              ? {
                  recursive: 'true',
                }
              : undefined),
            ...(currentNextToken
              ? {
                  token: currentNextToken,
                }
              : undefined),
            ...(withPermissions
              ? {
                  permissions: 'true',
                }
              : undefined),
          });
          const url = `/v1/metadata/${resourceEndpointType}/${encodeApiUrl(
            path ?? '',
          )}?${searchParams.toString()}`;
          currentNextToken = undefined;
          const res = await sendDialRequest(url, { method: 'get' });

          if (!res.ok) {
            if (!suppressErrors) {
              displayToast('error', apiMessages.getFilesServer);
            }

            return {
              success: false,
              error: {
                type: ApiErrorType.ServerError,
                message: apiMessages.getFilesServer,
                statusCode: res.status,
              },
            };
          }

          resourcesMetadata = await res.json();

          if (resourcesMetadata) {
            finalItems = finalItems.concat(resourcesMetadata.items ?? []);
            currentNextToken = resourcesMetadata.nextToken;
          }
        } while (currentNextToken);

        if (!resourcesMetadata) {
          return {
            success: false,
            error: {
              type: ApiErrorType.Unknown,
              message: apiMessages.getFilesServer,
            },
          };
        }

        return {
          success: true,
          data: {
            ...resourcesMetadata,
            items: finalItems,
          },
        };
      } catch (error) {
        if (!suppressErrors) {
          displayToast('error', apiMessages.getFilesClient);
        }

        return {
          success: false,
          error: classifyFetchError(error, apiMessages.getFilesClient),
        };
      }
    },
    [sendDialRequest],
  );

  const getSharedByMeResources = useCallback<
    ApiRequestFunctionWithError<GetMetadataParams, SharedByMeMetadata[]>
  >(
    async ({ resourceType }) => {
      try {
        const url = `/v1/ops/resource/share/list`;
        const res = await sendDialRequest(url, {
          method: 'POST',
          body: JSON.stringify({
            resourceTypes: [resourceType],
            with: 'others',
            includeUserInfo: true,
          }),
        });

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
              message: apiMessages.getSharedByMeFilesServer,
              statusCode: res.status,
            },
          };
        }

        const filesMetadata: { resources: SharedByMeMetadata[] } =
          await res.json();

        return {
          success: true,
          data: filesMetadata.resources,
        };
      } catch (error) {
        return {
          success: false,
          error: classifyFetchError(
            error,
            apiMessages.getSharedByMeFilesClient,
          ),
        };
      }
    },
    [sendDialRequest],
  );

  const getSharedWithMeResources = useCallback<
    ApiRequestFunctionWithError<GetMetadataParams, SharedWithMeMetadata[]>
  >(
    async ({ resourceType }) => {
      try {
        const url = `/v1/ops/resource/share/list`;
        const res = await sendDialRequest(url, {
          method: 'POST',
          body: JSON.stringify({
            resourceTypes: [resourceType],
            with: 'me',
            includeUserInfo: true,
          }),
        });

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
              message: apiMessages.getSharedWithMeFilesServer,
              statusCode: res.status,
            },
          };
        }

        const filesMetadata: { resources: SharedWithMeMetadata[] } =
          await res.json();

        return {
          success: true,
          data: filesMetadata.resources,
        };
      } catch (error) {
        return {
          success: false,
          error: classifyFetchError(
            error,
            apiMessages.getSharedWithMeFilesClient,
          ),
        };
      }
    },
    [sendDialRequest],
  );

  const revokeResourcesAccess = useCallback<
    ApiRequestFunctionWithError<
      Pick<
        ResourceMetadata,
        'bucket' | 'parentPath' | 'name' | 'nodeType' | 'resourceType'
      >[],
      boolean
    >
  >(
    async (files) => {
      try {
        const url = `/v1/ops/resource/share/revoke`;
        const res = await sendDialRequest(url, {
          method: 'POST',
          body: JSON.stringify({
            resources: files.map(
              ({ bucket, parentPath, name, nodeType, resourceType }) => ({
                url: encodeApiUrl(
                  constructPath([
                    resourceTypeToEndpoint[resourceType],
                    bucket,
                    parentPath,
                    name,
                  ]) + (nodeType === MetadataNodeType.FOLDER ? '/' : ''),
                ),
              }),
            ),
          }),
        });

        if (!res.ok) {
          displayToast('error', apiMessages.revokeResourceServer);

          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message: apiMessages.revokeResourceServer,
              statusCode: res.status,
            },
          };
        }

        return {
          success: true,
          data: true,
        };
      } catch (error) {
        displayToast('error', apiMessages.revokeResourceClient);

        return {
          success: false,
          error: classifyFetchError(error, apiMessages.revokeResourceClient),
        };
      }
    },
    [sendDialRequest],
  );

  const discardResourcesAccess = useCallback<
    ApiRequestFunctionWithError<
      Pick<
        ResourceMetadata,
        'bucket' | 'parentPath' | 'name' | 'nodeType' | 'resourceType'
      >[],
      boolean
    >
  >(
    async (files) => {
      try {
        const url = `/v1/ops/resource/share/discard`;
        const res = await sendDialRequest(url, {
          method: 'POST',
          body: JSON.stringify({
            resources: files.map(
              ({ bucket, parentPath, name, nodeType, resourceType }) => ({
                url: encodeApiUrl(
                  constructPath([
                    resourceTypeToEndpoint[resourceType],
                    bucket,
                    parentPath,
                    name,
                  ]) + (nodeType === MetadataNodeType.FOLDER ? '/' : ''),
                ),
              }),
            ),
          }),
        });

        if (!res.ok) {
          displayToast('error', apiMessages.discardResourceServer);

          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message: apiMessages.discardResourceServer,
              statusCode: res.status,
            },
          };
        }

        return {
          success: true,
          data: true,
        };
      } catch (error) {
        displayToast('error', apiMessages.discardResourceClient);

        return {
          success: false,
          error: classifyFetchError(error, apiMessages.discardResourceClient),
        };
      }
    },
    [sendDialRequest],
  );

  const createResourcesShare = useCallback<
    ApiRequestFunctionWithError<
      {
        fileUrls: string[];
        permissions: ResourcePermission[];
      },
      string
    >
  >(
    async ({ fileUrls, permissions }) => {
      try {
        const url = `/v1/ops/resource/share/create`;
        const res = await sendDialRequest(url, {
          method: 'POST',
          body: JSON.stringify({
            resources: [
              ...fileUrls.map((url) => ({
                url,
                permissions,
              })),
            ],
            invitationType: 'link',
          }),
        });

        if (!res.ok) {
          displayToast('error', apiMessages.shareProjectServer);

          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message: apiMessages.shareProjectServer,
              statusCode: res.status,
            },
          };
        }

        const data: { invitationLink: string } = await res.json();

        return {
          success: true,
          data: data.invitationLink,
        };
      } catch (error) {
        displayToast('error', apiMessages.shareProjectClient);

        return {
          success: false,
          error: classifyFetchError(error, apiMessages.shareProjectClient),
        };
      }
    },
    [sendDialRequest],
  );

  const acceptResourcesShare = useCallback<
    ApiRequestFunctionWithError<{ invitationId: string }, void>
  >(
    async ({ invitationId }) => {
      try {
        const url = `/v1/invitations/${invitationId}?accept=true`;
        const res = await sendDialRequest(url, {
          method: 'GET',
        });

        if (!res.ok) {
          if (res.status === 404) {
            displayToast('error', apiMessages.acceptShareProjectNotFoundServer);

            return {
              success: false,
              error: {
                type: ApiErrorType.ServerError,
                message: apiMessages.acceptShareProjectNotFoundServer,
                statusCode: res.status,
              },
            };
          } else {
            displayToast('error', apiMessages.acceptShareProjectServer);

            return {
              success: false,
              error: {
                type:
                  res.status === 401 || res.status === 403
                    ? ApiErrorType.Unauthorized
                    : ApiErrorType.ServerError,
                message: apiMessages.acceptShareProjectServer,
                statusCode: res.status,
              },
            };
          }
        }

        return {
          success: true,
          data: undefined,
        };
      } catch (error) {
        displayToast('error', apiMessages.acceptShareProjectClient);

        return {
          success: false,
          error: classifyFetchError(
            error,
            apiMessages.acceptShareProjectClient,
          ),
        };
      }
    },
    [sendDialRequest],
  );

  return {
    getResourceMetadata,
    getSharedByMeResources,
    getSharedWithMeResources,
    revokeResourcesAccess,
    discardResourcesAccess,
    createResourcesShare,
    acceptResourcesShare,
  };
};
