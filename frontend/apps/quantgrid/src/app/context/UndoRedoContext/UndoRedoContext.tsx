import { createContext } from 'react';

import { UndoRedoHistoryState } from '../../services';

type UndoRedoActions = {
  undo: (args?: { undoIndex?: number; skipPut?: boolean }) => void;

  redo: () => void;

  appendTo: (
    historyTitle: string,
    changedSheets: { sheetName: string; content: string | undefined }[]
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
