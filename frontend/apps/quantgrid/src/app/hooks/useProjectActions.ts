import { useCallback, useContext } from 'react';
import { toast } from 'react-toastify';

import { ProjectContext } from '../context';
import { useApi } from './useApi';

export function useProjectActions() {
  const {
    createProject,
    openProject,
    projectName,
    sheetName,
    renameSheet,
    renameProject,
    deleteProject,
    newSheet,
    projectSheets,
  } = useContext(ProjectContext);
  const { closeProject, deleteWorksheet } = useApi();

  const closeProjectAction = useCallback(() => {
    if (projectName) {
      closeProject(projectName);
    }
  }, [closeProject, projectName]);

  const deleteProjectAction = useCallback(() => {
    if (projectName) {
      deleteProject();
    }
  }, [deleteProject, projectName]);

  const renameProjectAction = useCallback(() => {
    if (projectName) {
      renameProject(projectName);
    }
  }, [projectName, renameProject]);

  const createProjectAction = useCallback(() => {
    createProject();
  }, [createProject]);

  const openProjectAction = useCallback(() => {
    openProject();
  }, [openProject]);

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
        deleteWorksheet(projectName, worksheetName);
      }
    },
    [deleteWorksheet, projectName, sheetName, projectSheets]
  );

  const renameWorksheetAction = useCallback(
    (worksheetName = sheetName) => {
      if (worksheetName) {
        renameSheet(worksheetName);
      }
    },
    [renameSheet, sheetName]
  );

  const createWorksheetAction = useCallback(() => {
    newSheet();
  }, [newSheet]);

  return {
    renameProjectAction,
    renameWorksheetAction,
    deleteProjectAction,
    deleteWorksheetAction,
    createProjectAction,
    createWorksheetAction,
    openProjectAction,
    closeProjectAction,
  };
}
