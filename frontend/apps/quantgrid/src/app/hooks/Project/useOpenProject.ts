import { useCallback, useContext } from 'react';
import { useNavigate } from 'react-router';

import {
  ProjectResourceContext,
  ProjectSessionContext,
  ProjectSubscriptionContext,
} from '../../context';
import { useUIStore } from '../../store';
import { getProjectNavigateUrl } from '../../utils';

export function useOpenProject() {
  const setLoading = useUIStore((s) => s.setLoading);
  const navigate = useNavigate();
  const { remoteEtag, getProjectFromServer } = useContext(
    ProjectResourceContext,
  );
  const { initialOpenSheet } = useContext(ProjectSessionContext);
  const { subscribeToProject } = useContext(ProjectSubscriptionContext);

  return useCallback(
    async ({
      path,
      projectName,
      projectSheetName,
      bucket,
    }: {
      path: string | null | undefined;
      projectName: string;
      projectSheetName?: string | undefined;
      bucket: string;
    }): Promise<void> => {
      setLoading(true);
      navigate(
        getProjectNavigateUrl({
          projectName,
          projectBucket: bucket,
          projectPath: path,
          projectSheetName: projectSheetName,
        }),
        {
          replace: true,
        },
      );
      subscribeToProject({
        bucket,
        path,
        projectName,
      });

      const project = await getProjectFromServer({
        bucket,
        path,
        projectName,
      });

      if (!project) return;

      if (project.sheets) {
        await initialOpenSheet({
          sheetName: projectSheetName ?? project.sheets[0].sheetName,
        });
      }

      if (
        remoteEtag.current !== null &&
        remoteEtag.current !== project.version
      ) {
        remoteEtag.current = project.version;
      }
    },
    [
      getProjectFromServer,
      initialOpenSheet,
      navigate,
      remoteEtag,
      setLoading,
      subscribeToProject,
    ],
  );
}
