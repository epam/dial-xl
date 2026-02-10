import {
  Dispatch,
  MutableRefObject,
  SetStateAction,
  useCallback,
  useContext,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import {
  disabledTooltips,
  DslSheetChange,
  ProjectAIResponseId,
} from '@frontend/common';
import { ParsedSheet } from '@frontend/parser';

import { ProjectResourceContext, ViewportContext } from '../../context';
import {
  addRecentProject,
  autoRenameFields,
  autoRenameTables,
  EventBusMessages,
} from '../../services';
import {
  getProjectNavigateUrl,
  updateAIResponseIds,
  updateProjectSheets,
} from '../../utils';
import useEventBus from '../useEventBus';

type Props = {
  setCurrentSheetName: Dispatch<SetStateAction<string | null>>;
  setParsedSheet: Dispatch<SetStateAction<ParsedSheet | null>>;
  cancelAllViewportRequests: () => void;
  currentSheetNameRef: MutableRefObject<string | null>;
  isProjectEditable: boolean;
  isTemporaryStateRef: MutableRefObject<boolean>;
  isTemporaryStateEditableRef: MutableRefObject<boolean>;
};

export function useSheetNavigation({
  isProjectEditable,
  cancelAllViewportRequests,
  currentSheetNameRef,
  setParsedSheet,
  setCurrentSheetName,
  isTemporaryStateRef,
  isTemporaryStateEditableRef,
}: Props) {
  const { clearTablesData } = useContext(ViewportContext);
  const { _projectState, updateProjectOnServer, setProjectState } = useContext(
    ProjectResourceContext
  );
  const navigate = useNavigate();
  const eventBus = useEventBus<EventBusMessages>();

  const updateSheetContent = useCallback(
    async (
      changedSheets: DslSheetChange[],
      {
        sendPutWorksheet = true,
        responseIds,
      }: {
        sendPutWorksheet?: boolean;
        responseIds?: ProjectAIResponseId[];
      } = {}
    ): Promise<boolean | undefined> => {
      const projectStateRef = _projectState.current;
      if (!projectStateRef?.projectName) return;

      const sheets = updateProjectSheets(
        changedSheets,
        projectStateRef.sheets,
        projectStateRef.projectName
      );

      const currentSheet = sheets.find(
        (sheet) => sheet.sheetName === currentSheetNameRef.current
      );
      if (!currentSheet) {
        setCurrentSheetName(sheets[0]?.sheetName);
      }

      const settings = updateAIResponseIds(projectStateRef, responseIds);
      const newProjectStateRequest = { ...projectStateRef, sheets, settings };

      if (!sendPutWorksheet) {
        setProjectState(newProjectStateRequest);

        return true;
      }

      if (sendPutWorksheet) {
        return new Promise<boolean | undefined>((resolve) => {
          updateProjectOnServer(newProjectStateRequest, {
            isTemporaryState: isTemporaryStateRef.current,
            onSuccess: () => resolve(true),
            onFail: () => resolve(undefined),
          });
        });
      }

      return;
    },
    [
      _projectState,
      currentSheetNameRef,
      setCurrentSheetName,
      setProjectState,
      updateProjectOnServer,
      isTemporaryStateRef,
    ]
  );

  const manuallyUpdateSheetContent = useCallback(
    async (
      changeItems: DslSheetChange[],
      sendPutWorksheet = true
    ): Promise<boolean | undefined> => {
      const projectState = _projectState.current;
      if (!projectState) return;

      if (isTemporaryStateRef.current && !isTemporaryStateEditableRef.current) {
        toast.info(
          'Cannot update project due to you have pending AI changes or you are in Preview changes mode'
        );

        return;
      }

      if (!isProjectEditable) {
        toast.info(disabledTooltips.readonlyProject);

        return;
      }

      return updateSheetContent(changeItems, { sendPutWorksheet });
    },
    [
      _projectState,
      isProjectEditable,
      isTemporaryStateEditableRef,
      isTemporaryStateRef,
      updateSheetContent,
    ]
  );

  const openSheet = useCallback(
    ({ sheetName }: { sheetName: string }) => {
      if (sheetName === currentSheetNameRef.current || !sheetName) return;

      cancelAllViewportRequests();

      clearTablesData();

      const projectState = _projectState.current;
      if (!projectState) {
        return;
      }

      let resultedSheetContent = projectState.sheets.find(
        (sheet) => sheet.sheetName === sheetName
      )?.content;
      let resultedSheetName = sheetName;

      if (resultedSheetContent == null) {
        resultedSheetContent = projectState.sheets[0].content;
        resultedSheetName = projectState.sheets[0].sheetName;

        if (!resultedSheetContent) {
          // eslint-disable-next-line no-console
          console.warn(
            'Redirect to home because sheet content not exists when opening sheet'
          );
          eventBus.publish({
            topic: 'CloseCurrentProject',
          });

          return;
        }
      }

      setCurrentSheetName(resultedSheetName);
      setParsedSheet(null);
      navigate(
        getProjectNavigateUrl({
          projectName: projectState.projectName,
          projectBucket: projectState.bucket,
          projectPath: projectState.path,
          projectSheetName: resultedSheetName,
        }),
        { replace: true }
      );

      return { resultedSheetContent, resultedSheetName };
    },
    [
      _projectState,
      cancelAllViewportRequests,
      clearTablesData,
      currentSheetNameRef,
      navigate,
      setCurrentSheetName,
      setParsedSheet,
      eventBus,
    ]
  );

  const initialOpenSheet = useCallback(
    async ({ sheetName }: { sheetName: string }) => {
      const results = openSheet({ sheetName });

      if (!results) return;
      if (!_projectState.current) return;

      const { resultedSheetContent, resultedSheetName } = results;
      addRecentProject(
        resultedSheetName,
        _projectState.current.projectName,
        _projectState.current.bucket,
        _projectState.current.path
      );
      updateSheetContent(
        [{ sheetName: resultedSheetName, content: resultedSheetContent }],
        {
          sendPutWorksheet: false,
        }
      );

      if (!_projectState.current.sheets || !isProjectEditable) return;
      let updatedSheetContent = autoRenameTables(
        resultedSheetContent,
        resultedSheetName,
        _projectState.current.sheets
      );

      if (resultedSheetContent === updatedSheetContent) return;

      updatedSheetContent = autoRenameFields(updatedSheetContent);
      updateSheetContent([
        { sheetName: resultedSheetName, content: updatedSheetContent },
      ]);
    },
    [_projectState, isProjectEditable, openSheet, updateSheetContent]
  );

  return {
    initialOpenSheet,
    openSheet,
    updateSheetContent,
    manuallyUpdateSheetContent,
  };
}
