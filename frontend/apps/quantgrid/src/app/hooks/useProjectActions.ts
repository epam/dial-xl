import { useCallback, useContext } from 'react';
import { toast } from 'react-toastify';

import { dialProjectFileExtension } from '@frontend/common';

import { ProjectContext } from '../context';

export function useProjectActions() {
  const {
    createProject,
    projectName,
    sheetName,
    renameSheet,
    renameCurrentProject,
    deleteCurrentProject,
    createSheet,
    projectSheets,
    deleteSheet,
    closeCurrentProject,
    shareResources,
    projectBucket,
    projectPath,
  } = useContext(ProjectContext);

  const closeProjectAction = useCallback(() => {
    if (projectName) {
      closeCurrentProject();
    }
  }, [closeCurrentProject, projectName]);

  const deleteProjectAction = useCallback(() => {
    if (projectName) {
      deleteCurrentProject();
    }
  }, [deleteCurrentProject, projectName]);

  const renameProjectAction = useCallback(() => {
    if (projectName) {
      renameCurrentProject();
    }
  }, [projectName, renameCurrentProject]);

  const createProjectAction = useCallback(() => {
    createProject({ openInNewTab: true });
  }, [createProject]);

  const deleteWorksheetAction = useCallback(
    (worksheetName = sheetName) => {
      if (
        projectSheets &&
        projectSheets.length === 1 &&
        worksheetName === projectSheets[0].sheetName
      ) {
        toast.warning('Project must contain at least one sheet.', {
          toastId: 'deleteWorksheetAction',
          autoClose: 5000,
        });

        return;
      }

      if (projectName && worksheetName) {
        deleteSheet({ sheetName: worksheetName });
      }
    },
    [sheetName, projectSheets, projectName, deleteSheet]
  );

  const renameWorksheetAction = useCallback(
    (worksheetName = sheetName) => {
      if (worksheetName) {
        renameSheet({ oldName: worksheetName });
      }
    },
    [renameSheet, sheetName]
  );

  const createWorksheetAction = useCallback(() => {
    createSheet();
  }, [createSheet]);

  const shareProjectAction = useCallback(() => {
    if (!projectName || !projectBucket) return;

    const projectFileName = projectName + dialProjectFileExtension;
    shareResources([
      {
        name: projectFileName,
        bucket: projectBucket,
        parentPath: projectPath,
        nodeType: 'ITEM',
      },
    ]);
  }, [projectBucket, projectName, projectPath, shareResources]);

  return {
    renameProjectAction,
    renameWorksheetAction,
    deleteProjectAction,
    deleteWorksheetAction,
    createProjectAction,
    createWorksheetAction,
    closeProjectAction,
    shareProjectAction,
  };
}
