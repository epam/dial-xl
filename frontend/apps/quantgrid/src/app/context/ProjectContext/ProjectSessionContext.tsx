import { createContext } from 'react';

import {
  ApiError,
  CompilationError,
  DslSheetChange,
  FieldInfo,
  FunctionInfo,
  IndexError,
  ParsingError,
  ProjectAIResponseId,
  ProjectState,
  RuntimeError,
  TableHighlightDataMap,
  useStateWithRef,
  Viewport,
} from '@frontend/common';
import { ParsedSheet, ParsedSheets } from '@frontend/parser';

export type ProjectSessionValues = {
  sheetName: string | null;
  sheetContent: string | null;
  sheetErrors: ParsingError[] | null;
  compilationErrors: CompilationError[] | null;
  runtimeErrors: RuntimeError[] | null;
  indexErrors: IndexError[] | null;
  parsedSheet: ParsedSheet | null;
  parsedSheets: ParsedSheets;
  functions: FunctionInfo[];
  diffData: TableHighlightDataMap | null; // TODO: just rename as highlight data
  isConflictResolving: boolean;

  fieldInfos: FieldInfo[];

  isTemporaryState: boolean;
  isTemporaryStateEditable: boolean;
  isProjectShareable: boolean;
  isProjectReadonlyByUser: boolean; // User can set a project to readonly mode, keep between reloads
  isProjectEditingDisabled: boolean; // We can set during chat generating, for example
  isProjectEditable: boolean; // Combination of permissions and other flags for an editing project
  hasEditPermissions: boolean; // User has edit permissions for a project

  beforeTemporaryState: ProjectState | null;
  projectDataLoadingError: ApiError | null;
};

type ProjectSessionInternalValues = {
  isTemporaryStateRef: ReturnType<typeof useStateWithRef<boolean>>[2];
  isTemporaryStateEditableRef: ReturnType<typeof useStateWithRef<boolean>>[2];
};

type ProjectSessionInternalActions = {
  initialOpenSheet: (args: { sheetName: string }) => Promise<void>;
  setParsedSheet: (parsedSheet: ParsedSheet | null) => void;
  setParsedSheets: (parsedSheets: ParsedSheets) => void;
  setBeforeTemporaryState: (state: ProjectState | null) => void;
  setIsTemporaryState: (value: boolean) => void;
  cancelAllViewportRequests: () => void;
};

export type ProjectSessionActions = {
  openSheet: (args: { sheetName: string }) => void;

  setCurrentSheetName: (sheetName: string | null) => void;
  updateSheetContent: (
    changeItems: DslSheetChange[],
    args?: { sendPutWorksheet?: boolean; responseIds?: ProjectAIResponseId[] },
  ) => Promise<boolean | undefined>;
  manuallyUpdateSheetContent: (
    changeItems: DslSheetChange[],
    sendPutWorksheet?: boolean,
  ) => Promise<boolean | undefined>;
  startTemporaryState: () => void;
  resolveTemporaryState: (args: {
    useServer?: boolean;
    useTemporary?: boolean;
  }) => void;
  setDiffData: (value: TableHighlightDataMap | null) => void;

  setIsConflictResolving: (v: boolean) => void;
  getCurrentProjectViewport: (args: {
    viewports: Viewport[];
    overrideCurrentSheetContent?: string;
    withCompilation: boolean;
  }) => void;
  getVirtualProjectViewport: (
    viewports: Viewport[],
    virtualTablesDSL: string[],
  ) => void;

  setIsProjectReadonlyByUser: (value: boolean) => void;
  setIsProjectEditingDisabled: (value: boolean) => void;
  setIsTemporaryStateEditable: (value: boolean) => void;
  resetSheetState: () => void;
  initConflictResolving: () => void;
  resolveConflictUsingServerChanges: () => void;
  resolveConflictUsingLocalChanges: () => void;
  setProjectDataLoadingError: (error: ApiError | null) => void;
};

type ProjectSessionContextType = ProjectSessionActions &
  ProjectSessionInternalActions &
  ProjectSessionValues &
  ProjectSessionInternalValues;

export const ProjectSessionContext = createContext<ProjectSessionContextType>(
  {} as ProjectSessionContextType,
);
