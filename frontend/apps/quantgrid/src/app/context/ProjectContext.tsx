import { Modal } from 'antd';
import cx from 'classnames';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import isEqual from 'react-fast-compare';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import {
  appMessages,
  CompilationError,
  dialProjectFileExtension,
  disabledTooltips,
  DslSheetChange,
  FieldInfo,
  FilesMetadata,
  FunctionInfo,
  IndexError,
  KeyboardCode,
  modalFooterButtonClasses,
  NotificationEvent,
  parseSSEResponse,
  ParsingError,
  primaryButtonClasses,
  ProjectAIResponseId,
  ProjectState,
  ResourcePermission,
  RuntimeError,
  TableHighlightDataMap,
  useStateWithRef,
  Viewport,
  ViewportResponse,
  WorksheetState,
} from '@frontend/common';
import {
  ParsedSheet,
  ParsedSheets,
  SheetReader,
  unescapeTableName,
} from '@frontend/parser';

import {
  DeleteModalRefFunction,
  DeleteProjectModalRefFunction,
  ForkedProjectSettings,
  LongCalcStatus,
  ModalRefFunction,
  NewProjectModalRefFunction,
  RenameModalRefFunction,
  SelectedCell,
  ShareModalRefFunction,
} from '../common';
import {
  DeleteProject,
  DeleteSheet,
  NewProject,
  NewSheet,
  RenameProject,
  RenameSheet,
  ShareFiles,
} from '../components';
import {
  addChartFiltersToDefaultViewportRequest,
  useApiRequests,
  useLongCalculations,
  useProjectReadonlyByUser,
  useRenameFile,
} from '../hooks';
import useEventBus from '../hooks/useEventBus';
import {
  addRecentProject,
  autoRenameFields,
  autoRenameTables,
  cleanUpProjectHistory,
  cleanUpRecentProjects,
  createUniqueName,
  deleteProjectHistory,
  deleteRecentProjectFromRecentProjects,
  EventBusMessages,
  sortSheetTables,
  uniqueId,
} from '../services';
import { routes } from '../types';
import {
  constructPath,
  displayToast,
  encodeApiUrl,
  getProjectNavigateUrl,
  updateAIResponseIds,
  updateProjectSheets,
  updateSheetInProject,
} from '../utils';
import { ApiContext, AppContext, ViewportContext } from '.';

export const defaultSheetName = 'Sheet1';
export const defaultProjectName = 'Project1';

