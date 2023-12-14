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
  removeLastProjectHistoryElement,
  UndoRedoHistoryState,
} from '../services';
import { ProjectContext } from './ProjectContext';

type UndoRedoActions = {
  undo: (undoIndex?: number) => void;

  redo: () => void;

  append: (name: string, dsl: string) => void;

  appendTo: (
    projectNameToAppend: string,
    sheetNameToAppend: string,
    name: string,
    dsl: string
  ) => void;

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
  const { projectName, sheetName, sheetContent, updateSheetContent } =
    useContext(ProjectContext);
  const [history, setHistory] = useState<UndoRedoHistoryState[]>([]);

  const [revertedIndex, setRevertedIndex] = useState<number | null>(0);

  const redo = useCallback(
    (explicitRevertedIndex?: number) => {
      if (!projectName || !sheetName) return;

      const currentHistory = getProjectHistory(projectName);

      setRevertedIndex((revertedIndex) => {
        if (revertedIndex === null) return null;

        const newRevertedIndex = explicitRevertedIndex ?? revertedIndex + 1;

        if (newRevertedIndex >= currentHistory.length) return revertedIndex;

        const countChanges = currentHistory.length - newRevertedIndex - 2;
        const isPlural = countChanges > 1;

        if (countChanges === 0) {
          // Cancel redo, because there is no changes to redo
          const newLastHistoryElement =
            removeLastProjectHistoryElement(projectName);

          if (
            newLastHistoryElement &&
            sheetName === newLastHistoryElement.sheetName
          ) {
            updateSheetContent(sheetName, newLastHistoryElement.dsl);
          }

          setHistory(getProjectHistory(projectName));

          return null;
        }

        const title = getTitle(countChanges, newRevertedIndex, isPlural);
        const dsl = currentHistory[newRevertedIndex].dsl;
        const revertedSheetName = currentHistory[newRevertedIndex].sheetName;

        appendToProjectHistory(
          projectName,
          revertedSheetName,
          title,
          dsl,
          true
        );

        if (sheetName === revertedSheetName) {
          updateSheetContent(sheetName, dsl);
        }

        setHistory(getProjectHistory(projectName));

        return revertedIndex + 1;
      });
    },
    [projectName, sheetName, updateSheetContent]
  );

  const undo = useCallback(
    (undoIndex?: number) => {
      if (!projectName || !sheetName) return;

      const currentHistory = getProjectHistory(projectName);

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
          projectName,
          undoElement.sheetName,
          title,
          undoElement.dsl,
          revertedIndex !== null
        );

        setHistory(getProjectHistory(projectName));

        return newRevertedIndex;
      });
    },
    [projectName, redo, sheetName, updateSheetContent]
  );

  const clear = useCallback(() => {
    if (!projectName || !sheetName) return;

    setRevertedIndex(null);

    clearProjectHistory(projectName, sheetName, sheetContent ?? undefined);

    setHistory(getProjectHistory(projectName));
  }, [projectName, sheetName, sheetContent]);

  const append = useCallback(
    (title: string, dsl: string) => {
      if (!projectName || !sheetName) return;

      appendToProjectHistory(projectName, sheetName, title, dsl);

      setHistory(getProjectHistory(projectName));

      setRevertedIndex(null);
    },
    [projectName, sheetName]
  );

  const appendTo = useCallback(
    (
      projectNameToAppend: string,
      sheetNameToAppend: string,
      name: string,
      dsl: string
    ) => {
      appendToProjectHistory(projectNameToAppend, sheetNameToAppend, name, dsl);

      setHistory(getProjectHistory(projectNameToAppend));

      setRevertedIndex(null);
    },
    []
  );

  useEffect(() => {
    if (!projectName || !sheetName) {
      setHistory([]);

      return;
    }

    const history = getProjectHistory(projectName);

    if (history.length) {
      setHistory(history);
    } else {
      append('Local history start there', sheetContent ?? '');
    }
  }, [append, projectName, sheetContent, sheetName]);

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
