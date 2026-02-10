import { useCallback } from 'react';
import { AuthContextProps } from 'react-oidc-context';

import {
  apiMessages,
  conversationsEndpointType,
  filesEndpointType,
  MetadataNodeType,
  MetadataResourceType,
  ResourceMetadata,
  ResourcePermission,
  SharedByMeMetadata,
  SharedWithMeMetadata,
} from '@frontend/common';

import { ApiRequestFunction } from '../../types';
import { constructPath, displayToast, encodeApiUrl } from '../../utils';
import { useBackendRequest } from './useBackendRequests';

const resourceTypeToEndpoint = {
  [MetadataResourceType.FILE]: filesEndpointType,
  [MetadataResourceType.CONVERSATION]: conversationsEndpointType,
};

export const useResourceRequests = (auth: AuthContextProps) => {
  const { sendDialRequest } = useBackendRequest(auth);

  const getResourceMetadata = useCallback<
    ApiRequestFunction<
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
            path ?? ''
          )}?${searchParams.toString()}`;
          currentNextToken = undefined;
          const res = await sendDialRequest(url, { method: 'get' });

          if (!res.ok) {
            if (!suppressErrors) {
              displayToast('error', apiMessages.getFilesServer);
            }

            return undefined;
          }

          resourcesMetadata = await res.json();

          if (resourcesMetadata) {
            finalItems = finalItems.concat(resourcesMetadata.items ?? []);
            currentNextToken = resourcesMetadata.nextToken;
          }
        } while (currentNextToken);

        if (!resourcesMetadata) return;

        return {
          ...resourcesMetadata,
          items: finalItems,
        };
      } catch {
        if (!suppressErrors) {
          displayToast('error', apiMessages.getFilesClient);
        }

        return;
      }
    },
    [sendDialRequest]
  );

  const getSharedByMeResources = useCallback<
    ApiRequestFunction<
      { resourceType: MetadataResourceType },
      SharedByMeMetadata[]
    >
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
          displayToast('error', apiMessages.getSharedByMeFilesServer);

          return undefined;
        }

        const filesMetadata: { resources: SharedByMeMetadata[] } =
          await res.json();

        return filesMetadata.resources;
      } catch {
        displayToast('error', apiMessages.getSharedByMeFilesClient);

        return;
      }
    },
    [sendDialRequest]
  );

  const getSharedWithMeResources = useCallback<
    ApiRequestFunction<
      { resourceType: MetadataResourceType },
      SharedWithMeMetadata[]
    >
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
          displayToast('error', apiMessages.getSharedWithMeFilesServer);

          return undefined;
        }

        const filesMetadata: { resources: SharedWithMeMetadata[] } =
          await res.json();

        return filesMetadata.resources;
      } catch {
        displayToast('error', apiMessages.getSharedWithMeFilesClient);

        return;
      }
    },
    [sendDialRequest]
  );

  const revokeResourcesAccess = useCallback<
    ApiRequestFunction<
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
                  ]) + (nodeType === MetadataNodeType.FOLDER ? '/' : '')
                ),
              })
            ),
          }),
        });

        if (!res.ok) {
          displayToast('error', apiMessages.revokeResourceServer);

          return;
        }

        return true;
      } catch {
        displayToast('error', apiMessages.revokeResourceClient);

        return;
      }
    },
    [sendDialRequest]
  );

  const discardResourcesAccess = useCallback<
    ApiRequestFunction<
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
                  ]) + (nodeType === MetadataNodeType.FOLDER ? '/' : '')
                ),
              })
            ),
          }),
        });

        if (!res.ok) {
          displayToast('error', apiMessages.discardResourceServer);

          return;
        }

        return true;
      } catch {
        displayToast('error', apiMessages.discardResourceClient);

        return;
      }
    },
    [sendDialRequest]
  );

  const createResourcesShare = useCallback<
    ApiRequestFunction<
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

          return undefined;
        }

        const data: { invitationLink: string } = await res.json();

        return data.invitationLink;
      } catch {
        displayToast('error', apiMessages.shareProjectClient);

        return;
      }
    },
    [sendDialRequest]
  );

  const acceptResourcesShare = useCallback<
    ApiRequestFunction<{ invitationId: string }, unknown>
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
          } else {
            displayToast('error', apiMessages.acceptShareProjectServer);
          }

          return undefined;
        }

        return {};
      } catch {
        displayToast('error', apiMessages.acceptShareProjectClient);

        return;
      }
    },
    [sendDialRequest]
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
