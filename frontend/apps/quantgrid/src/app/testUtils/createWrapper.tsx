import { PropsWithChildren } from 'react';

import { WorksheetState } from '@frontend/common';
import { ParsedSheet, ParsedSheets } from '@frontend/parser';
import { Grid } from '@frontend/spreadsheet';

import {
  ApiContext,
  AppSpreadsheetInteractionContext,
  ProjectContext,
  SpreadsheetContext,
  UndoRedoContext,
} from '../context';

type Props = {
  appendFn?: () => void;
  appendToFn?: () => void;
  sendFn?: () => void;
  updateSheetContent?: () => Promise<boolean | undefined>;
  manuallyUpdateSheetContent?: () => Promise<boolean | undefined>;
  sheetContent?: string;
  parsedSheet?: ParsedSheet | null;
  parsedSheets?: ParsedSheets;
  projectName?: string;
  sheetName?: string;
  projectSheets?: WorksheetState[] | null;
  gridApi?: Partial<Grid> | null;
};

function emptyFn() {
  return;
}

export function createWrapper({
  appendFn = emptyFn,
  appendToFn = emptyFn,
  updateSheetContent = () => new Promise((): boolean => false),
  manuallyUpdateSheetContent = () => new Promise((): boolean => false),
  sendFn = emptyFn,
  sheetContent = '',
  parsedSheet = null,
  parsedSheets = {},
  projectName = '',
  sheetName = '',
  projectSheets = null,
  gridApi = null,
}: Props) {
  return ({ children }: PropsWithChildren<unknown>) => (
    <ApiContext.Provider
      value={{
        userBucket: 'SomeBucket',
        userRoles: [],
        isAdmin: false,
      }}
    >
      <ProjectContext.Provider
        value={{
          projectName,
          projectSheets,
          projectVersion: '',
          projectBucket: '',
          projectPath: '',
          projectPermissions: [],

          projects: [],

          sheetName,
          sheetContent,
          sheetErrors: [],
          compilationErrors: [],
          runtimeErrors: [],

          parsedSheet,
          parsedSheets,

          selectedCell: null,

          functions: [],

          isAIPendingChanges: false,
          updateIsAIPendingChanges: () => {},
          isAIPendingBanner: false,
          updateIsAIPendingBanner: () => {},
          tablesDiffData: {},

          openProject: () => {},
          closeCurrentProject: () => {},
          createProject: () => {},
          deleteProject: () => {},
          deleteCurrentProject: () => {},
          renameCurrentProject: () => {},
          cloneCurrentProject: () => {},

          acceptShareProject: () => {},
          acceptShareFiles: () => {},
          shareResources: () => {},

          openSheet: () => {},
          createSheet: () => {},
          renameSheet: () => {},
          deleteSheet: () => {},

          updateSheetContent,
          manuallyUpdateSheetContent,

          openStatusModal: () => {},

          updateSelectedCell: () => {},

          getDimensionalSchema: () => {},
          getFunctions: () => {},
          getCurrentProjectViewport: () => {},
          getProjects: () => {},
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
              onSpreadsheetMount: () => {},
              gridService: null,
              gridApi: gridApi as Grid,
            }}
          >
            <AppSpreadsheetInteractionContext.Provider
              value={{
                openField: () => {},
                openTable: () => {},
              }}
            >
              {children}
            </AppSpreadsheetInteractionContext.Provider>
          </SpreadsheetContext.Provider>
        </UndoRedoContext.Provider>
      </ProjectContext.Provider>
    </ApiContext.Provider>
  );
}
