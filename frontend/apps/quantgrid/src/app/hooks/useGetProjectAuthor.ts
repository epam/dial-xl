import { useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from 'react-oidc-context';

import {
  dialProjectFileExtension,
  filesEndpointType,
  MetadataNodeType,
  MetadataResourceType,
  publicBucket,
} from '@frontend/common';

import { ApiContext } from '../context';
import { constructPath, encodeApiUrl } from '../utils';
import { useApiRequests } from './useApiRequests';

type Props = {
  projectBucket: string | null;
  projectPath: string | null;
  projectName: string | null;
};

export function useGetProjectAuthor({
  projectBucket,
  projectPath,
  projectName,
}: Props) {
  const { userBucket } = useContext(ApiContext);
  const { user } = useAuth();

  const [projectAuthor, setProjectAuthor] = useState<string | null>(null);

  const { getSharedWithMeResources: getSharedWithMeFilesRequest } =
    useApiRequests();

  const getProjectAuthor = useCallback(async () => {
    if (!user || !projectName || !projectBucket) return;

    if (projectBucket === userBucket) {
      setProjectAuthor(
        user?.profile.name ? user?.profile.name + ' (Me)' : 'Me'
      );

      return;
    }

    if (projectBucket === publicBucket) {
      setProjectAuthor('Public');

      return;
    }

    const projectUrl = encodeApiUrl(
      constructPath([
        filesEndpointType,
        projectBucket,
        projectPath,
        projectName + dialProjectFileExtension,
      ])
    );
    const sharedWithMeFiles = await getSharedWithMeFilesRequest({
      resourceType: MetadataResourceType.FILE,
    });
    const projectSharedInfo = sharedWithMeFiles?.find((file) =>
      file.nodeType === MetadataNodeType.ITEM
        ? file.url === projectUrl
        : projectUrl.startsWith(file.url)
    );
    if (projectSharedInfo) {
      setProjectAuthor(projectSharedInfo.author ?? null);

      return;
    }

    setProjectAuthor(null);
  }, [
    getSharedWithMeFilesRequest,
    projectBucket,
    projectName,
    projectPath,
    user,
    userBucket,
  ]);

  useEffect(() => {
    getProjectAuthor();
  }, [getProjectAuthor]);

  return { projectAuthor };
}
