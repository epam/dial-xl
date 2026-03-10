import { useCallback, useContext } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'react-toastify';

import {
  defaultSheetName,
  disabledTooltips,
  ProjectState,
} from '@frontend/common';

import { ChatOverlayContext, ProjectContext } from '../context';
import { createUniqueName, EventBusMessages } from '../services';
import { useChangeNameModalStore, useDeleteModalStore } from '../store';
import {
  displayToast,
  getProjectNavigateUrl,
  updateSheetInProject,
} from '../utils';
import useEventBus from './useEventBus';

export function useWorksheetActions() {
  const {
    projectName,
    projectPath,
    projectBucket,
    sheetName,
    projectSheets,
    projectState,
    openSheet,
    resetSheetState,
    updateProjectOnServer,
    setCurrentSheetName,
    isTemporaryState,
    isTemporaryStateEditable,
    isProjectEditable,
  } = useContext(ProjectContext);
  const { answerIsGenerating } = useContext(ChatOverlayContext);
  const navigate = useNavigate();

  const eventBus = useEventBus<EventBusMessages>();

  const renameSheet = useCallback(
    async ({
      oldName,
      newName,
      silent,
    }: {
      oldName: string;
      newName?: string;
      silent?: boolean;
    }) => {
      if (!projectBucket || !projectName || !projectState) return;

      if (isTemporaryState && !isTemporaryStateEditable) {
        toast.info(
          'Cannot update project due to you have pending AI changes or you are in Preview changes mode',
        );

        return;
      }

      if (answerIsGenerating) {
        toast.info(
          'Cannot update project due to you have AI generating answer',
        );

        return;
      }

      if (!isProjectEditable) {
        toast.info(disabledTooltips.readonlyProject);

        return;
      }

      let newSheetName = newName;

      if (!silent) {
        const open = useChangeNameModalStore.getState().open;

        const result = await open({
          kind: 'renameSheet',
          initialName: oldName,
          validate: (name) => {
            if (!name) return 'Sheet name is required';
            if (projectSheets?.some((s) => s.sheetName === name))
              return 'A worksheet with this name already exists.';

            return;
          },
        });

        if (!result) return; // User cancelled - exit early
        newSheetName = result; // Use modal result and continue
      }

      if (!newSheetName) {
        newSheetName = createUniqueName(
          defaultSheetName,
          projectSheets?.map((sheet) => sheet.sheetName) ?? [],
        );
      }

      const oldSheetContent = projectState.sheets.find(
        (sheet) => sheet.sheetName === oldName,
      )?.content;

      const sheetWithSameNewName = projectState.sheets.find(
        (sheet) => sheet.sheetName === newSheetName,
      );

      if (sheetWithSameNewName) {
        displayToast('error', `A worksheet with this name already exists.`);

        return;
      }

      const newProjectStateRequest: ProjectState = updateSheetInProject(
        projectState,
        oldName,
        {
          sheetName: newSheetName,
        },
      );
      await updateProjectOnServer(newProjectStateRequest, {
        isTemporaryState,
        onSuccess: () => {
          if (!projectState) return;

          setCurrentSheetName(newSheetName);

          navigate(
            getProjectNavigateUrl({
              projectName,
              projectBucket,
              projectPath,
              projectSheetName: newSheetName,
            }),
            {
              replace: true,
            },
          );

          // We don't have access to UndoRedoContext in a higher context
          eventBus.publish({
            topic: 'AppendToHistory',
            payload: {
              historyTitle: `Rename sheet "${oldName}" to "${newSheetName}"`,
              changes: [
                {
                  sheetName: oldName,
                  content: undefined,
                },
                {
                  sheetName: newSheetName,
                  content: oldSheetContent ?? '',
                },
              ],
            },
          });
        },
        onFail: () => {
          displayToast('error', `Renaming sheet to "${newSheetName}" failed`);
        },
      });
    },
    [
      projectBucket,
      projectName,
      projectState,
      isTemporaryState,
      isTemporaryStateEditable,
      answerIsGenerating,
      isProjectEditable,
      updateProjectOnServer,
      projectSheets,
      setCurrentSheetName,
      navigate,
      projectPath,
      eventBus,
    ],
  );

  const createSheet = useCallback(
    async ({
      newName,
      silent,
    }: { newName?: string; silent?: boolean } = {}) => {
      if (isTemporaryState && !isTemporaryStateEditable) {
        toast.info(
          'Cannot update project due to you have pending AI changes or you are in Preview changes mode',
        );

        return;
      }

      if (answerIsGenerating) {
        toast.info(
          'Cannot update project due to you have AI generating answer',
        );

        return;
      }

      if (!isProjectEditable) {
        toast.info(disabledTooltips.readonlyProject);

        return;
      }

      let newSheetName = newName;

      if (!silent) {
        const initialName = createUniqueName(
          defaultSheetName,
          (projectSheets || []).map(({ sheetName }) => sheetName),
        );

        const open = useChangeNameModalStore.getState().open;

        const result = await open({
          kind: 'createSheet',
          initialName,
          validate: (name) => {
            if (!name) return 'Sheet name is required';
            if (projectSheets?.some((s) => s.sheetName === name))
              return 'A worksheet with this name already exists.';

            return;
          },
        });

        if (!result) return; // User cancelled - exit early
        newSheetName = result; // Use modal result and continue
      }

      if (!projectState || !projectName) return;

      if (!newSheetName) {
        newSheetName = createUniqueName(
          defaultSheetName,
          projectSheets?.map((sheet) => sheet.sheetName) ?? [],
        );
      }

      const sheetWithSameNewName = projectState.sheets.find(
        (sheet) => sheet.sheetName === newSheetName,
      );

      if (sheetWithSameNewName) {
        displayToast(
          'error',
          `Sheet with same name "${newName}" already exists in project`,
        );

        return;
      }

      const newProjectStateRequest: ProjectState = {
        ...projectState,
        sheets: projectState.sheets.concat([
          {
            content: '',
            sheetName: newSheetName,
            projectName,
          },
        ]),
      };
      await updateProjectOnServer(newProjectStateRequest, {
        isTemporaryState,
        onSuccess: () => {
          // We don't have access to UndoRedoContext in a higher context
          eventBus.publish({
            topic: 'AppendToHistory',
            payload: {
              historyTitle: `Create sheet "${newSheetName}"`,
              changes: [
                {
                  sheetName: newSheetName,
                  content: '',
                },
              ],
            },
          });

          openSheet({ sheetName: newSheetName });
        },
        onFail: () => {
          displayToast('error', `Creating new sheet "${newSheetName}" failed`);
        },
      });
    },
    [
      isTemporaryState,
      isTemporaryStateEditable,
      answerIsGenerating,
      isProjectEditable,
      projectState,
      projectName,
      updateProjectOnServer,
      projectSheets,
      eventBus,
      openSheet,
    ],
  );

  const deleteSheet = useCallback(
    async ({
      sheetNameToDelete,
      silent,
    }: {
      sheetNameToDelete: string;
      silent?: boolean;
    }) => {
      if (isTemporaryState && !isTemporaryStateEditable) {
        toast.info(
          'Cannot update project due to you have pending AI changes or you are in Preview changes mode',
        );

        return;
      }

      if (answerIsGenerating) {
        toast.info(
          'Cannot update project due to you have AI generating answer',
        );

        return;
      }

      if (!isProjectEditable) {
        toast.info(disabledTooltips.readonlyProject);

        return;
      }

      if (!silent) {
        const open = useDeleteModalStore.getState().open;

        const result = await open({
          contentText: `Do you want to remove sheet ${sheetNameToDelete}?`,
        });

        if (!result) return; // User cancelled - exit early
        // User confirmed - continue with deletion
      }

      if (!projectState) return;

      const newProjectStateRequest: ProjectState = {
        ...projectState,
        sheets: projectState.sheets.filter(
          (sheet) => sheet.sheetName !== sheetNameToDelete,
        ),
      };
      await updateProjectOnServer(newProjectStateRequest, {
        isTemporaryState,
        onSuccess: () => {
          if (sheetNameToDelete === sheetName) {
            resetSheetState();

            const newSheet = newProjectStateRequest.sheets[0]?.sheetName;
            if (newSheet) {
              openSheet({ sheetName: newSheet });
            }
          }

          // We don't have access to UndoRedoContext in a higher context
          eventBus.publish({
            topic: 'AppendToHistory',
            payload: {
              historyTitle: `Delete sheet "${sheetName}"`,
              changes: [{ sheetName: sheetNameToDelete, content: undefined }],
            },
          });
        },
        onFail: () => {
          displayToast('error', `Deleting sheet "${sheetName}" failed`);
        },
      });
    },
    [
      isTemporaryState,
      isTemporaryStateEditable,
      answerIsGenerating,
      isProjectEditable,
      projectState,
      updateProjectOnServer,
      sheetName,
      eventBus,
      resetSheetState,
      openSheet,
    ],
  );

  const renameWorksheetAction = useCallback(
    (worksheetName = sheetName) => {
      if (worksheetName) {
        renameSheet({ oldName: worksheetName });
      }
    },
    [renameSheet, sheetName],
  );

  const createWorksheetAction = useCallback(() => {
    createSheet();
  }, [createSheet]);

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
        deleteSheet({ sheetNameToDelete: worksheetName });
      }
    },
    [sheetName, projectSheets, projectName, deleteSheet],
  );

  return {
    deleteWorksheetAction,
    createWorksheetAction,
    renameWorksheetAction,
  };
}
