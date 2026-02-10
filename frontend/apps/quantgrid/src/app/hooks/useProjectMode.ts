import { useContext, useMemo } from 'react';

import { csvTempFolder, projectFoldersRootPrefix } from '@frontend/common';

import { ChatOverlayContext, ProjectContext } from '../context';
import { constructPath } from '../utils';

export function useProjectMode() {
  const { hasEditPermissions, isProjectReadonlyByUser, projectPath } =
    useContext(ProjectContext);
  const { isAIPendingChanges, isAIPreview } = useContext(ChatOverlayContext);

  const isAIPendingMode: boolean = useMemo(() => {
    return isAIPendingChanges;
  }, [isAIPendingChanges]);

  const isAIPreviewMode: boolean = useMemo(() => {
    return isAIPreview && !isAIPendingChanges;
  }, [isAIPendingChanges, isAIPreview]);

  const isReadOnlyMode: boolean = useMemo(() => {
    return (
      (!hasEditPermissions || isProjectReadonlyByUser) &&
      !isAIPreview &&
      !isAIPendingChanges
    );
  }, [
    hasEditPermissions,
    isAIPendingChanges,
    isAIPreview,
    isProjectReadonlyByUser,
  ]);

  const isCSVViewMode: boolean = useMemo(() => {
    return !!projectPath?.startsWith(
      constructPath([projectFoldersRootPrefix, csvTempFolder])
    );
  }, [projectPath]);

  const isDefaultMode: boolean = useMemo(() => {
    return (
      !isReadOnlyMode && !isAIPendingMode && !isAIPreviewMode && !isCSVViewMode
    );
  }, [isAIPendingMode, isAIPreviewMode, isReadOnlyMode, isCSVViewMode]);

  return {
    isReadOnlyMode,
    isAIPendingMode,
    isAIPreviewMode,
    isCSVViewMode,
    isDefaultMode,
  };
}
