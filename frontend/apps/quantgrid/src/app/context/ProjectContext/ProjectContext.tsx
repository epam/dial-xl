import { createContext } from 'react';

import {
  CommonMetadata,
  CompilationError,
  DslSheetChange,
  FieldInfo,
  FunctionInfo,
  IndexError,
  ParsingError,
  ProjectAIResponseId,
  ProjectState,
  ResourceMetadata,
  ResourcePermission,
  RuntimeError,
  TableHighlightDataMap,
  Viewport,
  WorksheetState,
} from '@frontend/common';
import { ParsedSheet, ParsedSheets } from '@frontend/parser';

import {
  ForkedProjectSettings,
  LongCalcStatus,
  SelectedCell,
} from '../../common';

type ProjectContextValues = {
  projectName: string | null;
  projectSheets: WorksheetState[] | null;
  projectVersion: string | null;
  projectBucket: string | null;
  projectPath: string | null;
  projectPermissions: ResourcePermission[];

  projectAuthor: string | null;

  isProjectShareable: boolean;

  isProjectReadonlyByUser: boolean; // User can set project to readonly mode, keep between reloads
  isProjectEditingDisabled: boolean; // We can set during chat generating for example
  isProjectEditable: boolean; // Combination of permissions and other flags for editing project
  hasEditPermissions: boolean; // User has edit permissions for project

  isProjectChangedOnServerByUser: boolean;

  projects: ResourceMetadata[];

  sheetName: string | null;
  sheetContent: string | null;
  sheetErrors: ParsingError[] | null;
  compilationErrors: CompilationError[] | null;
  runtimeErrors: RuntimeError[] | null;
  indexErrors: IndexError[] | null;

  parsedSheet: ParsedSheet | null;
  parsedSheets: ParsedSheets;

  selectedCell: SelectedCell | null;

  functions: FunctionInfo[];

  beforeTemporaryState: ProjectState | null;

  diffData: TableHighlightDataMap | null; // TODO: just rename as highlight data

  isConflictResolving: boolean;

  forkedProject: ForkedProjectSettings | null;
  fieldInfos: FieldInfo[];

  responseIds: ProjectAIResponseId[];
  longCalcStatus: LongCalcStatus;
};

type ProjectContextActions = {
  openProject: (args: {
    path: string | null | undefined;
    projectName: string;
    projectSheetName?: string | undefined;
    bucket: string;
  }) => void;
  closeCurrentProject: (skipNavigate?: boolean) => void;
  createProject: (args?: {
    newName?: string;
    path?: string | null;
    bucket?: string | null;
    existingProjectNames?: string[];
    silent?: boolean;
    onSuccess?: () => void;
    openInNewTab?: boolean;
  }) => void;
  deleteProject: (args: {
    silent?: boolean;
    bucket: string;
    projectName: string;
    path: string | null | undefined;
    onSuccess?: () => void;
  }) => void;
  deleteCurrentProject: (args?: { silent?: boolean }) => void;
  renameCurrentProject: (args?: { newName?: string; silent?: boolean }) => void;
  cloneCurrentProject: (args?: {
    newName?: string;
    silent?: boolean;
  }) => Promise<void>;

  setIsProjectReadonlyByUser: (value: boolean) => void;
  setIsProjectEditingDisabled: (value: boolean) => void;

  shareResources: (
    files: Omit<CommonMetadata, 'resourceType' | 'url'>[]
  ) => void;
  acceptShareProject: (args: {
    invitationId: string;
    projectBucket: string;
    projectName: string;
    projectPath: string | null | undefined;
  }) => void;
  acceptShareFiles: (args: { invitationId: string }) => void;

  openSheet: (args: { sheetName: string }) => void;
  createSheet: (args?: { newName?: string; silent?: boolean }) => void;
  renameSheet: (args: {
    oldName: string;
    newName?: string;
    silent?: boolean;
  }) => void;
  deleteSheet: (args: { sheetName: string; silent?: boolean }) => void;

  updateSheetContent: (
    changeItems: DslSheetChange[],
    args?: { sendPutWorksheet?: boolean; responseIds?: ProjectAIResponseId[] }
  ) => Promise<boolean | undefined>;
  manuallyUpdateSheetContent: (
    changeItems: DslSheetChange[],
    sendPutWorksheet?: boolean
  ) => Promise<boolean | undefined>;

  updateSelectedCell: (selectedCell: SelectedCell | null) => void;
  openStatusModal: (text: string) => void;

  getFunctions: () => void;
  getCurrentProjectViewport: (
    viewports: Viewport[],
    overrideCurrentSheetContent?: string
  ) => void;
  getVirtualProjectViewport: (
    viewports: Viewport[],
    virtualTablesDSL: string[]
  ) => void;
  getProjects: () => void;

  startTemporaryState: () => void;
  setIsTemporaryStateEditable: (value: boolean) => void;
  resolveTemporaryState: (args: {
    useServer?: boolean;
    useTemporary?: boolean;
  }) => void;
  setDiffData: (value: TableHighlightDataMap | null) => void;

  initConflictResolving: () => void;
  resolveConflictUsingServerChanges: () => void;
  resolveConflictUsingLocalChanges: () => void;
  setLongCalcStatus: (status: LongCalcStatus) => void;
};

export const ProjectContext = createContext<
  ProjectContextActions & ProjectContextValues
>({} as ProjectContextActions & ProjectContextValues);
