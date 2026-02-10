import { useCallback, useState } from 'react';

import { ProjectState } from '@frontend/common';

import { ForkedProjectSettings } from '../../common';
import { useApiRequests } from '../useApiRequests';

export function useForkedProjectInfo() {
  const { checkProjectExists: checkProjectExistsRequest } = useApiRequests();

  const [forkedProject, setForkedProject] =
    useState<ForkedProjectSettings | null>(null);

  const updateForkedProjectInfo = useCallback(
    async (project: ProjectState) => {
      if (project.settings.projectMetadata?.forkedFrom) {
        const { forkedFrom } = project.settings.projectMetadata;
        if (forkedFrom?.projectName && forkedFrom?.bucket) {
          const { path, projectName, bucket } = forkedFrom;

          const isExists = await checkProjectExistsRequest({
            parentPath: path,
            name: projectName,
            bucket,
          });

          setForkedProject({
            path,
            bucket,
            projectName,
            isExists: !!isExists,
          });
        } else {
          setForkedProject(null);
        }
      } else {
        setForkedProject(null);
      }
    },
    [checkProjectExistsRequest],
  );

  return {
    forkedProject,
    updateForkedProjectInfo,
  };
}
