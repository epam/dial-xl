import { createRef, PropsWithChildren } from 'react';

import { GridApi } from '@frontend/canvas-spreadsheet';
import { WorksheetState } from '@frontend/common';
import { ParsedSheet, ParsedSheets } from '@frontend/parser';

import {
  ApiContext,
  AppSpreadsheetInteractionContext,
  CanvasSpreadsheetContext,
  ProjectContext,
  UndoRedoContext,
  ViewGridData,
  ViewportContext,
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
  gridApi?: Partial<GridApi> | null;
  viewGridData?: ViewGridData;
};

function emptyFn() {
  return;
}

export function createWrapper({
  appendToFn = emptyFn,
  updateSheetContent = () => new Promise((): boolean => false),
  manuallyUpdateSheetContent = () => new Promise((): boolean => false),
  sheetContent = '',
  parsedSheet = null,
  parsedSheets = {},
  projectName = '',
  sheetName = '',
  projectSheets = null,
  gridApi = null,
  viewGridData = new ViewGridData(),
}: Props) {
  const mockGridApiRef = createRef<GridApi>();
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  mockGridApiRef.current = gridApi;

  return ({ children }: PropsWithChildren<unknown>) => (
    <ApiContext.Provider
      value={{
        userBucket: 'SomeBucket',
        userRoles: [],
        isAdmin: false,
      }}
    >
      <ViewportContext.Provider
        value={{
          viewGridData,
          clearTablesData: () => {},
          onColumnDataResponse: () => {},
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
            isProjectEditable: true,

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

            isOverrideProjectBanner: false,
            setIsOverrideProjectBanner: () => {},
            resolveConflictUsingLocalChanges: () => {},
            resolveConflictUsingServerChanges: () => {},

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

            getFunctions: () => {},
            getCurrentProjectViewport: () => {},
            getVirtualProjectViewport: () => {},
            getProjects: () => {},
          }}
        >
          <UndoRedoContext.Provider
            value={{
              appendTo: appendToFn,
              undo: () => {},
              history: [],
              redo: () => {},
              revertedIndex: null,
              clear: () => {},
            }}
          >
            <CanvasSpreadsheetContext.Provider value={mockGridApiRef}>
              <AppSpreadsheetInteractionContext.Provider
                value={{
                  openField: () => {},
                  openTable: () => {},
                  openCellEditor: () => {},
                  autoCleanUpTable: () => {},
                }}
              >
                {children}
              </AppSpreadsheetInteractionContext.Provider>
            </CanvasSpreadsheetContext.Provider>
          </UndoRedoContext.Provider>
        </ProjectContext.Provider>
      </ViewportContext.Provider>
    </ApiContext.Provider>
  );
}
