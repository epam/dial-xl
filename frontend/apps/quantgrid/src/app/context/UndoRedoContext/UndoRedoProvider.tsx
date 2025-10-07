import {
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import useEventBus from '../../hooks/useEventBus';
import {
  appendToProjectHistory,
  clearProjectHistory,
  EventBusMessages,
  getProjectHistory,
  initialHistoryTitle,
  maxHistoryDepth,
  removeLastProjectHistoryElement,
  UndoRedoHistoryState,
} from '../../services';
import { ChatOverlayContext } from '../ChatOverlayContext';
import { ProjectContext } from '../ProjectContext';
import { UndoRedoContext } from './UndoRedoContext';

function getTitle(
  countChanges: number,
  newRevertedIndex: number,
  isPlural: boolean
) {
  return `Undo ${countChanges} change${
    isPlural ? 's' : ''
  } (reverted to [${newRevertedIndex}] change)`;
}

function combineSheetChanges(
  oldSheets: { sheetName: string; content: string | undefined }[],
  newSheets: { sheetName: string; content: string | undefined }[]
) {
  const changes = newSheets.concat(
    oldSheets
      .filter(
        ({ sheetName: exSheetName }) =>
          !newSheets.some(({ sheetName }) => sheetName === exSheetName)
      )
      .map(({ sheetName }) => ({ sheetName, content: undefined }))
  );

  return changes;
}

export function UndoRedoProvider({ children }: PropsWithChildren) {
  const {
    projectName,
    projectPath,
    projectBucket,
    sheetName,
    sheetContent,
    projectSheets,
    updateSheetContent,
  } = useContext(ProjectContext);
  const { isAIPendingChanges } = useContext(ChatOverlayContext);
  const eventBus = useEventBus<EventBusMessages>();
  const [history, setHistory] = useState<UndoRedoHistoryState[]>([]);

  const [revertedIndex, setRevertedIndex] = useState<number | null>(0);

  const redo = useCallback(
    (explicitRevertedIndex?: number) => {
      if (!projectName || !projectBucket || !sheetName || isAIPendingChanges)
        return;

      const currentHistory = getProjectHistory(
        projectName,
        projectBucket,
        projectPath
      );

      setRevertedIndex((revertedIndex) => {
        if (revertedIndex === null) return null;

        const newRevertedIndex = explicitRevertedIndex ?? revertedIndex + 1;

        if (newRevertedIndex >= currentHistory.length) return revertedIndex;

        const countChanges = currentHistory.length - newRevertedIndex - 2;
        const isPlural = countChanges > 1;

        if (countChanges === 0) {
          // Cancel redo, because there is no changes to redo
          const newLastHistoryElement = removeLastProjectHistoryElement(
            projectName,
            projectBucket,
            projectPath
          );

          if (newLastHistoryElement) {
            const updatedSheets = Object.entries(
              newLastHistoryElement.sheetsState
            ).map(([key, value]) => ({ sheetName: key, content: value }));
            const changes = combineSheetChanges(
              projectSheets ?? [],
              updatedSheets
            );

            updateSheetContent(changes);
          }

          setHistory(
            getProjectHistory(projectName, projectBucket, projectPath)
          );

          return null;
        }

        const title = getTitle(countChanges, newRevertedIndex, isPlural);
        const sheetsState = currentHistory[newRevertedIndex].sheetsState;

        appendToProjectHistory({
          title,
          sheetsState,
          projectName,
          bucket: projectBucket,
          path: projectPath,
          isUpdate: true,
        });
        const updatedSheets = Object.entries(sheetsState).map(
          ([key, value]) => ({ sheetName: key, content: value })
        );
        updateSheetContent(updatedSheets);

        setHistory(getProjectHistory(projectName, projectBucket, projectPath));

        return revertedIndex + 1;
      });
    },
    [
      isAIPendingChanges,
      projectBucket,
      projectName,
      projectPath,
      projectSheets,
      sheetName,
      updateSheetContent,
    ]
  );

  const undo = useCallback(
    ({
      undoIndex,
      skipPut,
    }: { undoIndex?: number; skipPut?: boolean } = {}) => {
      if (!projectName || !projectBucket || !sheetName) return;

      const currentHistory = getProjectHistory(
        projectName,
        projectBucket,
        projectPath
      );

      if (currentHistory.length < 2) return;

      setRevertedIndex((revertedIndex) => {
        const fallbackIndex = (revertedIndex ?? currentHistory.length - 1) - 1;

        const newRevertedIndex = undoIndex ?? fallbackIndex;
        const isNewItemOverflow = currentHistory.length === maxHistoryDepth;

        if (newRevertedIndex < 0) return revertedIndex;

        const undoElement = currentHistory[newRevertedIndex];

        const updatedSheets = Object.entries(undoElement.sheetsState).map(
          ([key, value]) => ({ sheetName: key, content: value })
        );
        const changes = combineSheetChanges(projectSheets ?? [], updatedSheets);

        updateSheetContent(changes, { sendPutWorksheet: !skipPut });

        const countChanges =
          currentHistory.length -
          newRevertedIndex -
          1 -
          (revertedIndex !== null ? 1 : 0);
        const isPlural = countChanges > 1;

        if (countChanges === 0) {
          redo(newRevertedIndex);

          return null;
        }

        const title = getTitle(countChanges, newRevertedIndex, isPlural);

        appendToProjectHistory({
          title,
          sheetsState: undoElement.sheetsState,
          projectName,
          bucket: projectBucket,
          path: projectPath,
          isUpdate: revertedIndex !== null,
        });

        setHistory(getProjectHistory(projectName, projectBucket, projectPath));

        return isNewItemOverflow && revertedIndex === null
          ? newRevertedIndex - 1
          : newRevertedIndex;
      });
    },
    [
      projectBucket,
      projectName,
      projectPath,
      projectSheets,
      redo,
      sheetName,
      updateSheetContent,
    ]
  );

  const clear = useCallback(() => {
    if (!projectName || !projectBucket || !sheetName) return;

    setRevertedIndex(null);

    const currentHistory = getProjectHistory(
      projectName,
      projectBucket,
      projectPath
    );

    clearProjectHistory(
      projectName,
      projectBucket,
      projectPath,
      currentHistory[currentHistory.length - 1].sheetsState ?? undefined
    );

    setHistory(getProjectHistory(projectName, projectBucket, projectPath));
  }, [projectName, projectBucket, sheetName, projectPath]);

  const appendTo = useCallback(
    (
      historyTitle: string,
      changedSheets: { sheetName: string; content: string | undefined }[]
    ) => {
      if (!projectName || !projectBucket) return;

      const sheets =
        projectSheets?.reduce((acc, current) => {
          const changedValue = changedSheets.find(
            ({ sheetName }) => sheetName === current.sheetName
          );
          if (!changedValue) {
            acc[current.sheetName] = current.content;
          } else if (changedValue.content != null) {
            acc[current.sheetName] = changedValue.content;
          }

          return acc;
        }, {} as Record<string, string>) ?? {};

      appendToProjectHistory({
        title: historyTitle,
        sheetsState: sheets,
        projectName,
        bucket: projectBucket,
        path: projectPath,
      });

      setHistory(getProjectHistory(projectName, projectBucket, projectPath));

      setRevertedIndex(null);
    },
    [projectBucket, projectName, projectPath, projectSheets]
  );

  useEffect(() => {
    if (!projectName || !projectBucket || !sheetName) {
      setHistory([]);

      return;
    }

    const history = getProjectHistory(projectName, projectBucket, projectPath);

    if (history.length) {
      setHistory(history);
    } else {
      appendTo(initialHistoryTitle, [
        { sheetName, content: sheetContent ?? '' },
      ]);
    }
  }, [
    appendTo,
    projectBucket,
    projectName,
    projectPath,
    sheetContent,
    sheetName,
  ]);

  useEffect(() => {
    setRevertedIndex(null);
  }, [projectName]);

  useEffect(() => {
    const subscription = eventBus.subscribe('AppendToHistory', (options) => {
      appendTo(options.historyTitle, options.changes);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [appendTo, eventBus]);

  return (
    <UndoRedoContext.Provider
      value={{ appendTo, undo, history, redo, revertedIndex, clear }}
    >
      {children}
    </UndoRedoContext.Provider>
  );
}
