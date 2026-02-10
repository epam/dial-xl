import { FC, PropsWithChildren, useContext, useEffect, useMemo } from 'react';

import { useCloseProject, useOpenProject } from '../../hooks';
import useEventBus from '../../hooks/useEventBus';
import { EventBusMessages } from '../../services';
import { ProjectContext } from './ProjectContext';
import { ProjectResourceContext } from './ProjectResourceContext';
import { ProjectResourceProvider } from './ProjectResourceProvider';
import { ProjectSessionContext } from './ProjectSessionContext';
import { ProjectSessionProvider } from './ProjectSessionProvider';
import { ProjectSubscriptionContext } from './ProjectSubscriptionContext';
import { ProjectSubscriptionProvider } from './ProjectSubscriptionProvider';

const ProjectContextAggregator: FC<PropsWithChildren> = ({ children }) => {
  const eventBus = useEventBus<EventBusMessages>();
  const res = useContext(ProjectResourceContext);
  const ses = useContext(ProjectSessionContext);
  const sub = useContext(ProjectSubscriptionContext);

  const closeCurrentProject = useCloseProject();
  const openProject = useOpenProject();

  useEffect(() => {
    eventBus.subscribe('CloseCurrentProject', () => {
      closeCurrentProject();
    });
  }, [closeCurrentProject, eventBus]);

  useEffect(() => {
    return () => {
      closeCurrentProject(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({
      projectName: res.projectName,
      projectBucket: res.projectBucket,
      projectPath: res.projectPath,
      projectVersion: res.projectVersion,
      projectAuthor: res.projectAuthor,
      projectSheets: res.projectSheets,
      projectState: res.projectState,
      forkedProject: res.forkedProject,
      responseIds: res.responseIds,
      fullProjectPath: res.fullProjectPath,
      projectPermissions: res.projectPermissions,
      updateProjectOnServer: res.updateProjectOnServer,
      isProjectChangedOnServerByUser: res.isProjectChangedOnServerByUser,
      longCalcStatus: res.longCalcStatus,
      setLongCalcStatus: res.setLongCalcStatus,
      cancelAllImportSyncRequests: res.cancelAllImportSyncRequests,
      manageRequestLifecycle: res.manageRequestLifecycle,

      sheetName: ses.sheetName,
      sheetContent: ses.sheetContent,
      sheetErrors: ses.sheetErrors,
      compilationErrors: ses.compilationErrors,
      parsedSheet: ses.parsedSheet,
      parsedSheets: ses.parsedSheets,
      indexErrors: ses.indexErrors,
      runtimeErrors: ses.runtimeErrors,
      functions: ses.functions,
      fieldInfos: ses.fieldInfos,
      hasEditPermissions: ses.hasEditPermissions,
      isProjectShareable: ses.isProjectShareable,
      isProjectReadonlyByUser: ses.isProjectReadonlyByUser,
      isProjectEditingDisabled: ses.isProjectEditingDisabled,
      isProjectEditable: ses.isProjectEditable,
      openSheet: ses.openSheet,
      diffData: ses.diffData,
      setDiffData: ses.setDiffData,
      beforeTemporaryState: ses.beforeTemporaryState,
      startTemporaryState: ses.startTemporaryState,
      resolveTemporaryState: ses.resolveTemporaryState,
      setIsTemporaryStateEditable: ses.setIsTemporaryStateEditable,
      getCurrentProjectViewport: ses.getCurrentProjectViewport,
      getVirtualProjectViewport: ses.getVirtualProjectViewport,
      setIsProjectReadonlyByUser: ses.setIsProjectReadonlyByUser,
      setIsProjectEditingDisabled: ses.setIsProjectEditingDisabled,
      resetSheetState: ses.resetSheetState,
      setCurrentSheetName: ses.setCurrentSheetName,
      updateSheetContent: ses.updateSheetContent,
      isTemporaryState: ses.isTemporaryState,
      isTemporaryStateEditable: ses.isTemporaryStateEditable,
      isConflictResolving: ses.isConflictResolving,
      setIsConflictResolving: ses.setIsConflictResolving,
      initConflictResolving: ses.initConflictResolving,
      manuallyUpdateSheetContent: ses.manuallyUpdateSheetContent,
      resolveConflictUsingServerChanges: ses.resolveConflictUsingServerChanges,
      resolveConflictUsingLocalChanges: ses.resolveConflictUsingLocalChanges,

      unsubscribeFromCurrentProject: sub.unsubscribeFromCurrentProject,

      openProject,
      closeCurrentProject,
    }),
    [ses, res, sub, closeCurrentProject, openProject]
  );

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
};

export function ProjectContextProvider({
  children,
}: PropsWithChildren<Record<string, unknown>>) {
  return (
    <ProjectResourceProvider>
      <ProjectSessionProvider>
        <ProjectSubscriptionProvider>
          <ProjectContextAggregator>{children}</ProjectContextAggregator>
        </ProjectSubscriptionProvider>
      </ProjectSessionProvider>
    </ProjectResourceProvider>
  );
}
