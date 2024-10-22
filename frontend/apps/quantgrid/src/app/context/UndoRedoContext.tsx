import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import {
  appendToProjectHistory,
  clearProjectHistory,
  getProjectHistory,
  initialHistoryTitle,
  removeLastProjectHistoryElement,
  UndoRedoHistoryState,
} from '../services';
import { ProjectContext } from './ProjectContext';

type UndoRedoActions = {
  undo: (undoIndex?: number) => void;

  redo: () => void;

  append: (name: string, dsl: string) => void;

  appendTo: (sheetNameToAppend: string, name: string, dsl: string) => void;

  clear: () => void;
};

type UndoRedoValues = {
  history: UndoRedoHistoryState[];
  revertedIndex: number | null;
};

export const UndoRedoContext = createContext<UndoRedoActions & UndoRedoValues>(
  {} as UndoRedoActions & UndoRedoValues
);

export function UndoRedoProvider({ children }: PropsWithChildren) {
  const {
    projectName,
    projectPath,
    projectBucket,
    sheetName,
    sheetContent,
    updateSheetContent,
    isAIPendingChanges,
  } = useContext(ProjectContext);
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

          if (
            newLastHistoryElement &&
            sheetName === newLastHistoryElement.sheetName
          ) {
            updateSheetContent(sheetName, newLastHistoryElement.dsl);
          }

          setHistory(
            getProjectHistory(projectName, projectBucket, projectPath)
          );

          return null;
        }

        const title = getTitle(countChanges, newRevertedIndex, isPlural);
        const dsl = currentHistory[newRevertedIndex].dsl;
        const revertedSheetName = currentHistory[newRevertedIndex].sheetName;

        appendToProjectHistory(
          revertedSheetName,
          title,
          dsl,
          projectName,
          projectBucket,
          projectPath,
          true
        );

        if (sheetName === revertedSheetName) {
          updateSheetContent(sheetName, dsl);
        }

        setHistory(getProjectHistory(projectName, projectBucket, projectPath));

        return revertedIndex + 1;
      });
    },
    [
      isAIPendingChanges,
      projectBucket,
      projectName,
      projectPath,
      sheetName,
      updateSheetContent,
    ]
  );

  const undo = useCallback(
    (undoIndex?: number) => {
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

        if (newRevertedIndex < 0) return revertedIndex;

        const undoElement = currentHistory[newRevertedIndex];

        if (sheetName === undoElement.sheetName) {
          updateSheetContent(sheetName, currentHistory[newRevertedIndex].dsl);
        }

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

        appendToProjectHistory(
          undoElement.sheetName,
          title,
          undoElement.dsl,
          projectName,
          projectBucket,
          projectPath,
          revertedIndex !== null
        );

        setHistory(getProjectHistory(projectName, projectBucket, projectPath));

        return newRevertedIndex;
      });
    },
    [
      projectBucket,
      projectName,
      projectPath,
      redo,
      sheetName,
      updateSheetContent,
    ]
  );

  const clear = useCallback(() => {
    if (!projectName || !projectBucket || !sheetName) return;

    setRevertedIndex(null);

    clearProjectHistory(
      sheetName,
      projectName,
      projectBucket,
      projectPath,
      sheetContent ?? undefined
    );

    setHistory(getProjectHistory(projectName, projectBucket, projectPath));
  }, [projectName, projectBucket, sheetName, sheetContent, projectPath]);

  const append = useCallback(
    (title: string, dsl: string) => {
      if (!projectName || !projectBucket || !sheetName) return;

      appendToProjectHistory(
        sheetName,
        title,
        dsl,
        projectName,
        projectBucket,
        projectPath
      );

      setHistory(getProjectHistory(projectName, projectBucket, projectPath));

      setRevertedIndex(null);
    },
    [projectBucket, projectName, projectPath, sheetName]
  );

  const appendTo = useCallback(
    (sheetNameToAppend: string, name: string, dsl: string) => {
      if (!projectName || !projectBucket) return;

      appendToProjectHistory(
        sheetNameToAppend,
        name,
        dsl,
        projectName,
        projectBucket,
        projectPath
      );

      setHistory(getProjectHistory(projectName, projectBucket, projectPath));

      setRevertedIndex(null);
    },
    [projectBucket, projectName, projectPath]
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
      append(initialHistoryTitle, sheetContent ?? '');
    }
  }, [
    append,
    projectBucket,
    projectName,
    projectPath,
    sheetContent,
    sheetName,
  ]);

  useEffect(() => {
    setRevertedIndex(null);
  }, [projectName]);

  return (
    <UndoRedoContext.Provider
      value={{ append, appendTo, undo, history, redo, revertedIndex, clear }}
    >
      {children}
    </UndoRedoContext.Provider>
  );
}

function getTitle(
  countChanges: number,
  newRevertedIndex: number,
  isPlural: boolean
) {
  return `Undo ${countChanges} change${
    isPlural ? 's' : ''
  } (reverted to [${newRevertedIndex}] change)`;
}