type ProjectContextValues = {
  projectName: string | null;
  projectSheets: WorksheetState[] | null;
  projectVersion: string | null;
  projectBucket: string | null;
  projectPath: string | null;
  projectPermissions: ResourcePermission[];

  isProjectShareable: boolean;

  isProjectReadonlyByUser: boolean; // User can set project to readonly mode, keep between reloads
  isProjectEditingDisabled: boolean; // We can set during chat generating for example
  isProjectEditable: boolean; // Combination of permissions and other flags for editing project
  hasEditPermissions: boolean; // User has edit permissions for project

  isProjectChangedOnServerByUser: boolean;

  projects: FilesMetadata[];

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
  cloneCurrentProject: (sheetsOverride?: WorksheetState[]) => Promise<void>;

  setIsProjectReadonlyByUser: (value: boolean) => void;
  setIsProjectEditingDisabled: (value: boolean) => void;

  shareResources: (
    files: Omit<FilesMetadata, 'resourceType' | 'url'>[]
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

export function ProjectContextProvider({
  children,
}: PropsWithChildren<Record<string, unknown>>): JSX.Element {
  const { setLoading } = useContext(AppContext);
  const { userBucket } = useContext(ApiContext);
  const {
    getProject: getProjectRequest,
    putProject: putProjectRequest,
    deleteProject: deleteProjectRequest,
    createProject: createProjectRequest,
    getFunctions: getFunctionsRequest,
    getFileNotifications: getFileNotificationsRequest,
    getViewport: getViewportRequest,
    getUserProjects: getUserProjectsRequest,
    acceptShare: acceptShareRequest,
    getResourceMetadata: getResourceMetadataRequest,
    cloneProject: cloneProjectRequest,
    checkProjectExists: checkProjectExistsRequest,
  } = useApiRequests();
  const {
    clearTablesData,
    viewGridData,
    onColumnDataResponse,
    onProfileResponse,
    onIndexResponse,
  } = useContext(ViewportContext);
  const navigate = useNavigate();
  const eventBus = useEventBus<EventBusMessages>();
  const { renameFile } = useRenameFile();

  const [currentSheetName, setCurrentSheetName] = useState<string | null>(null);

  const projectSubscriptionControllerRef = useRef<AbortController | null>(null);
  const {
    longCalcStatus,
    setLongCalcStatus,
    manageRequestLifecycle,
    cancelAllViewportRequests,
  } = useLongCalculations();

  const [forkedProject, setForkedProject] =
    useState<ForkedProjectSettings | null>(null);

  // Use this inside project context
  const _projectState = useRef<ProjectState | null>(null);
  const [projectState, _setProjectState] = useState<ProjectState | null>();
  const projectName = useMemo(
    () => projectState?.projectName ?? null,
    [projectState?.projectName]
  );
  const projectBucket = useMemo(
    () => projectState?.bucket ?? null,
    [projectState?.bucket]
  );
  const projectPath = useMemo(
    () => projectState?.path ?? null,
    [projectState?.path]
  );
  const projectVersion = useMemo(
    () => projectState?.version ?? null,
    [projectState?.version]
  );

  // Ref used for some additional optimization
  const __projectSheets__ = useRef<WorksheetState[] | null>(null);
  const projectSheets: WorksheetState[] | null = useMemo(() => {
    const sheets = projectState?.sheets ?? null;

    // We are trying to prevent unnecessary rerenders
    if (isEqual(sheets, __projectSheets__.current)) {
      return __projectSheets__.current;
    }

    __projectSheets__.current = sheets;

    return sheets;
  }, [projectState?.sheets]);

  // Ref used for some additional optimization
  const __currentSheet__ = useRef<WorksheetState | null>(null);
  const currentSheet: WorksheetState | null = useMemo(() => {
    const sheet =
      projectSheets?.find((sheet) => sheet.sheetName === currentSheetName) ??
      null;

    // We are trying to prevent unnecessary rerenders
    if (isEqual(sheet, __currentSheet__.current)) {
      return __currentSheet__.current;
    }

    __currentSheet__.current = sheet;

    return sheet;
  }, [currentSheetName, projectSheets]);
  const currentSheetContent = useMemo(
    () => currentSheet?.content ?? null,
    [currentSheet?.content]
  );

  const [projectPermissions, setProjectPermissions] = useState<
    ResourcePermission[]
  >([]);

  // User able to make project readonly
  const {
    isReadonly: isProjectReadonlyByUser,
    setIsReadonly: setIsProjectReadonlyByUser,
  } = useProjectReadonlyByUser({ projectBucket, projectName, projectPath });

  // We should have an ability to make project readonly during different operations
  // For example during chat answering
  const [isProjectEditingDisabled, setIsProjectEditingDisabled] =
    useState(false);
  const hasEditPermissions = useMemo(() => {
    return (['READ', 'WRITE'] as ResourcePermission[]).every((permission) =>
      projectPermissions.includes(permission)
    );
  }, [projectPermissions]);

  const isProjectShareable = useMemo(() => {
    return projectPermissions.includes('SHARE');
  }, [projectPermissions]);

  const [currentSheetCompilationErrors, setCurrentSheetCompilationErrors] =
    useState<CompilationError[]>([]);
  const [currentSheetParsingErrors, setCurrentSheetParsingErrors] = useState<
    ParsingError[]
  >([]);
  const [runtimeErrors, setRuntimeErrors] = useState<RuntimeError[] | null>(
    null
  );
  const [indexErrors, setIndexErrors] = useState<IndexError[] | null>(null);

  const [projects, setProjects] = useState<FilesMetadata[]>([]);

  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [parsedSheet, setParsedSheet] = useState<ParsedSheet | null>(null);
  const [parsedSheets, setParsedSheets] = useState<ParsedSheets>({});

  const [functions, setFunctions] = useState<FunctionInfo[]>([]);

  const newProjectModal = useRef<NewProjectModalRefFunction | null>(null);
  const deleteProjectModal = useRef<DeleteProjectModalRefFunction | null>(null);
  const newSheetModal = useRef<ModalRefFunction | null>(null);
  const renameProjectModal = useRef<RenameModalRefFunction | null>(null);
  const shareProjectModal = useRef<ShareModalRefFunction | null>(null);
  const renameSheetModal = useRef<RenameModalRefFunction | null>(null);
  const deleteSheetModal = useRef<DeleteModalRefFunction | null>(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusModalText, setStatusModalText] = useState('');
  const [isConflictResolving, setIsConflictResolving] = useState(false);

  const [isTemporaryState, setIsTemporaryState, isTemporaryStateRef] =
    useStateWithRef(false);
  const [
    isTemporaryStateEditable,
    setIsTemporaryStateEditable,
    isTemporaryStateEditableRef,
  ] = useStateWithRef(false);
  const isProjectEditable = useMemo(
    () =>
      !isProjectEditingDisabled &&
      ((!isTemporaryState && !isProjectReadonlyByUser && hasEditPermissions) ||
        isTemporaryStateEditable),
    [
      isProjectReadonlyByUser,
      hasEditPermissions,
      isProjectEditingDisabled,
      isTemporaryState,
      isTemporaryStateEditable,
    ]
  );

  const [diffData, setDiffData, diffDataRef] =
    useStateWithRef<TableHighlightDataMap | null>(null);
  const [fieldInfos, setFieldInfos] = useState<FieldInfo[]>([]);

  const responseIds: ProjectAIResponseId[] = useMemo(
    () => projectState?.settings.projectMetadata?.assistantResponseIds ?? [],
    [projectState]
  );

  /// New sync variables
  const remoteEtag = useRef<string | null>(null);
  const inflightRequest = useRef<'get' | 'put' | null>(null);
  const localDsl = useRef<WorksheetState[] | null>(null);
  const inflightDsl = useRef<WorksheetState[] | null>(null);
  ///

  const [isProjectChangedOnServerByUser, setIsProjectChangedOnServerByUser] =
    useState(false);

  const [beforeTemporaryState, setBeforeTemporaryState] =
    useState<ProjectState | null>(null);
  const startTemporaryState = useCallback(() => {
    if (!isTemporaryState) {
      setBeforeTemporaryState(_projectState.current);
    }
    setIsTemporaryState(true);
  }, [isTemporaryState, setIsTemporaryState]);

  // Make editableSheet unable to use in read-only mode
  useEffect(() => {
    const isReadOnly = !isProjectEditable;

    parsedSheet?.setReadOnly(isReadOnly);
    Object.values(parsedSheets).forEach((s) => s.setReadOnly(isReadOnly));
  }, [
    isProjectEditable,
    isTemporaryState,
    isTemporaryStateEditable,
    parsedSheet,
    parsedSheets,
  ]);

  const setProjectState = useCallback(
    (newProjectState: ProjectState | null) => {
      _projectState.current = newProjectState;
      setIsProjectChangedOnServerByUser(false);

      _setProjectState(newProjectState);
    },
    []
  );

  const resetSheetState = useCallback(() => {
    setCurrentSheetName(null);
    setParsedSheet(null);
    setCurrentSheetCompilationErrors([]);
    setCurrentSheetParsingErrors([]);
    setRuntimeErrors([]);
    setIndexErrors([]);
  }, []);

  const unsubscribeFromCurrentProject = useCallback(() => {
    if (
      projectSubscriptionControllerRef.current &&
      !projectSubscriptionControllerRef.current?.signal.aborted
    ) {
      projectSubscriptionControllerRef.current.abort();
    }
  }, []);

  const closeCurrentProject = useCallback(
    (skipNavigate?: boolean) => {
      setParsedSheet(null);
      setParsedSheets({});
      setFunctions([]);
      setProjectState(null);
      setProjectPermissions([]);
      unsubscribeFromCurrentProject();
      cancelAllViewportRequests();
      setBeforeTemporaryState(null);
      setIsTemporaryState(false);
      setIsTemporaryStateEditable(false);
      setLongCalcStatus(LongCalcStatus.None);

      remoteEtag.current = null;
      inflightRequest.current = null;
      localDsl.current = null;
      inflightDsl.current = null;

      if (!skipNavigate) {
        navigate(routes.home);
      }
    },
    [
      navigate,
      setIsTemporaryState,
      setIsTemporaryStateEditable,
      setProjectState,
      unsubscribeFromCurrentProject,
      cancelAllViewportRequests,
      setLongCalcStatus,
    ]
  );

  const updateForkedProjectInfo = useCallback(
    async (project: ProjectState) => {
      if (project.settings.projectMetadata?.forkedFrom) {
        const { forkedFrom } = project.settings.projectMetadata;
        if (forkedFrom?.projectName && forkedFrom?.bucket) {
          const { path, projectName, bucket } = forkedFrom;

          const isExists = await checkProjectExistsRequest({
            path,
            name: projectName,
            bucket,
          });

          setForkedProject({
            path,
            bucket,
            projectName,
            isExists: !!isExists,
          });
        } else {
          setForkedProject(null);
        }
      } else {
        setForkedProject(null);
      }
    },
    [checkProjectExistsRequest]
  );

  const getProjectFromServer = useCallback(
    async ({
      path,
      projectName,
      bucket,
    }: {
      path: string | null | undefined;
      projectName: string;
      bucket: string;
    }) => {
      inflightRequest.current = 'get';

      const project = await getProjectRequest({
        name: projectName,
        bucket,
        path,
      });
      const projectMetadata = await getResourceMetadataRequest({
        path: constructPath([
          bucket,
          path,
          projectName + dialProjectFileExtension,
        ]),
        withPermissions: true,
      });

      setLoading(false);
      if (!project) {
        setLoading(false);
        // eslint-disable-next-line no-console
        console.warn('Redirect to home because of error while getting project');
        closeCurrentProject();
        displayToast(
          'error',
          `Project "${projectName}" cannot be fetched because it doesn't exist or has been removed.`
        );

        return;
      }

      await updateForkedProjectInfo(project);

      // Initial get or no changes from user -> update project state
      if (
        (!_projectState.current?.sheets && !localDsl.current) ||
        isEqual(_projectState.current?.sheets, localDsl.current)
      ) {
        localDsl.current = project.sheets;
        inflightRequest.current = null;

        setProjectPermissions(projectMetadata?.permissions ?? []);
        setProjectState(project);
      }

      // No sub events or event tag same as local etag
      if (!remoteEtag.current || project.version === remoteEtag.current) {
        remoteEtag.current = null;

        // last remote dsl is not same as received dsl
        if (
          _projectState.current &&
          !isEqual(localDsl.current, project.sheets)
        ) {
          localDsl.current = project.sheets;
          setProjectState({
            ..._projectState.current,
            version: project.version,
          });

          // resolve conflict
          setIsConflictResolving(true);
          setIsTemporaryState(true);
        }

        inflightRequest.current = null;

        return project;
      }

      remoteEtag.current = null;

      // retrying getting project
      return await getProjectFromServer({
        path,
        projectName,
        bucket,
      });
    },
    [
      closeCurrentProject,
      getProjectRequest,
      getResourceMetadataRequest,
      setIsTemporaryState,
      setLoading,
      setProjectState,
      updateForkedProjectInfo,
    ]
  );

  const handleProjectNotifications = useCallback(
    async (data: NotificationEvent) => {
      switch (data.action) {
        case 'DELETE':
          displayToast('info', appMessages.currentProjectRemoved);
          // eslint-disable-next-line no-console
          console.warn('Redirect to home because of project have been removed');
          closeCurrentProject();
          break;
        case 'UPDATE': {
          if (isTemporaryStateRef.current) return;

          if (inflightRequest.current !== null) {
            remoteEtag.current = data.etag ?? null;
          } else if (
            data.etag !== _projectState.current?.version &&
            _projectState.current
          ) {
            await getProjectFromServer({
              path: _projectState.current.path,
              bucket: _projectState.current.bucket,
              projectName: _projectState.current.projectName,
            });
          }
          break;
        }
        default:
          break;
      }
    },
    [closeCurrentProject, getProjectFromServer, isTemporaryStateRef]
  );

  const subscribeToProject = useCallback(
    async ({
      bucket,
      path,
      projectName,
    }: {
      bucket: string;
      path?: string | null;
      projectName: string;
    }) => {
      projectSubscriptionControllerRef.current?.abort();

      projectSubscriptionControllerRef.current = new AbortController();
      let retries = 0;

      while (true) {
        // Needed try for Aborting exception
        try {
          const res = await getFileNotificationsRequest({
            projectUrl: `${bucket}/${
              path ? path + '/' : ''
            }${projectName}${dialProjectFileExtension}`,
            controller: projectSubscriptionControllerRef.current,
          });

          if (!res) {
            if (!projectSubscriptionControllerRef.current.signal.aborted) {
              displayToast('error', appMessages.subscribeError);
            }

            return;
          }

          if (retries > 0 && !isTemporaryStateRef.current) {
            await getProjectFromServer({
              projectName,
              bucket,
              path,
            });
          }

          retries = 0;

          return await parseSSEResponse(
            res,
            { onData: handleProjectNotifications },
            projectSubscriptionControllerRef.current
          );
        } catch (e) {
          // Aborted by the browser (for example, when a user tries to save the page).
          // “network error” appears when the subscription request is active
          // “Failed to fetch” appears when the subscription request is pending after a retry.
          if (
            e instanceof TypeError &&
            (e.message === 'network error' || e.message === 'Failed to fetch')
          ) {
            retries++;

            continue;
          }

          if (e instanceof DOMException && e.name === 'AbortError') {
            toast.dismiss();

            return;
          }

          if (retries > 3) {
            return;
          }

          displayToast('error', appMessages.connectionLost);
          retries++;

          continue;
        }
      }
    },
    [
      getFileNotificationsRequest,
      getProjectFromServer,
      handleProjectNotifications,
      isTemporaryStateRef,
    ]
  );

  const openSheet = useCallback(
    ({ sheetName }: { sheetName: string }) => {
      if (sheetName === currentSheetName || !sheetName) return;

      cancelAllViewportRequests();

      clearTablesData();

      const projectState = _projectState.current;
      if (!projectState) {
        return;
      }

      let resultedSheetContent = projectState.sheets.find(
        (sheet) => sheet.sheetName === sheetName
      )?.content;
      let resultedSheetName = sheetName;

      if (resultedSheetContent == null) {
        resultedSheetContent = projectState.sheets[0].content;
        resultedSheetName = projectState.sheets[0].sheetName;

        if (!resultedSheetContent) {
          // eslint-disable-next-line no-console
          console.warn(
            'Redirect to home because sheet content not exists when opening sheet'
          );
          closeCurrentProject();

          return;
        }
      }

      setCurrentSheetName(resultedSheetName);
      setParsedSheet(null);
      navigate(
        getProjectNavigateUrl({
          projectName: projectState.projectName,
          projectBucket: projectState.bucket,
          projectPath: projectState.path,
          projectSheetName: resultedSheetName,
        }),
        { replace: true }
      );

      return { resultedSheetContent, resultedSheetName };
    },
    [
      cancelAllViewportRequests,
      clearTablesData,
      closeCurrentProject,
      currentSheetName,
      navigate,
    ]
  );

  const updateProjectOnServer = useCallback(
    async (
      updatedStateRequest: ProjectState,
      options: {
        onSuccess?: () => void;
        onFail?: () => void;
      }
    ) => {
      if (!_projectState.current) return;

      cancelAllViewportRequests();

      // We are doing optimistic update
      setProjectState({
        ...updatedStateRequest,
        // We need to have latest version in project state
        version: _projectState.current!.version!,
      });

      // We don't need to update server if is ai pending changes
      if (isTemporaryStateRef.current) return;

      if (inflightRequest.current !== null) return;

      inflightDsl.current = updatedStateRequest.sheets;
      inflightRequest.current = 'put';

      if (!_projectState.current.version) return;

      const newProjectState = await putProjectRequest(updatedStateRequest);

      if (newProjectState) {
        localDsl.current = updatedStateRequest.sheets;
        setProjectState({
          ..._projectState.current,
          version: newProjectState.version,
        });
        setIsProjectChangedOnServerByUser(true);

        options.onSuccess?.();

        // During put request some event appeared - we need to get project again to be sure that project is actual
        if (remoteEtag.current !== null) {
          inflightDsl.current = null;

          getProjectFromServer({
            path: _projectState.current.path,
            bucket: _projectState.current.bucket,
            projectName: _projectState.current.projectName,
          });

          return;
        }

        // because we are doing optimistic updates we need to be sure that latest changes is same with server
        // otherwise doing PUT
        inflightRequest.current = null;
        if (isEqual(_projectState.current?.sheets, localDsl.current)) {
          inflightDsl.current = null;
        } else {
          inflightDsl.current = _projectState.current?.sheets;

          return updateProjectOnServer(_projectState.current, {});
        }
      } else {
        options.onFail?.();

        inflightDsl.current = null;
        // Need to request latest state to show override banner later
        getProjectFromServer({
          path: _projectState.current.path,
          bucket: _projectState.current.bucket,
          projectName: _projectState.current.projectName,
        });
      }
    },
    [
      cancelAllViewportRequests,
      getProjectFromServer,
      isTemporaryStateRef,
      putProjectRequest,
      setProjectState,
    ]
  );

  const discardTemporaryChanges = useCallback(
    async (projectStateToReset: ProjectState | null) => {
      if (!_projectState.current) return;

      localDsl.current = projectStateToReset?.sheets ?? [];
      _projectState.current.sheets = projectStateToReset?.sheets ?? [];

      const proj = await getProjectFromServer({
        path: _projectState.current.path,
        bucket: _projectState.current.bucket,
        projectName: _projectState.current.projectName,
      });

      if (
        !proj?.sheets.find((sheet) => sheet.sheetName === currentSheetName) &&
        proj?.sheets[0].sheetName
      ) {
        openSheet({ sheetName: proj?.sheets[0].sheetName });
      }
    },
    [currentSheetName, getProjectFromServer, openSheet]
  );

  const resolveTemporaryState = useCallback(
    ({
      useServer,
      useTemporary,
    }: {
      useServer?: boolean;
      useTemporary?: boolean;
    }) => {
      if (!_projectState.current || !isTemporaryStateRef.current) return;

      setBeforeTemporaryState(null);
      setIsTemporaryState(false);

      // We need to reset project state to server changes
      if (useServer) {
        discardTemporaryChanges(beforeTemporaryState);
      }

      // We need to just try to put temporary state top server
      if (useTemporary) {
        updateProjectOnServer(_projectState.current, {});
      }
    },
    [
      beforeTemporaryState,
      discardTemporaryChanges,
      isTemporaryStateRef,
      setIsTemporaryState,
      updateProjectOnServer,
    ]
  );

  const initConflictResolving = useCallback(() => {
    setIsConflictResolving(true);
    startTemporaryState();
  }, [startTemporaryState]);

  const resolveConflictUsingServerChanges = useCallback(() => {
    if (!_projectState.current || !localDsl.current) return;

    setIsConflictResolving(false);

    // Just set dsl from server as local
    resolveTemporaryState({ useServer: true });
  }, [resolveTemporaryState]);

  const resolveConflictUsingLocalChanges = useCallback(() => {
    if (!_projectState.current) return;

    setIsConflictResolving(false);

    resolveTemporaryState({ useTemporary: true });
  }, [resolveTemporaryState]);

  const createProject = useCallback(
    async ({
      newName,
      path,
      bucket,
      existingProjectNames,
      silent,
      onSuccess,
      openInNewTab,
    }: {
      path?: string | null;
      bucket?: string | null;
      newName?: string;
      existingProjectNames?: string[];
      silent?: boolean;
      onSuccess?: () => void;
      openInNewTab?: boolean;
    } = {}) => {
      if (!userBucket) return;

      if (!silent) {
        newProjectModal.current?.({
          projectPath: path,
          projectBucket: bucket ?? userBucket,
          existingProjectNames,
          onSuccess,
          openInNewTab,
        });

        return;
      }

      if (!userBucket) return;

      setLoading(true);

      const newProjectName = newName ?? defaultProjectName;
      const res = await createProjectRequest({
        bucket: bucket ?? userBucket,
        projectName: newName ?? defaultProjectName,
        path,
      });

      setLoading(false);

      if (res && openInNewTab) {
        window.open(
          getProjectNavigateUrl({
            projectBucket: bucket ?? userBucket,
            projectName: newProjectName,
            projectPath: path,
          }),
          '_blank'
        );
      }

      onSuccess?.();
    },
    [createProjectRequest, setLoading, userBucket]
  );

  const deleteProject = useCallback(
    async ({
      silent,
      bucket,
      projectName,
      path,
      onSuccess,
    }: {
      silent?: boolean;
      bucket: string;
      projectName: string;
      path: string | null | undefined;
      onSuccess?: () => void;
    }) => {
      if (!silent) {
        deleteProjectModal.current?.({
          projectBucket: bucket,
          projectPath: path,
          name: projectName,
          onSuccess,
        });

        return;
      }

      setLoading(true);

      const res = await deleteProjectRequest({
        name: projectName,
        bucket,
        path,
      });

      setLoading(false);
      if (res) {
        deleteProjectHistory(projectName, bucket, path);
        deleteRecentProjectFromRecentProjects(projectName, bucket, path);

        if (projectName === _projectState.current?.projectName) {
          // eslint-disable-next-line no-console
          console.warn(
            'Redirect to home because project which removed is opened in that moment'
          );
          closeCurrentProject();
        }
      }

      onSuccess?.();

      return {};
    },
    [closeCurrentProject, deleteProjectRequest, setLoading]
  );

  const deleteCurrentProject = useCallback(
    async ({ silent }: { silent?: boolean } = {}) => {
      if (!_projectState.current) return;

      const { bucket, path, projectName } = _projectState.current;

      unsubscribeFromCurrentProject();

      await deleteProject({
        silent,
        bucket,
        projectName,
        path,
      });
    },
    [deleteProject, unsubscribeFromCurrentProject]
  );

  const renameCurrentProject = useCallback(
    async ({
      newName = defaultProjectName,
      silent,
    }: {
      newName?: string;
      silent?: boolean;
    } = {}) => {
      if (
        !_projectState.current ||
        _projectState.current.projectName === newName
      )
        return;

      if (!silent) {
        renameProjectModal.current?.(_projectState.current.projectName);

        return;
      }

      unsubscribeFromCurrentProject();

      const { bucket, path, projectName } = _projectState.current;
      const renameRes = await renameFile({
        name: `${projectName}${dialProjectFileExtension}`,
        bucket,
        path,
        newName,
      });

      if (!renameRes) {
        displayToast('error', `Renaming of project to "${newName}" failed`);
        // eslint-disable-next-line no-console
        console.warn(
          'Redirect to home because renaming of current project failed'
        );
        closeCurrentProject();

        return;
      }

      closeCurrentProject(true);

      navigate(
        getProjectNavigateUrl({
          projectName: newName,
          projectBucket: bucket,
          projectPath: path,
          projectSheetName: currentSheetName,
        }),
        {
          replace: true,
        }
      );
    },
    [
      closeCurrentProject,
      currentSheetName,
      navigate,
      renameFile,
      unsubscribeFromCurrentProject,
    ]
  );

  const cloneCurrentProject = useCallback(async () => {
    if (!_projectState.current || !userBucket) return;

    const { bucket, projectName, path } = _projectState.current;

    toast.loading(`Cloning project...`, { toastId: 'loading' });

    const res = await cloneProjectRequest({
      bucket: bucket,
      name: projectName + dialProjectFileExtension,
      path: path,
      targetBucket: userBucket,
      targetPath: null,
      sheetsOverride: projectSheets,
      isReadOnly: !isProjectEditable,
    });

    toast.dismiss('loading');

    if (!res) return;

    displayToast(
      'success',
      appMessages.projectCloneSuccess(
        projectName,
        res.newClonedProjectName.replaceAll(dialProjectFileExtension, '')
      )
    );

    window.open(
      getProjectNavigateUrl({
        projectBucket: userBucket,
        projectName: res.newClonedProjectName.replaceAll(
          dialProjectFileExtension,
          ''
        ),
        projectPath: null,
        projectSheetName: currentSheetName,
      }),
      '_blank'
    );
  }, [
    cloneProjectRequest,
    currentSheetName,
    isProjectEditable,
    projectSheets,
    userBucket,
  ]);

  const renameSheet = useCallback(
    async ({
      oldName,
      newName,
      silent,
    }: {
      oldName: string;
      newName?: string;
      silent?: boolean;
    }) => {
      if (!silent) {
        renameSheetModal.current?.(oldName);

        return;
      }

      if (!_projectState.current) return;

      let newSheetName = newName;
      if (!newSheetName) {
        newSheetName = createUniqueName(
          defaultSheetName,
          projectSheets?.map((sheet) => sheet.sheetName) ?? []
        );
      }

      const oldSheetContent = _projectState.current.sheets.find(
        (sheet) => sheet.sheetName === oldName
      )?.content;

      const sheetWithSameNewName = _projectState.current.sheets.find(
        (sheet) => sheet.sheetName === newSheetName
      );

      if (sheetWithSameNewName) {
        displayToast('error', `A worksheet with this name already exists.`);

        return;
      }

      const newProjectStateRequest: ProjectState = updateSheetInProject(
        _projectState.current,
        oldName,
        {
          sheetName: newSheetName,
        }
      );
      await updateProjectOnServer(newProjectStateRequest, {
        onSuccess: () => {
          if (!_projectState.current) return;

          setCurrentSheetName(newSheetName);

          navigate(
            getProjectNavigateUrl({
              projectName: _projectState.current.projectName,
              projectBucket: _projectState.current.bucket,
              projectPath: _projectState.current.path,
              projectSheetName: newSheetName,
            }),
            {
              replace: true,
            }
          );

          // We don't have access to UndoRedoContext in higher context
          eventBus.publish({
            topic: 'AppendToHistory',
            payload: {
              historyTitle: `Rename sheet "${oldName}" to "${newSheetName}"`,
              changes: [
                {
                  sheetName: oldName,
                  content: undefined,
                },
                {
                  sheetName: newSheetName,
                  content: oldSheetContent ?? '',
                },
              ],
            },
          });
        },
        onFail: () => {
          displayToast('error', `Renaming sheet to "${newSheetName}" failed`);
        },
      });
    },
    [eventBus, navigate, projectSheets, updateProjectOnServer]
  );

  const parseSheet = useCallback(
    (content: string | undefined, isDSLChange: boolean): void => {
      try {
        const sheet = SheetReader.parseSheet(content);

        const currentTableNames: string[] = [];

        sheet.tables.forEach((table) => {
          if (table.hasDynamicFields()) {
            const cachedDynamicFields = viewGridData.getTableDynamicFields(
              table.tableName
            );

            if (cachedDynamicFields) {
              // should add cached dynamic fields to the table until new updated dynamic fields come, if we had such
              table.setDynamicFields(cachedDynamicFields);
            }
          }

          viewGridData.updateTableMeta(table, {
            highlightData: diffDataRef.current
              ? diffDataRef.current.data?.[
                  unescapeTableName(table.tableName)
                ] ?? {
                  tableHighlight: diffDataRef.current.defaultHighlight,
                }
              : undefined,
            isDSLChange,
          });

          currentTableNames.push(table.tableName);
        });

        viewGridData.removeRedundantTables(currentTableNames);
        viewGridData.clearCachedViewports();
        viewGridData.updateTableOrder(sortSheetTables(sheet.tables));

        setParsedSheet(sheet);
      } catch (error) {
        setParsedSheet(null);
        displayToast('error', appMessages.parseSheetError);
      }
    },
    [diffDataRef, viewGridData]
  );

  const updateSheetContent = useCallback(
    async (
      changedSheets: DslSheetChange[],
      {
        sendPutWorksheet = true,
        responseIds,
      }: {
        sendPutWorksheet?: boolean;
        responseIds?: ProjectAIResponseId[];
      } = {}
    ): Promise<boolean | undefined> => {
      const projectStateRef = _projectState.current;
      if (!projectStateRef || !projectName) {
        return;
      }

      const sheets = updateProjectSheets(
        changedSheets,
        projectStateRef.sheets,
        projectName
      );

      const currentSheet = sheets.find(
        (sheet) => sheet.sheetName === currentSheetName
      );
      if (!currentSheet) {
        setCurrentSheetName(sheets[0]?.sheetName);
      }

      const settings = updateAIResponseIds(projectStateRef, responseIds);
      const newProjectStateRequest = { ...projectStateRef, sheets, settings };

      if (!sendPutWorksheet) {
        setProjectState(newProjectStateRequest);

        return true;
      }

      if (sendPutWorksheet) {
        const promise = new Promise<boolean | undefined>((resolve) => {
          updateProjectOnServer(newProjectStateRequest, {
            onSuccess: () => resolve(true),
            onFail: () => resolve(undefined),
          });
        });

        return promise;
      }
    },
    [currentSheetName, projectName, setProjectState, updateProjectOnServer]
  );

  const manuallyUpdateSheetContent = useCallback(
    async (
      changeItems: DslSheetChange[],
      sendPutWorksheet = true
    ): Promise<boolean | undefined> => {
      const projectState = _projectState.current;
      if (!projectState) return;

      if (isTemporaryStateRef.current && !isTemporaryStateEditableRef.current) {
        toast.info(
          'Cannot update project due to you have pending AI changes or you are in Preview changes mode'
        );

        return;
      }

      if (!isProjectEditable) {
        toast.info(disabledTooltips.readonlyProject);

        return;
      }

      return updateSheetContent(changeItems, { sendPutWorksheet });
    },
    [
      isProjectEditable,
      isTemporaryStateEditableRef,
      isTemporaryStateRef,
      updateSheetContent,
    ]
  );

  const initialOpenSheet = useCallback(
    async ({ sheetName }: { sheetName: string }) => {
      const results = openSheet({ sheetName });

      if (!results) return;
      if (!_projectState.current) return;

      const { resultedSheetContent, resultedSheetName } = results;
      addRecentProject(
        resultedSheetName,
        _projectState.current.projectName,
        _projectState.current.bucket,
        _projectState.current.path
      );
      updateSheetContent(
        [{ sheetName: resultedSheetName, content: resultedSheetContent }],
        {
          sendPutWorksheet: false,
        }
      );

      if (!_projectState.current.sheets || !isProjectEditable) return;
      let updatedSheetContent = autoRenameTables(
        resultedSheetContent,
        resultedSheetName,
        _projectState.current.sheets
      );

      if (resultedSheetContent === updatedSheetContent) return;

      updatedSheetContent = autoRenameFields(updatedSheetContent);
      updateSheetContent([
        { sheetName: resultedSheetName, content: updatedSheetContent },
      ]);
    },
    [isProjectEditable, openSheet, updateSheetContent]
  );

  const createSheet = useCallback(
    async ({
      newName,
      silent,
    }: { newName?: string; silent?: boolean } = {}) => {
      if (!silent) {
        newSheetModal.current?.();

        return;
      }

      if (!_projectState.current) return;

      let newSheetName = newName;
      if (!newSheetName) {
        newSheetName = createUniqueName(
          defaultSheetName,
          projectSheets?.map((sheet) => sheet.sheetName) ?? []
        );
      }

      const sheetWithSameNewName = _projectState.current.sheets.find(
        (sheet) => sheet.sheetName === newSheetName
      );

      if (sheetWithSameNewName) {
        displayToast(
          'error',
          `Sheet with same name "${newName}" already exists in project`
        );

        return;
      }

      const newProjectStateRequest: ProjectState = {
        ..._projectState.current,
        sheets: _projectState.current.sheets.concat([
          {
            content: '',
            sheetName: newSheetName,
            projectName: _projectState.current.projectName,
          },
        ]),
      };
      await updateProjectOnServer(newProjectStateRequest, {
        onSuccess: () => {
          // We don't have access to UndoRedoContext in higher context
          eventBus.publish({
            topic: 'AppendToHistory',
            payload: {
              historyTitle: `Create sheet "${newSheetName}"`,
              changes: [
                {
                  sheetName: newSheetName,
                  content: '',
                },
              ],
            },
          });

          openSheet({ sheetName: newSheetName });
        },
        onFail: () => {
          displayToast('error', `Creating new sheet "${newSheetName}" failed`);
        },
      });
    },
    [eventBus, openSheet, projectSheets, updateProjectOnServer]
  );

  const deleteSheet = useCallback(
    async ({ sheetName, silent }: { sheetName: string; silent?: boolean }) => {
      if (!silent) {
        deleteSheetModal.current?.({ name: sheetName });

        return;
      }

      if (!_projectState.current) return;

      const newProjectStateRequest: ProjectState = {
        ..._projectState.current,
        sheets: _projectState.current.sheets.filter(
          (sheet) => sheet.sheetName !== sheetName
        ),
      };
      await updateProjectOnServer(newProjectStateRequest, {
        onSuccess: () => {
          if (sheetName === currentSheetName) {
            resetSheetState();

            const newSheet = newProjectStateRequest.sheets[0]?.sheetName;
            if (!newSheet) {
              createSheet({ silent: true });
            }
          }

          // We don't have access to UndoRedoContext in higher context
          eventBus.publish({
            topic: 'AppendToHistory',
            payload: {
              historyTitle: `Delete sheet "${sheetName}"`,
              changes: [{ sheetName, content: undefined }],
            },
          });
        },
        onFail: () => {
          displayToast('error', `Deleting sheet "${sheetName}" failed`);
        },
      });
    },
    [
      createSheet,
      currentSheetName,
      eventBus,
      resetSheetState,
      updateProjectOnServer,
    ]
  );

  const openProject = useCallback(
    async ({
      path,
      projectName,
      projectSheetName,
      bucket,
    }: {
      path: string | null | undefined;
      projectName: string;
      projectSheetName?: string | undefined;
      bucket: string;
    }) => {
      setLoading(true);
      navigate(
        getProjectNavigateUrl({
          projectName,
          projectBucket: bucket,
          projectPath: path,
          projectSheetName: projectSheetName,
        }),
        {
          replace: true,
        }
      );
      subscribeToProject({
        bucket,
        path,
        projectName,
      });

      const project = await getProjectFromServer({ bucket, path, projectName });

      if (!project) return;

      if (project.sheets) {
        initialOpenSheet({
          sheetName: projectSheetName ?? project.sheets[0].sheetName,
        });
      }

      if (
        remoteEtag.current !== null &&
        remoteEtag.current !== project.version
      ) {
        remoteEtag.current = project.version;
      }
    },
    [
      getProjectFromServer,
      initialOpenSheet,
      navigate,
      setLoading,
      subscribeToProject,
    ]
  );

  const shareResources = useCallback(
    async (resources: Omit<FilesMetadata, 'resourceType' | 'url'>[]) => {
      if (resources.length === 0) return;

      shareProjectModal.current?.(resources);

      return;
    },
    []
  );

  const acceptShareProject = useCallback(
    async ({
      invitationId,
      projectBucket,
      projectName,
      projectPath,
    }: {
      invitationId: string;
      projectBucket: string;
      projectName: string;
      projectPath: string | null | undefined;
    }) => {
      const acceptShare = await acceptShareRequest({ invitationId });

      if (!acceptShare) {
        // eslint-disable-next-line no-console
        console.warn('Redirect to home because of error while accepting share');
        closeCurrentProject();

        return;
      }

      navigate(
        getProjectNavigateUrl({
          projectBucket,
          projectName,
          projectPath,
        })
      );
      displayToast('info', appMessages.acceptProjectShareRequest);
    },
    [acceptShareRequest, closeCurrentProject, navigate]
  );

  const acceptShareFiles = useCallback(
    async ({ invitationId }: { invitationId: string }) => {
      const acceptShare = await acceptShareRequest({ invitationId });

      if (acceptShare) {
        displayToast('info', appMessages.acceptFilesShareRequest);
      }

      closeCurrentProject(true);
      navigate(routes.sharedWithMe);
    },
    [acceptShareRequest, closeCurrentProject, navigate]
  );

  const getFunctions = useCallback(async () => {
    if (!_projectState.current) return;

    const recordSheets = _projectState.current?.sheets.reduce((acc, curr) => {
      acc[curr.sheetName] = curr.content;

      return acc;
    }, {} as Record<string, string>);

    const functions = await getFunctionsRequest({
      worksheets: recordSheets,
    });

    if (functions) {
      setFunctions(functions);
    }
  }, [getFunctionsRequest]);

  const updateProjectList = useCallback((projectList: FilesMetadata[]) => {
    setProjects(projectList);

    cleanUpRecentProjects(projectList);
    cleanUpProjectHistory(projectList);
  }, []);

  const getProjects = useCallback(async () => {
    const projects = await getUserProjectsRequest();

    if (!projects) return;

    updateProjectList(projects);
  }, [getUserProjectsRequest, updateProjectList]);

  const closeStatusModalOnEnterOrSpace = useCallback((event: KeyboardEvent) => {
    if (event.key === KeyboardCode.Enter) {
      setStatusModalOpen(false);
    }
  }, []);

  const openStatusModal = useCallback(
    (text: string) => {
      setStatusModalText(text);
      setStatusModalOpen(true);
      window.addEventListener('keydown', closeStatusModalOnEnterOrSpace);
    },
    [closeStatusModalOnEnterOrSpace]
  );

  const closeStatusModal = useCallback(() => {
    setStatusModalOpen(false);
    window.removeEventListener('keydown', closeStatusModalOnEnterOrSpace);
  }, [closeStatusModalOnEnterOrSpace]);

  const updateSelectedCell = useCallback(
    (updatedSelectedCell: SelectedCell | null) => {
      if (isEqual(selectedCell, updatedSelectedCell)) return;

      setSelectedCell(updatedSelectedCell);
    },
    [selectedCell]
  );

  /**
   * Method similar to getCurrentProjectViewport but it allows to add virtual tables DSL to the current sheet content.
   * Also, it doesn't update the current sheet errors and compilation results.
   * Currently used to get selector (keys) values for charts.
   */
  const getVirtualProjectViewport = useCallback(
    async (viewports: Viewport[], virtualTablesDSL: string[]) => {
      if (!_projectState.current) return;

      const requestId = uniqueId();
      const worksheets = _projectState.current.sheets.reduce((acc, curr) => {
        if (curr.sheetName === currentSheetName) {
          acc[curr.sheetName] =
            curr.content + '\n' + virtualTablesDSL.join('\n');
        } else {
          acc[curr.sheetName] = curr.content;
        }

        return acc;
      }, {} as Record<string, string>);

      const controller = new AbortController();
      manageRequestLifecycle('start', controller);

      const res = await getViewportRequest({
        projectPath: encodeApiUrl(
          constructPath([
            'files',
            _projectState.current.bucket,
            _projectState.current.path,
            _projectState.current.projectName,
          ])
        ),
        viewports,
        worksheets,
        hasEditPermissions,
        controller,
      });

      if (!res) {
        manageRequestLifecycle('end', controller);

        return;
      }

      try {
        await parseSSEResponse(
          res,
          {
            onData: (parsedData: Partial<ViewportResponse>) => {
              if (parsedData.columnData) {
                onColumnDataResponse(parsedData.columnData);
              }

              if (parsedData.profile) {
                onProfileResponse(requestId, parsedData.profile);
              }

              if (parsedData.index) {
                onIndexResponse(parsedData.index);
              }
            },
          },
          controller
        );
      } catch (error) {
        // Ignore abort errors
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          displayToast('error', appMessages.calculateError);
        }
      } finally {
        manageRequestLifecycle('end', controller);
      }
    },
    [
      currentSheetName,
      getViewportRequest,
      onColumnDataResponse,
      onProfileResponse,
      onIndexResponse,
      hasEditPermissions,
      manageRequestLifecycle,
    ]
  );

  const getCurrentProjectViewport = useCallback(
    async (viewports: Viewport[], overrideCurrentSheetContent?: string) => {
      if (!_projectState.current) return;

      const worksheets = _projectState.current.sheets.reduce((acc, curr) => {
        acc[curr.sheetName] = curr.content;

        if (
          curr.sheetName === currentSheetName &&
          overrideCurrentSheetContent
        ) {
          acc[curr.sheetName] = overrideCurrentSheetContent;
        } else if (
          curr.sheetName === currentSheetName &&
          parsedSheet?.editableSheet &&
          !overrideCurrentSheetContent
        ) {
          acc[curr.sheetName] = addChartFiltersToDefaultViewportRequest(
            parsedSheet.clone().editableSheet,
            viewports,
            viewGridData,
            acc[curr.sheetName]
          );
        }

        return acc;
      }, {} as Record<string, string>);

      const requestId = uniqueId();
      viewGridData.startRequest(requestId);

      const controller = new AbortController();
      manageRequestLifecycle('start', controller);

      const res = await getViewportRequest({
        projectPath: encodeApiUrl(
          constructPath([
            'files',
            _projectState.current.bucket,
            _projectState.current.path,
            _projectState.current.projectName,
          ])
        ),
        viewports,
        worksheets,
        hasEditPermissions,
        controller,
      });

      if (!res) {
        manageRequestLifecycle('end', controller);
        viewGridData.finishRequest(requestId);

        return;
      }

      try {
        await parseSSEResponse(
          res,
          {
            onData: (parsedData: Partial<ViewportResponse>) => {
              if (parsedData.columnData) {
                onColumnDataResponse(parsedData.columnData);
              }

              if (parsedData.profile) {
                onProfileResponse(requestId, parsedData.profile);
              }

              if (parsedData.index) {
                onIndexResponse(parsedData.index);
                setIndexErrors(viewGridData.getIndexErrors());
              }

              if (parsedData.compileResult) {
                if (parsedData.compileResult.compilationErrors) {
                  viewGridData.setCompilationErrors(
                    parsedData.compileResult.compilationErrors
                  );
                  setCurrentSheetCompilationErrors(
                    parsedData.compileResult.compilationErrors
                  );
                }

                setFieldInfos(parsedData.compileResult.fieldInfo ?? []);

                parsedData.compileResult.sheets?.forEach((sheet) => {
                  if (sheet.name === currentSheetName) {
                    viewGridData.setParsingErrors(sheet.parsingErrors);
                    setCurrentSheetParsingErrors(sheet.parsingErrors);

                    return;
                  }
                });
              }
            },
          },
          controller
        );
        viewGridData.finishRequest(requestId);
      } catch (error) {
        // Ignore abort errors
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          displayToast('error', appMessages.calculateError);
        }
        viewGridData.finishRequest(requestId);
      } finally {
        manageRequestLifecycle('end', controller);
      }
    },
    [
      hasEditPermissions,
      currentSheetName,
      getViewportRequest,
      onColumnDataResponse,
      onProfileResponse,
      onIndexResponse,
      viewGridData,
      parsedSheet,
      manageRequestLifecycle,
    ]
  );

  useEffect(() => {
    setTimeout(() =>
      window.addEventListener('keydown', closeStatusModalOnEnterOrSpace)
    );

    return () => {
      window.removeEventListener('keydown', closeStatusModalOnEnterOrSpace);
    };
  }, [closeStatusModalOnEnterOrSpace, statusModalOpen]);

  useEffect(() => {
    const subscription = viewGridData.tableDynamicFieldsLoad$.subscribe(
      ({ tableName, dynamicFields }) => {
        setParsedSheet((parsedSheet) => {
          if (!parsedSheet) return parsedSheet;

          const newParsedSheet = parsedSheet.clone();

          const tableToUpdate = newParsedSheet.tables.find(
            (table) => table.tableName === tableName
          );

          if (!tableToUpdate) return parsedSheet;

          tableToUpdate.setDynamicFields(dynamicFields);

          setParsedSheets((parsedSheets) => {
            if (!parsedSheets || !currentSheetName) return parsedSheets;

            parsedSheets[currentSheetName] = newParsedSheet as ParsedSheet;

            return parsedSheets;
          });

          return newParsedSheet;
        });

        viewGridData.triggerTableDynamicFieldsRequest();
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [currentSheetName, viewGridData]);

  useEffect(() => {
    const updatedParsedSheets: ParsedSheets = {};

    for (const sheet of projectSheets || []) {
      try {
        const parsedSheet = SheetReader.parseSheet(sheet.content);

        updatedParsedSheets[sheet.sheetName] = parsedSheet;
      } catch (error) {
        // empty
      }
    }

    if (Object.keys(updatedParsedSheets).length === 0) {
      setParsedSheets({});

      return;
    }
    setParsedSheets(updatedParsedSheets);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectSheets, projectName, projectBucket, projectPath]);

  useEffect(() => {
    const handleDataUpdate = () => {
      const runtimeErrors = viewGridData.getRuntimeErrors();
      setRuntimeErrors(runtimeErrors.length > 0 ? runtimeErrors : null);
    };

    handleDataUpdate();

    const dataUpdateSubscription =
      viewGridData.shouldUpdate$.subscribe(handleDataUpdate);

    return () => {
      dataUpdateSubscription.unsubscribe();
    };
  }, [viewGridData]);

  useEffect(() => {
    getFunctions();
  }, [getFunctions, currentSheetContent]);

  useEffect(() => {
    cleanUpProjectHistory();
  }, [projectName]);

  useEffect(() => {
    parseSheet(currentSheetContent ?? undefined, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSheetContent]);

  useEffect(() => {
    parseSheet(currentSheetContent ?? undefined, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTemporaryState, isTemporaryStateEditable]);

  const value = useMemo(
    () => ({
      projectName,
      projectSheets,
      projectVersion,
      projectBucket,
      projectPath,
      projectPermissions,
      isProjectEditable,
      isProjectShareable,

      projects,

      sheetName: currentSheetName,
      sheetContent: currentSheetContent,
      sheetErrors: currentSheetParsingErrors,
      compilationErrors: currentSheetCompilationErrors,
      runtimeErrors,
      indexErrors,

      parsedSheet,
      parsedSheets,

      selectedCell,

      functions,

      fieldInfos,

      isProjectChangedOnServerByUser,

      isProjectReadonlyByUser,
      setIsProjectReadonlyByUser,

      isProjectEditingDisabled,
      setIsProjectEditingDisabled,

      diffData,
      setDiffData,

      beforeTemporaryState,
      startTemporaryState,
      resolveTemporaryState,
      setIsTemporaryStateEditable,

      openProject,
      closeCurrentProject,
      createProject,
      deleteProject,
      deleteCurrentProject,
      renameCurrentProject,
      cloneCurrentProject,

      acceptShareProject,
      acceptShareFiles,
      shareResources,

      openSheet,
      createSheet,
      renameSheet,
      deleteSheet,

      updateSheetContent,
      manuallyUpdateSheetContent,

      openStatusModal,

      updateSelectedCell,

      getFunctions,
      getCurrentProjectViewport,
      getVirtualProjectViewport,
      getProjects,

      isConflictResolving,
      setIsConflictResolving,
      initConflictResolving,
      resolveConflictUsingServerChanges,
      resolveConflictUsingLocalChanges,
      forkedProject,
      responseIds,
      hasEditPermissions,
      longCalcStatus,
      setLongCalcStatus,
    }),
    [
      projectName,
      projectSheets,
      projectVersion,
      projectBucket,
      projectPath,
      projectPermissions,
      isProjectEditable,
      isProjectShareable,
      projects,
      currentSheetName,
      currentSheetContent,
      currentSheetParsingErrors,
      currentSheetCompilationErrors,
      runtimeErrors,
      indexErrors,
      parsedSheet,
      parsedSheets,
      selectedCell,
      functions,
      fieldInfos,
      isProjectChangedOnServerByUser,
      isProjectReadonlyByUser,
      setIsProjectReadonlyByUser,
      isProjectEditingDisabled,
      diffData,
      setDiffData,
      beforeTemporaryState,
      startTemporaryState,
      resolveTemporaryState,
      setIsTemporaryStateEditable,
      openProject,
      closeCurrentProject,
      createProject,
      deleteProject,
      deleteCurrentProject,
      renameCurrentProject,
      cloneCurrentProject,
      acceptShareProject,
      acceptShareFiles,
      shareResources,
      openSheet,
      createSheet,
      renameSheet,
      deleteSheet,
      updateSheetContent,
      manuallyUpdateSheetContent,
      openStatusModal,
      updateSelectedCell,
      getFunctions,
      getCurrentProjectViewport,
      getVirtualProjectViewport,
      getProjects,
      isConflictResolving,
      initConflictResolving,
      resolveConflictUsingServerChanges,
      resolveConflictUsingLocalChanges,
      forkedProject,
      responseIds,
      hasEditPermissions,
      longCalcStatus,
      setLongCalcStatus,
    ]
  );

  return (
    <ProjectContext.Provider value={value}>
      {children}
      <NewProject newProjectModal={newProjectModal} />
      <DeleteProject deleteProjectModal={deleteProjectModal} />
      <NewSheet newSheetModal={newSheetModal} />
      <ShareFiles shareProjectModal={shareProjectModal} />
      <RenameProject renameProjectModal={renameProjectModal} />
      <RenameSheet renameSheetModal={renameSheetModal} />
      <DeleteSheet deleteSheetModal={deleteSheetModal} />
      <Modal
        cancelButtonProps={{
          style: { display: 'none' },
        }}
        okButtonProps={{
          className: cx(modalFooterButtonClasses, primaryButtonClasses),
        }}
        open={statusModalOpen}
        title={statusModalText}
        onCancel={closeStatusModal}
        onOk={closeStatusModal}
      />
    </ProjectContext.Provider>
  );
}
