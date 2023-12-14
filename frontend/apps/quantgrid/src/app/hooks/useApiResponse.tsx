import { useCallback, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import {
  ProjectState,
  ServerResponse,
  Status,
  WorksheetState,
} from '@frontend/common';

import { ApiAction } from '../common';
import {
  ApiContext,
  AppContext,
  InputsContext,
  ProjectContext,
  UndoRedoContext,
  ViewportContext,
} from '../context';
import {
  ApiResponseMessage,
  EventBusMessages,
  getDSLChangeText,
  getLastProjectHistoryDsl,
  saveRecentProject,
  saveRecentSheet,
} from '../services';
import { useDSLUtils } from './useDSLUtils';
import useEventBus from './useEventBus';

export function useApiResponse() {
  const eventBus = useEventBus<EventBusMessages>();
  const navigate = useNavigate();
  const { findByRequestId, projectVersionRef } = useContext(ApiContext);
  const { onInputListResponse } = useContext(InputsContext);
  const { hideLoading } = useContext(AppContext);
  const { onColumnDataResponse, clearCachedTableData, onChartKeysResponse } =
    useContext(ViewportContext);
  const { appendTo } = useContext(UndoRedoContext);
  const {
    projectSheets,

    onReconnect,
    updateProjectList,

    onCloseProjectResponse,
    onRenameProjectResponse,
    onOpenProjectResponse,
    onCreateProjectResponse,
    onProjectDeleteResponse,

    onPutSheetResponse,
    onOpenSheetResponse,
    onDeleteSheetResponse,
    onRenameSheetResponse,
    onCloseSheetResponse,

    onParallelUpdateProject,
    onParallelUpdateWorksheet,
    onParallelRenameProjectResponse,
    onParallelRenameSheetResponse,

    onFunctionsResponse,
  } = useContext(ProjectContext);
  const { isChartKeyField } = useDSLUtils();

  const onDataProjectStateResponse = useCallback(
    (projectState: ProjectState, action: ApiAction | null) => {
      if (action === ApiAction.createProject) {
        onCreateProjectResponse(projectState);

        return;
      }

      if (action === ApiAction.openProject) {
        onOpenProjectResponse(projectState);

        return;
      }

      if (action === ApiAction.deleteProject) {
        onProjectDeleteResponse(projectState);

        return;
      }

      if (action === ApiAction.closeProject) {
        onCloseProjectResponse(projectState);

        return;
      }
    },
    [
      onCloseProjectResponse,
      onCreateProjectResponse,
      onOpenProjectResponse,
      onProjectDeleteResponse,
    ]
  );

  const onWorksheetStateResponse = useCallback(
    (worksheetState: WorksheetState, action: ApiAction | null) => {
      if (action === ApiAction.putSheet) {
        onPutSheetResponse(worksheetState);

        return;
      }

      if (action === ApiAction.putAnotherSheet) {
        onParallelUpdateWorksheet(worksheetState);

        return;
      }

      if (action === ApiAction.openSheet) {
        onOpenSheetResponse(worksheetState);

        return;
      }

      if (action === ApiAction.deleteSheet) {
        onDeleteSheetResponse(worksheetState);

        return;
      }

      if (action === ApiAction.closeSheet) {
        onCloseSheetResponse(worksheetState);

        return;
      }
    },
    [
      onPutSheetResponse,
      onParallelUpdateWorksheet,
      onOpenSheetResponse,
      onDeleteSheetResponse,
      onCloseSheetResponse,
    ]
  );

  const handleParallelResponse = useCallback(
    (message: ApiResponseMessage) => {
      const data = JSON.parse(message.data);

      if (data.projectState) {
        onParallelUpdateProject(data.projectState);
        clearCachedTableData();
      }

      if (data.worksheetState) {
        const currentVersion = projectVersionRef.current;
        const newVersion = +data.worksheetState.version;
        const { worksheetState } = data;

        if (!currentVersion || newVersion > currentVersion) {
          const lastHistoryElement = getLastProjectHistoryDsl(
            worksheetState.projectName
          );

          if (lastHistoryElement !== data.worksheetState.content) {
            let historyTitle = 'DSL change';

            const findSheet = projectSheets?.find(
              (s) => s.sheetName === worksheetState.sheetName
            );

            if (findSheet) {
              historyTitle = getDSLChangeText(
                findSheet.content,
                worksheetState.content
              );
            }

            appendTo(
              worksheetState.projectName,
              worksheetState.sheetName,
              historyTitle,
              worksheetState.content
            );
          }
        }

        onParallelUpdateWorksheet(data.worksheetState);

        clearCachedTableData();
      }

      if (data.renameProjectResponse) {
        onParallelRenameProjectResponse(data.renameProjectResponse);
      }

      if (data.renameWorksheetResponse) {
        onParallelRenameSheetResponse(data.renameWorksheetResponse);
      }
    },
    [
      appendTo,
      clearCachedTableData,
      onParallelRenameProjectResponse,
      onParallelRenameSheetResponse,
      onParallelUpdateProject,
      onParallelUpdateWorksheet,
      projectVersionRef,
      projectSheets,
    ]
  );

  const handleResponse = useCallback(
    (message: ApiResponseMessage) => {
      const data: ServerResponse = JSON.parse(message.data);

      if (data.pong) return;

      const action = data.id ? findByRequestId(data.id, true) : null;
      const { status } = data;

      if (
        (status === Status.Failed ||
          status === Status.VersionConflict ||
          status === Status.NotFound) &&
        // we don't want to show errors which we collect after requesting all inputs in panel
        action !== ApiAction.panelInputsMetadata
      ) {
        hideLoading();
        toast.error(<p>{data.errorMessage}</p>, {
          toastId: 'ws-error',
        });

        if (data.status === Status.VersionConflict) {
          onReconnect();
        }

        if (
          data.status === Status.NotFound &&
          action === ApiAction.openProject
        ) {
          saveRecentProject('');
          saveRecentSheet('');
          navigate('/');
        }

        if (status === Status.NotFound && action === ApiAction.openSheet) {
          saveRecentSheet('');
        }

        return;
      }

      if (status === Status.Succeed) {
        if (data.projectState) {
          onDataProjectStateResponse(data.projectState, action);
        }

        if (data.worksheetState) {
          onWorksheetStateResponse(data.worksheetState, action);
        }

        if (data.renameProjectResponse) {
          if (action === ApiAction.renameProject) {
            onRenameProjectResponse(data.renameProjectResponse);
          } else {
            onParallelRenameProjectResponse(data.renameProjectResponse);
          }
        }

        if (data.renameWorksheetResponse) {
          if (action === ApiAction.renameSheet) {
            onRenameSheetResponse(data.renameWorksheetResponse);
          } else {
            onParallelRenameSheetResponse(data.renameWorksheetResponse);
          }
        }

        if (data.projectList?.projects) {
          updateProjectList(data.projectList.projects);
        }

        if (data?.inputList) {
          onInputListResponse(data.inputList);
        }

        if (data?.functionResponse) {
          onFunctionsResponse(data.functionResponse.functions);
        }

        if (data?.columnData) {
          onColumnDataResponse(data.columnData);

          const { tableName, columnName } = data.columnData;
          if (isChartKeyField(tableName, columnName)) {
            onChartKeysResponse(data.columnData);
          }
        }

        if (data?.dimensionalSchemaResponse) {
          eventBus.publish({
            topic: 'DimensionalSchemaResponse',
            payload: data.dimensionalSchemaResponse,
          });
        }

        return;
      }

      if (!status) {
        handleParallelResponse(message);
      }
    },
    [
      isChartKeyField,
      findByRequestId,
      hideLoading,
      onReconnect,
      onChartKeysResponse,
      onDataProjectStateResponse,
      onWorksheetStateResponse,
      onFunctionsResponse,
      onRenameProjectResponse,
      onParallelRenameProjectResponse,
      onRenameSheetResponse,
      onParallelRenameSheetResponse,
      updateProjectList,
      onInputListResponse,
      onColumnDataResponse,
      eventBus,
      navigate,
      handleParallelResponse,
    ]
  );

  useEffect(() => {
    const apiResponseListener = eventBus.subscribe(
      'ApiResponse',
      handleResponse
    );

    return () => {
      apiResponseListener.unsubscribe();
    };
  }, [eventBus, handleResponse]);
}
