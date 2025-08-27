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
    const updatedProjectSheets: WorksheetState[] = [...projectSheets];

    if (projectSheets.length > 0) {
      for (let i = 0; i < projectSheets.length; i++) {
        const sheet = projectSheets[i];
        parsedSheets[sheet.sheetName] = SheetReader.parseSheet(sheet.content);

        if (
          !updatedProjectSheets.find((ws) => ws.sheetName === sheet.sheetName)
        ) {
          updatedProjectSheets.push(sheet);
        }
      }
    } else if (sheetName && projectName) {
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
              onProfileResponse: () => {},
              onIndexResponse: () => {},
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
                isProjectShareable: true,
                hasEditPermissions: true,

                isProjectChangedOnServerByUser: false,

                projects: [],

                sheetName,
                sheetContent: dsl,
                sheetErrors: [],
                compilationErrors: [],
                runtimeErrors: [],
                indexErrors: [],

                parsedSheet,
                parsedSheets,

                selectedCell: null,

                functions: [],

                forkedProject: null,

                beforeTemporaryState: null,
                startTemporaryState: () => {},
                isProjectReadonlyByUser: false,
                setIsProjectReadonlyByUser: () => {},
                resolveTemporaryState: () => {},
                setIsTemporaryStateEditable: () => {},
                diffData: null,
                setDiffData: () => {},
                isProjectEditingDisabled: false,
                setIsProjectEditingDisabled: () => {},

                isConflictResolving: false,
                initConflictResolving: () => {},
                resolveConflictUsingLocalChanges: () => {},
                resolveConflictUsingServerChanges: () => {},

                fieldInfos: [],
                responseIds: [],

                openProject: () => {},
                closeCurrentProject: () => {},
                createProject: () => {},
                deleteProject: () => {},
                deleteCurrentProject: () => {},
                renameCurrentProject: () => {},
                cloneCurrentProject: () => ({} as Promise<void>),

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
                longCalcStatus: null,
                setLongCalcStatus: () => {},
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
