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
  DiffData,
  FilesMetadata,
  FunctionInfo,
  KeyboardCode,
  modalFooterButtonClasses,
  NotificationEvent,
  parseSSEResponse,
  ParsingError,
  primaryButtonClasses,
  ProjectState,
  ResourcePermission,
  RuntimeError,
  Viewport,
  ViewportResponse,
  WorksheetState,
} from '@frontend/common';
import { ParsedSheet, ParsedSheets, SheetReader } from '@frontend/parser';

import { routes } from '../../AppRoutes';
import {
  DeleteModalRefFunction,
  DeleteProjectModalRefFunction,
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
} from '../services';
import { DslSheetChange } from '../types/dslSheetChange';
import {
  constructPath,
  displayToast,
  encodeApiUrl,
  getProjectNavigateUrl,
  updateSheetInProject,
} from '../utils';
import { getTableDiff } from '../utils/diff';
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
  isProjectEditable: boolean;

  projects: FilesMetadata[];

  sheetName: string | null;
  sheetContent: string | null;
  sheetErrors: ParsingError[] | null;
  compilationErrors: CompilationError[] | null;
  runtimeErrors: RuntimeError[] | null;

  parsedSheet: ParsedSheet | null;
  parsedSheets: ParsedSheets;

  selectedCell: SelectedCell | null;

  functions: FunctionInfo[];

  isAIPendingChanges: boolean;
  isAIPendingBanner: boolean;
  tablesDiffData: Record<string, DiffData>;

  isOverrideProjectBanner: boolean;
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
  cloneCurrentProject: () => void;

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
    sendPutWorksheet?: boolean
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

  updateIsAIPendingChanges: (isPending: boolean) => void;
  updateIsAIPendingBanner: (isVisible: boolean) => void;

  setIsOverrideProjectBanner: (isVisible: boolean) => void;
  resolveConflictUsingServerChanges: () => void;
  resolveConflictUsingLocalChanges: () => void;
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
  } = useApiRequests();
  const { clearTablesData, viewGridData, onColumnDataResponse } =
    useContext(ViewportContext);
  const navigate = useNavigate();
  const eventBus = useEventBus<EventBusMessages>();
  const { renameFile } = useRenameFile();

  const [currentSheetName, setCurrentSheetName] = useState<string | null>(null);

  const projectSubscriptionControllerRef = useRef<AbortController | null>(null);

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
  const isProjectEditable = useMemo(() => {
    return (['READ', 'WRITE'] as ResourcePermission[]).every((permission) =>
      projectPermissions.includes(permission)
    );
  }, [projectPermissions]);
  const [currentSheetCompilationErrors, setCurrentSheetCompilationErrors] =
    useState<CompilationError[]>([]);
  const [currentSheetParsingErrors, setCurrentSheetParsingErrors] = useState<
    ParsingError[]
  >([]);
  const [runtimeErrors, setRuntimeErrors] = useState<RuntimeError[] | null>(
    null
  );

  const [projects, setProjects] = useState<FilesMetadata[]>([]);

  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [parsedSheet, setParsedSheet] = useState<ParsedSheet | null>(null);
  const [parsedSheets, setParsedSheets] = useState<ParsedSheets>({});
  const [previousParsedSheets, setPreviousParsedSheets] =
    useState<ParsedSheets>({});

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
  const [isAIPendingChanges, setIsAIPendingChanges] = useState(false);
  const [isAIPendingBanner, setIsAIPendingBanner] = useState(false);
  const [isOverrideProjectBanner, setIsOverrideProjectBanner] = useState(false);

  /// New sync variables
  const remoteEtag = useRef<string | null>(null);
  const inflightRequest = useRef<'get' | 'put' | null>(null);
  const localDsl = useRef<WorksheetState[] | null>(null);
  const inflightDsl = useRef<WorksheetState[] | null>(null);
  ///

  const tablesDiffData = useMemo(() => {
    if (!isAIPendingChanges) return {};

    const oldTables = Object.values(previousParsedSheets)
      .map((sheet) => sheet.tables)
      .flat();
    const newTables = Object.values(parsedSheets)
      .map((sheet) => sheet.tables)
      .flat();

    const tablesDiff = newTables.reduce((acc, curr) => {
      const oldTable = oldTables.find(
        (table) => table.tableName === curr.tableName
      );
      acc[curr.tableName] = getTableDiff(curr, oldTable);

      return acc;
    }, {} as Record<string, DiffData>);

    return tablesDiff;
  }, [isAIPendingChanges, parsedSheets, previousParsedSheets]);

  const setProjectState = useCallback(
    (newProjectState: ProjectState | null) => {
      _projectState.current = newProjectState;

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
  }, []);

  const resetProjectState = useCallback(() => {
    setProjectState(null);
    setFunctions([]);
    setProjects([]);

    resetSheetState();
  }, [resetSheetState, setProjectState]);

  const unsubscribeFromCurrentProject = useCallback(() => {
    if (
      projectSubscriptionControllerRef.current &&
      !projectSubscriptionControllerRef.current?.signal.aborted
    ) {
      projectSubscriptionControllerRef.current.abort();
    }
  }, []);

  const updateIsAIPendingChanges = useCallback((isPending: boolean) => {
    setIsAIPendingChanges(isPending);
  }, []);

  const updateIsAIPendingBanner = useCallback((isVisible: boolean) => {
    setIsAIPendingBanner(isVisible);
  }, []);

  const closeCurrentProject = useCallback(
    (skipNavigate?: boolean) => {
      setParsedSheet(null);
      setParsedSheets({});
      setFunctions([]);
      setProjectState(null);
      setProjectPermissions([]);
      unsubscribeFromCurrentProject();
      setIsAIPendingChanges(false);

      remoteEtag.current = null;
      inflightRequest.current = null;
      localDsl.current = null;
      inflightDsl.current = null;

      if (!skipNavigate) {
        navigate(routes.home);
      }
    },
    [navigate, setProjectState, unsubscribeFromCurrentProject]
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
        navigate(routes.home);
        displayToast(
          'error',
          `Project "${projectName}" cannot be fetched because it doesn't exist or has been removed.`
        );

        return;
      }

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
          setIsOverrideProjectBanner(true);
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
      getProjectRequest,
      getResourceMetadataRequest,
      navigate,
      setLoading,
      setProjectState,
    ]
  );

  const handleProjectNotifications = useCallback(
    async (data: NotificationEvent) => {
      switch (data.action) {
        case 'DELETE':
          displayToast('info', appMessages.currentProjectRemoved);
          closeCurrentProject();
          break;
        case 'UPDATE': {
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
    [closeCurrentProject, getProjectFromServer]
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

          if (retries > 0) {
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

      // We are doing optimistic update
      setProjectState({
        ...updatedStateRequest,
        // We need to have latest version in project state
        version: _projectState.current!.version!,
      });

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
    [getProjectFromServer, putProjectRequest, setProjectState]
  );

  const resolveConflictUsingServerChanges = useCallback(() => {
    if (!_projectState.current || !localDsl.current) return;

    setIsOverrideProjectBanner(false);

    // Just set dsl from server as local
    setProjectState({
      ..._projectState.current,
      sheets: localDsl.current,
    });
  }, [setProjectState]);

  const resolveConflictUsingLocalChanges = useCallback(() => {
    if (!_projectState.current) return;

    setIsOverrideProjectBanner(false);

    // Send put request with local state
    updateProjectOnServer(_projectState.current, {});
  }, [updateProjectOnServer]);

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
          navigate(routes.home);
          resetProjectState();

          setCurrentSheetName(currentSheetName);
        }
      }

      onSuccess?.();

      return {};
    },
    [
      currentSheetName,
      deleteProjectRequest,
      navigate,
      resetProjectState,
      setLoading,
    ]
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
        navigate(routes.home);

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
  }, [cloneProjectRequest, currentSheetName, userBucket]);

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
    (content?: string): void => {
      try {
        const sheet = SheetReader.parseSheet(content);

        const currentTableNames: string[] = [];

        const prevParsedSheet = currentSheetName
          ? previousParsedSheets[currentSheetName]
          : undefined;

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

          const prevValue = prevParsedSheet?.tables.find(
            ({ tableName }) => tableName === table.tableName
          );
          const prevTablesDiff = getTableDiff(table, prevValue);

          viewGridData.updateTableMeta(
            table,
            isAIPendingChanges ? prevTablesDiff : undefined
          );

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
    [currentSheetName, isAIPendingChanges, previousParsedSheets, viewGridData]
  );

  const updateSheetContent = useCallback(
    async (
      changedSheets: DslSheetChange[],
      sendPutWorksheet = true
    ): Promise<undefined> => {
      const projectStateRef = _projectState.current;
      if (!projectStateRef || !projectName) {
        return;
      }

      const changedSheetsCopy = changedSheets.slice();
      const sheets = projectStateRef.sheets
        .map((sheet) => {
          const changedSheetIndex = changedSheetsCopy.findIndex(
            (changedSheet) => sheet.sheetName === changedSheet.sheetName
          );

          if (changedSheetIndex !== -1) {
            const data = changedSheetsCopy[changedSheetIndex];
            changedSheetsCopy.splice(changedSheetIndex, 1);

            return { ...sheet, ...data };
          }

          return sheet;
        })
        .filter((sheet) => sheet.content != null)
        .concat(
          changedSheetsCopy
            .filter((sheet) => sheet.content != null)
            .map((sheet) => ({
              ...sheet,
              content: sheet.content,
              projectName: projectName!,
            }))
        ) as WorksheetState[];

      const currentSheet = sheets.find(
        (sheet) => sheet.sheetName === currentSheetName
      );
      if (!currentSheet) {
        setCurrentSheetName(sheets[0]?.sheetName);
      }

      const newProjectStateRequest = { ...projectStateRef, sheets };

      if (!sendPutWorksheet) {
        setProjectState(newProjectStateRequest);

        return;
      }

      if (sendPutWorksheet) {
        await updateProjectOnServer(newProjectStateRequest, {});
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

      if (isAIPendingChanges) {
        toast.info(
          'Cannot update sheet due to you have pending AI changes. Please accept or discard them'
        );

        return;
      }

      return updateSheetContent(changeItems, sendPutWorksheet);
    },
    [isAIPendingChanges, updateSheetContent]
  );

  const openSheet = useCallback(
    async ({ sheetName }: { sheetName: string }) => {
      if (sheetName === currentSheetName || !sheetName) return;

      clearTablesData();

      const projectState = _projectState.current;
      if (!projectState) {
        return;
      }

      const sheetContent = projectState.sheets.find(
        (sheet) => sheet.sheetName === sheetName
      )?.content;

      if (sheetContent === undefined || sheetContent === null) {
        navigate(routes.home);

        return;
      }

      setCurrentSheetName(sheetName);
      setParsedSheet(null);
      addRecentProject(
        sheetName,
        projectState.projectName,
        projectState.bucket,
        projectState.path
      );
      updateSheetContent([{ sheetName, content: sheetContent }], false);

      navigate(
        getProjectNavigateUrl({
          projectName: projectState.projectName,
          projectBucket: projectState.bucket,
          projectPath: projectState.path,
          projectSheetName: sheetName,
        }),
        { replace: true }
      );

      if (!projectState.sheets) return;
      let updatedSheetContent = autoRenameTables(
        sheetContent,
        sheetName,
        projectState.sheets
      );

      if (sheetContent === updatedSheetContent) return;

      updatedSheetContent = autoRenameFields(updatedSheetContent);
      updateSheetContent([{ sheetName, content: updatedSheetContent }]);
    },
    [clearTablesData, currentSheetName, navigate, updateSheetContent]
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
            } else {
              openSheet({ sheetName: newSheet });
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
      openSheet,
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
        openSheet({
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
    [getProjectFromServer, navigate, openSheet, setLoading, subscribeToProject]
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
        navigate(routes.home);

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
    [acceptShareRequest, navigate]
  );

  const acceptShareFiles = useCallback(
    async ({ invitationId }: { invitationId: string }) => {
      const acceptShare = await acceptShareRequest({ invitationId });

      if (acceptShare) {
        displayToast('info', appMessages.acceptFilesShareRequest);
      }

      navigate(routes.sharedWithMe);
    },
    [acceptShareRequest, navigate]
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

      const worksheets = _projectState.current.sheets.reduce((acc, curr) => {
        if (curr.sheetName === currentSheetName) {
          acc[curr.sheetName] =
            curr.content + '\n' + virtualTablesDSL.join('\n');
        } else {
          acc[curr.sheetName] = curr.content;
        }

        return acc;
      }, {} as Record<string, string>);

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
      });

      if (!res) return;

      try {
        await parseSSEResponse(res, {
          onData: (parsedData: Partial<ViewportResponse>) => {
            if (parsedData.columnData) {
              onColumnDataResponse(parsedData.columnData);
            }
          },
        });
      } catch {
        displayToast('error', appMessages.calculateError);
      }
    },
    [currentSheetName, getViewportRequest, onColumnDataResponse]
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
          !overrideCurrentSheetContent
        ) {
          acc[curr.sheetName] = addChartFiltersToDefaultViewportRequest(
            viewports,
            viewGridData,
            acc[curr.sheetName]
          );
        }

        return acc;
      }, {} as Record<string, string>);

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
      });

      if (!res) return;

      try {
        await parseSSEResponse(res, {
          onData: (parsedData: Partial<ViewportResponse>) => {
            if (parsedData.columnData) {
              onColumnDataResponse(parsedData.columnData);
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

              parsedData.compileResult.sheets?.forEach((sheet) => {
                if (sheet.name === currentSheetName) {
                  viewGridData.setParsingErrors(sheet.parsingErrors);
                  setCurrentSheetParsingErrors(sheet.parsingErrors);

                  return;
                }
              });
            }
          },
        });
      } catch {
        displayToast('error', appMessages.calculateError);
      }
    },
    [currentSheetName, getViewportRequest, onColumnDataResponse, viewGridData]
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
    parseSheet(currentSheetContent ?? undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSheetContent, isAIPendingChanges]);

  useEffect(() => {
    if (!isAIPendingChanges) {
      setPreviousParsedSheets(parsedSheets);
    }
  }, [isAIPendingChanges, parsedSheets]);

  const value = useMemo(
    () => ({
      projectName,
      projectSheets,
      projectVersion,
      projectBucket,
      projectPath,
      projectPermissions,
      isProjectEditable,

      projects,

      sheetName: currentSheetName,
      sheetContent: currentSheetContent,
      sheetErrors: currentSheetParsingErrors,
      compilationErrors: currentSheetCompilationErrors,
      runtimeErrors,

      parsedSheet,
      parsedSheets,

      selectedCell,

      functions,

      isAIPendingChanges,
      updateIsAIPendingChanges,
      isAIPendingBanner,
      updateIsAIPendingBanner,
      tablesDiffData,

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

      isOverrideProjectBanner,
      setIsOverrideProjectBanner,
      resolveConflictUsingServerChanges,
      resolveConflictUsingLocalChanges,
    }),
    [
      projectName,
      projectSheets,
      projectVersion,
      projectBucket,
      projectPath,
      projectPermissions,
      isProjectEditable,
      projects,
      currentSheetName,
      currentSheetContent,
      currentSheetParsingErrors,
      currentSheetCompilationErrors,
      runtimeErrors,
      parsedSheet,
      parsedSheets,
      selectedCell,
      functions,
      isAIPendingChanges,
      updateIsAIPendingChanges,
      isAIPendingBanner,
      updateIsAIPendingBanner,
      tablesDiffData,
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
      isOverrideProjectBanner,
      resolveConflictUsingServerChanges,
      resolveConflictUsingLocalChanges,
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
