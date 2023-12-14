import { useCallback, useContext } from 'react';

import { Viewport } from '@frontend/common';

import { ApiAction } from '../common';
import { ApiContext } from '../context';

// Version will be changed before request, see ApiContext.tsx
const defaultVersion = 1;

export function useApi() {
  const { send } = useContext(ApiContext);

  const getProjects = useCallback(() => {
    send({ project_list_request: {} }, false);
  }, [send]);

  const getInputs = useCallback(() => {
    send({ input_list_request: {} }, false);
  }, [send]);

  const getFunctions = useCallback(() => {
    send({ function_request: {} }, false);
  }, [send]);

  const createProject = useCallback(
    (projectName: string) => {
      send(
        {
          create_project_request: {
            project_name: projectName,
          },
        },
        false,
        ApiAction.createProject
      );
    },
    [send]
  );

  const openProject = useCallback(
    (projectName: string) => {
      send(
        {
          open_project_request: {
            project_name: projectName,
          },
        },
        false,
        ApiAction.openProject
      );
    },
    [send]
  );

  const deleteProject = useCallback(
    (projectName: string) => {
      send(
        {
          delete_project_request: {
            project_name: projectName,
            version: defaultVersion,
          },
        },
        true,
        ApiAction.deleteProject
      );
    },
    [send]
  );

  const renameProject = useCallback(
    (projectName: string, newProjectName: string) => {
      send(
        {
          rename_project_request: {
            project_name: projectName,
            new_project_name: newProjectName,
            version: defaultVersion,
          },
        },
        true,
        ApiAction.renameProject
      );
    },
    [send]
  );

  const closeProject = useCallback(
    (projectName: string) => {
      send(
        {
          close_project_request: {
            project_name: projectName,
          },
        },
        false,
        ApiAction.closeProject
      );
    },
    [send]
  );

  const putWorksheet = useCallback(
    (
      projectName: string,
      sheetName: string,
      content?: string,
      isCurrentSheet = true
    ) => {
      send(
        {
          put_worksheet_request: {
            project_name: projectName,
            sheet_name: sheetName,
            content,
            version: defaultVersion,
          },
        },
        true,
        isCurrentSheet ? ApiAction.putSheet : ApiAction.putAnotherSheet
      );
    },
    [send]
  );

  const openWorksheet = useCallback(
    (projectName: string, sheetName: string) => {
      send(
        {
          open_worksheet_request: {
            project_name: projectName,
            sheet_name: sheetName,
          },
        },
        false,
        ApiAction.openSheet
      );
    },
    [send]
  );

  const renameWorksheet = useCallback(
    (projectName: string, oldSheetName: string, newSheetName: string) => {
      send(
        {
          rename_worksheet_request: {
            project_name: projectName,
            version: defaultVersion,
            old_sheet_name: oldSheetName,
            new_sheet_name: newSheetName,
          },
        },
        true,
        ApiAction.renameSheet
      );
    },
    [send]
  );

  const deleteWorksheet = useCallback(
    (projectName: string, sheetName: string) => {
      send(
        {
          delete_worksheet_request: {
            project_name: projectName,
            sheet_name: sheetName,
            version: defaultVersion,
          },
        },
        true,
        ApiAction.deleteSheet
      );
    },
    [send]
  );

  const closeWorksheet = useCallback(
    (projectName: string, sheetName: string) => {
      send(
        {
          close_worksheet_request: {
            project_name: projectName,
            sheet_name: sheetName,
          },
        },
        false,
        ApiAction.closeSheet
      );
    },
    [send]
  );

  const getViewport = useCallback(
    (projectName: string, viewports: Record<string, Viewport>) => {
      send(
        {
          viewport_request: {
            project_name: projectName,
            viewports,
          },
        },
        false
      );
    },
    [send]
  );

  const getDimensionalSchema = useCallback(
    (projectName: string, formula: string, isPanelInputsMetadata = false) => {
      send(
        {
          dimensional_schema_request: {
            project_name: projectName,
            formula,
          },
        },
        false,
        // we don't want to show errors which we collect after requesting all inputs in panel
        isPanelInputsMetadata ? ApiAction.panelInputsMetadata : undefined
      );
    },
    [send]
  );

  return {
    createProject,
    openProject,
    getDimensionalSchema,
    getProjects,
    deleteProject,
    renameProject,
    closeProject,
    putWorksheet,
    openWorksheet,
    renameWorksheet,
    deleteWorksheet,
    closeWorksheet,
    getViewport,
    getFunctions,
    getInputs,
  };
}
