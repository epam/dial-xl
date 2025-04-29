import React, {
  createContext,
  createRef,
  PropsWithChildren,
  useState,
} from 'react';

import { GridApi } from '@frontend/canvas-spreadsheet';
import { WorksheetState } from '@frontend/common';
import { SheetReader } from '@frontend/parser';

import {
  ApiContext,
  AppSpreadsheetInteractionContext,
  CanvasSpreadsheetContext,
  ProjectContext,
  UndoRedoContext,
  ViewGridData,
  ViewportContext,
} from '../../../context';
import { TestWrapperProps } from './types';

export const DslContext = createContext<{
  dsl: string;
  setDsl: (dsl: string) => void;
} | null>(null);

export function createWrapper({
  appendToFn = () => {},
  updateSheetContent = () => new Promise((): boolean => false),
  manuallyUpdateSheetContent = () => new Promise((): boolean => false),
  parsedSheet = null,
  parsedSheets = {},
  projectName = '',
  sheetName = '',
  projectSheets = [],
  gridApi = null,
  viewGridData = new ViewGridData(),
}: TestWrapperProps) {
  return ({ children }: PropsWithChildren<unknown>) => {
    const [dsl, setDsl] = useState('');
    const updatedProjectSheets: WorksheetState[] = projectSheets;

    if (sheetName && projectName) {
      parsedSheets[sheetName] = SheetReader.parseSheet(dsl);
      parsedSheet = parsedSheets[sheetName];
      const worksheetState: WorksheetState = {
        sheetName: sheetName,
        projectName: projectName,
        content: dsl,
      };
      updatedProjectSheets.push(worksheetState);
    }

    const mockGridApiRef = createRef<GridApi>();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    mockGridApiRef.current = gridApi;

    return (
      <DslContext.Provider value={{ dsl, setDsl }}>
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
                projectSheets: updatedProjectSheets,
                projectVersion: '',
                projectBucket: '',
                projectPath: '',
                projectPermissions: [],
                isProjectEditable: true,

                projects: [],

                sheetName,
                sheetContent: dsl,
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
      </DslContext.Provider>
    );
  };
}
