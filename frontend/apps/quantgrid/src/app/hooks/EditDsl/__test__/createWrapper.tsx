import clone from 'clone';
import {
  createContext,
  createRef,
  PropsWithChildren,
  useMemo,
  useState,
} from 'react';
import { vi } from 'vitest';

import { GridApi } from '@frontend/canvas-spreadsheet';
import { WorksheetState } from '@frontend/common';
import { ParsedSheet, ParsedSheets, SheetReader } from '@frontend/parser';

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

export const initialProps: TestWrapperProps = {
  appendToFn: vi.fn(),
  manuallyUpdateSheetContent: vi.fn(() => Promise.resolve(true)),
  projectName: 'project1',
  sheetName: 'sheet1',
  __initialDsl: '',
};

export const DslContext = createContext<{
  dsl: string;
  setDsl: (dsl: string) => void;
} | null>(null);

const dslParseCache = new Map<string, ParsedSheet | null>();
const sheetContentParseCache = new Map<string, ParsedSheet | null>();

function getParsedForDsl(content: string): ParsedSheet | null {
  if (!dslParseCache.has(content)) {
    const parsed = SheetReader.parseSheet(content);
    dslParseCache.set(content, parsed);
  }
  const cached = dslParseCache.get(content);

  return cached ? clone(cached) : null;
}

function getParsedForSheet(name: string, content: string): ParsedSheet | null {
  const key = `${name}::${content}`;
  if (!sheetContentParseCache.has(key)) {
    const parsed = SheetReader.parseSheet(content);
    sheetContentParseCache.set(key, parsed);
  }
  const cached = sheetContentParseCache.get(key);

  return cached ? clone(cached) : null;
}

export function createWrapper({
  appendToFn = () => {},
  updateSheetContent = () => Promise.resolve(false),
  manuallyUpdateSheetContent = () => Promise.resolve(false),
  parsedSheet: parsedSheetProp = null,
  parsedSheets: parsedSheetsProp = {},
  projectName = '',
  sheetName = '',
  projectSheets = [],
  gridApi = null,
  viewGridData = new ViewGridData(),
  __initialDsl = '',
}: TestWrapperProps) {
  // eslint-disable-next-line react/display-name
  return ({ children }: PropsWithChildren<unknown>) => {
    const [dsl, setDsl] = useState(__initialDsl);

    const stableProjectSheets = useMemo<WorksheetState[]>(() => {
      if (projectSheets.length > 0) return projectSheets;
      if (sheetName && projectName) {
        return [{ sheetName, projectName, content: dsl }];
      }

      return [];
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectSheets, sheetName, projectName, dsl]);

    const { parsedSheet, parsedSheets } = useMemo(
      (): {
        parsedSheet: ParsedSheet | null;
        parsedSheets: ParsedSheets;
      } => {
        if (projectSheets.length > 0 && stableProjectSheets.length > 0) {
          const nextParsed: ParsedSheets = { ...parsedSheetsProp };
          for (const sheet of stableProjectSheets) {
            const parsed = getParsedForSheet(sheet.sheetName, sheet.content);
            if (parsed) {
              nextParsed[sheet.sheetName] = parsed;
            }
          }

          return { parsedSheet: parsedSheetProp, parsedSheets: nextParsed };
        }

        if (sheetName && projectName) {
          const content = dsl ?? '';
          const parsed = getParsedForDsl(content);

          return {
            parsedSheet: parsed,
            parsedSheets: parsed
              ? { ...parsedSheetsProp, [sheetName]: parsed }
              : { ...parsedSheetsProp },
          };
        }

        return {
          parsedSheet: parsedSheetProp,
          parsedSheets: { ...parsedSheetsProp },
        };
      }, // eslint-disable-next-line react-hooks/exhaustive-deps
      [
        dsl,
        projectName,
        sheetName,
        projectSheets.length,
        stableProjectSheets,
        parsedSheetProp,
        parsedSheetsProp,
      ],
    );

    // Keep refs & contexts fresh — include deps!
    const mockGridApiRef = useMemo(() => {
      const ref = createRef<GridApi>();
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      ref.current = gridApi;

      return ref;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gridApi]);

    const dslCtx = useMemo(() => ({ dsl, setDsl }), [dsl]);

    const apiCtx = useMemo(
      () => ({
        userBucket: 'SomeBucket',
        userRoles: [],
        isAdmin: false,
        bucketState: { loading: false },
        retryBucketFetch: () => {},
      }),
      [],
    );

    const viewportCtx = useMemo(
      () => ({
        viewGridData,
        clearTablesData: () => {},
        onColumnDataResponse: () => {},
        onProfileResponse: () => {},
        onIndexResponse: () => {},
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [viewGridData],
    );

    const projectCtx = useMemo(
      () => ({
        projectName,
        projectSheets: stableProjectSheets,
        projectVersion: '',
        projectBucket: '',
        projectPath: '',
        projectPermissions: [],
        projectAuthor: '',
        isProjectEditable: true,
        isProjectShareable: true,
        hasEditPermissions: true,
        projectState: null,
        fullProjectPath: '',

        isProjectChangedOnServerByUser: false,

        sheetName,
        sheetContent: dsl,

        sheetErrors: [],
        compilationErrors: [],
        runtimeErrors: [],
        indexErrors: [],

        parsedSheet,
        parsedSheets,

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

        isTemporaryState: false,
        isTemporaryStateEditable: false,
        isConflictResolving: false,
        initConflictResolving: () => {},
        resolveConflictUsingLocalChanges: () => {},
        resolveConflictUsingServerChanges: () => {},

        fieldInfos: [],
        responseIds: [],

        openProject: () => Promise.resolve(),
        closeCurrentProject: () => {},

        acceptShareProject: () => {},
        acceptShareFiles: () => {},

        updateSheetContent,
        manuallyUpdateSheetContent,

        getCurrentProjectViewport: () => {},
        getVirtualProjectViewport: () => {},
        longCalcStatus: null,
        setLongCalcStatus: () => {},
        unsubscribeFromCurrentProject: () => {},
        openSheet: () => {},
        resetSheetState: () => {},
        updateProjectOnServer: () => Promise.resolve(),
        setCurrentSheetName: () => {},
        setIsConflictResolving: () => {},
        cancelAllImportSyncRequests: () => {},
        manageRequestLifecycle: () => {},
        clearViewportError: () => {},
        projectDataLoadingError: null,
        setProjectDataLoadingError: () => {},
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [
        projectName,
        stableProjectSheets,
        sheetName,
        dsl,
        parsedSheet,
        parsedSheets,
        updateSheetContent,
        manuallyUpdateSheetContent,
      ],
    );

    const undoCtx = useMemo(
      () => ({
        appendTo: appendToFn,
        undo: () => {},
        history: [],
        redo: () => {},
        revertedIndex: null,
        clear: () => {},
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [appendToFn],
    );

    const appSpreadsheetInteractionCtx = useMemo(
      () => ({
        openField: () => {},
        openTable: () => {},
        openCellEditor: () => {},
        autoCleanUpTable: () => {},
      }),
      [],
    );

    return (
      <DslContext.Provider value={dslCtx}>
        <ApiContext.Provider value={apiCtx}>
          <ViewportContext.Provider value={viewportCtx}>
            <ProjectContext.Provider value={projectCtx}>
              <UndoRedoContext.Provider value={undoCtx}>
                <CanvasSpreadsheetContext.Provider value={mockGridApiRef}>
                  <AppSpreadsheetInteractionContext.Provider
                    value={appSpreadsheetInteractionCtx}
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
