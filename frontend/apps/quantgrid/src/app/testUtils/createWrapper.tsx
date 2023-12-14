import { PropsWithChildren } from 'react';

import { ParsedSheets, WorksheetState } from '@frontend/common';
import { ParsedSheet } from '@frontend/parser';

import {
  ApiContext,
  ProjectContext,
  SpreadsheetContext,
  UndoRedoContext,
} from '../context';

type Props = {
  appendFn?: () => void;
  appendToFn?: () => void;
  sendFn?: () => void;
  updateSheetContent?: () => void;
  manuallyUpdateSheetContent?: () => void;
  sheetContent?: string;
  parsedSheet?: ParsedSheet | null;
  parsedSheets?: ParsedSheets;
  projectName?: string;
  sheetName?: string;
  projectSheets?: WorksheetState[] | null;
};

function emptyFn() {
  return;
}

export function createWrapper({
  appendFn = emptyFn,
  appendToFn = emptyFn,
  updateSheetContent = emptyFn,
  manuallyUpdateSheetContent = emptyFn,
  sendFn = emptyFn,
  sheetContent = '',
  parsedSheet = null,
  parsedSheets = {},
  projectName = '',
  sheetName = '',
  projectSheets = null,
}: Props) {
  return ({ children }: PropsWithChildren<unknown>) => (
    <ApiContext.Provider
      value={{
        addRequestId: () => {},
        removeRequestId: () => {},
        findByRequestId: () => null,
        isConnectionOpened: true,
        switchConnectionStatus: () => {},
        sendMessage: () => {},
        projectVersionRef: { current: 1 },
        send: sendFn,
      }}
    >
      <ProjectContext.Provider
        value={{
          functions: [],
          projects: [],
          projectName,
          projectSheets,
          sheetName,
          sheetContent,
          sheetErrors: [],
          compilationErrors: [],

          selectedCell: null,
          updateSelectedCell: () => {},

          parsedSheet,
          parsedSheets,

          updateSheetContent,
          manuallyUpdateSheetContent,

          createProject: () => {},
          openProject: () => {},
          deleteProject: () => {},
          newSheet: () => {},
          renameProject: () => {},
          renameSheet: () => {},
          openStatusModal: () => {},

          updateProjectList: () => {},

          onCreateProjectResponse: () => {},
          onOpenProjectResponse: () => {},
          onProjectDeleteResponse: () => {},
          onRenameProjectResponse: () => {},
          onCloseProjectResponse: () => {},

          onPutSheetResponse: () => {},
          onOpenSheetResponse: () => {},
          onDeleteSheetResponse: () => {},
          onRenameSheetResponse: () => {},
          onCloseSheetResponse: () => {},

          onParallelRenameSheetResponse: () => {},
          onParallelRenameProjectResponse: () => {},
          onParallelUpdateProject: () => {},
          onParallelUpdateWorksheet: () => {},

          onFunctionsResponse: () => {},

          onReconnect: () => {},
        }}
      >
        <UndoRedoContext.Provider
          value={{
            append: appendFn,
            appendTo: appendToFn,
            undo: () => {},
            history: [],
            redo: () => {},
            revertedIndex: null,
            clear: () => {},
          }}
        >
          <SpreadsheetContext.Provider
            value={{
              openField: () => {},
              openTable: () => {},
              onSpreadsheetMount: () => {},
              gridService: null,
              gridApi: null,
            }}
          >
            {children}
          </SpreadsheetContext.Provider>
        </UndoRedoContext.Provider>
      </ProjectContext.Provider>
    </ApiContext.Provider>
  );
}
