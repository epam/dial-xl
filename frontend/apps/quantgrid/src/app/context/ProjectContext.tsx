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
import {
  ParsedSheet,
  ParsedSheets,
  ParsedTable,
  SheetReader,
} from '@frontend/parser';
import { SelectedCell } from '@frontend/spreadsheet';

import { routes } from '../../AppRoutes';
import {
  DeleteModalRefFunction,
  DeleteProjectModalRefFunction,
  ModalRefFunction,
  NewProjectModalRefFunction,
  RenameModalRefFunction,
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
import { useApiRequests, useRenameFile } from '../hooks';
import useEventBus from '../hooks/useEventBus';
import {
  addRecentProject,
  appendInitialStateToProjectHistory,
  autoRenameFields,
  autoRenameTables,
  cleanUpChartKeysByProjects,
  cleanUpProjectChartKeys,
  createUniqueName,
  deleteProjectHistory,
  deleteRecentProjectFromRecentProjects,
  deleteSheetHistory,
  EventBusMessages,
  renameSheetHistory,
} from '../services';
import {
  constructPath,
  displayToast,
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
    sheetName: string,
    content: string,
    sendPutWorksheet?: boolean
  ) => Promise<boolean | undefined>;
  manuallyUpdateSheetContent: (
    sheetName: string,
    sheetContent: string
  ) => Promise<boolean | undefined>;

  updateSelectedCell: (selectedCell: SelectedCell | null) => void;
  openStatusModal: (text: string) => void;

  getDimensionalSchema: (formula: string) => void;
  getFunctions: () => void;
  getCurrentProjectViewport: (viewports: Viewport[]) => void;
  getProjects: () => void;

  updateIsAIPendingChanges: (isPending: boolean) => void;
  updateIsAIPendingBanner: (isVisible: boolean) => void;
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
    getDimensionalSchema: getDimensionalSchemaRequest,
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
  const projectSubscriptionEvents = useRef<NotificationEvent[]>([]);
  const isProjectUpdateActive = useRef(false);

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
  const projectSheets = useMemo(
    () => projectState?.sheets ?? null,
    [projectState?.sheets]
  );
  const currentSheet = useMemo(
    () =>
      projectSheets?.find((sheet) => sheet.sheetName === currentSheetName) ??
      null,
    [currentSheetName, projectSheets]
  );
  const currentSheetContent = useMemo(
    () => currentSheet?.content ?? null,
    [currentSheet?.content]
  );

  const [projectPermissions, setProjectPermissions] = useState<
    ResourcePermission[]
  >([]);
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

  const tablesDiffData = useMemo(() => {
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
  }, [parsedSheets, previousParsedSheets]);

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

      if (!skipNavigate) {
        navigate(routes.home);
      }
    },
    [navigate, setProjectState, unsubscribeFromCurrentProject]
  );

  const handleProjectNotifications = useCallback(
    async (data: NotificationEvent) => {
      if (isProjectUpdateActive.current) {
        projectSubscriptionEvents.current.push(data);
      }

      switch (data.action) {
        case 'DELETE':
          displayToast('info', appMessages.currentProjectRemoved);
          closeCurrentProject();
          break;
        case 'UPDATE':
          if (
            data.etag &&
            data.etag !== _projectState.current?.version &&
            _projectState.current &&
            _projectState.current.bucket &&
            _projectState.current.projectName
          ) {
            const proj = await getProjectRequest({
              bucket: _projectState.current.bucket,
              name: _projectState.current.projectName,
              path: _projectState.current.path,
            });

            if (proj) {
              setProjectState(proj);
            }
          }
          break;
        default:
          break;
      }
    },
    [closeCurrentProject, getProjectRequest, setProjectState]
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
            const proj = await getProjectRequest({
              name: projectName,
              bucket,
              path,
            });

            if (proj?.version !== _projectState.current?.version) {
              displayToast('info', appMessages.versionMismatch);
            }
          }

          retries = 0;

          return await parseSSEResponse(
            res,
            { onData: handleProjectNotifications },
            projectSubscriptionControllerRef.current
          );
        } catch (e) {
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
    [getFileNotificationsRequest, getProjectRequest, handleProjectNotifications]
  );

  const processProjectSubscriptionEvents = useCallback(() => {
    let isProjectVersionFound = false;
    projectSubscriptionEvents.current.forEach((event) => {
      if (!isProjectVersionFound) {
        if (event.etag === _projectState.current?.version) {
          isProjectVersionFound = true;
        }

        return;
      }

      handleProjectNotifications(event);
    });
  }, [handleProjectNotifications]);

  const createProject = useCallback(
    async ({
      newName,
      path,
      bucket,
      silent,
      onSuccess,
      openInNewTab,
    }: {
      path?: string | null;
      bucket?: string | null;
      newName?: string;
      silent?: boolean;
      onSuccess?: () => void;
      openInNewTab?: boolean;
    } = {}) => {
      if (!userBucket) return;

      if (!silent) {
        newProjectModal.current?.({
          projectPath: path,
          projectBucket: bucket ?? userBucket,
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

      const newProjectStateRequest: ProjectState = updateSheetInProject(
        _projectState.current,
        oldName,
        {
          sheetName: newSheetName,
        }
      );
      isProjectUpdateActive.current = true;
      const newProjectState = await putProjectRequest(newProjectStateRequest);

      if (!newProjectState) {
        displayToast('error', `Renaming sheet to "${newSheetName}" failed`);

        return;
      }

      setCurrentSheetName(newSheetName);
      setProjectState(newProjectState);
      isProjectUpdateActive.current = false;
      processProjectSubscriptionEvents();

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
      renameSheetHistory(
        oldName,
        newSheetName,
        _projectState.current.projectName,
        _projectState.current.bucket,
        _projectState.current.path
      );
    },
    [
      navigate,
      processProjectSubscriptionEvents,
      projectSheets,
      putProjectRequest,
      setProjectState,
    ]
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
        viewGridData.updateTableOrder(sheet.tables.map((t) => t.tableName));

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
      sheetName: string,
      content: string,
      sendPutWorksheet = true
    ): Promise<boolean | undefined> => {
      if (!_projectState.current) {
        return;
      }

      const oldSheetContent = currentSheetContent;

      const newProjectStateRequest = updateSheetInProject(
        _projectState.current,
        sheetName,
        {
          content,
        }
      );

      if (!sendPutWorksheet) {
        setProjectState(newProjectStateRequest);

        return true;
      }

      if (sendPutWorksheet) {
        if (oldSheetContent !== null) {
          appendInitialStateToProjectHistory(
            sheetName,
            oldSheetContent,
            _projectState.current.projectName,
            _projectState.current.bucket,
            _projectState.current.path
          );
        }

        isProjectUpdateActive.current = true;
        const newProjectState = await putProjectRequest(newProjectStateRequest);

        if (newProjectState) {
          setProjectState(newProjectState);
        }
        isProjectUpdateActive.current = false;
        processProjectSubscriptionEvents();

        return !!newProjectState;
      }
    },
    [
      currentSheetContent,
      processProjectSubscriptionEvents,
      putProjectRequest,
      setProjectState,
    ]
  );

  const manuallyUpdateSheetContent = useCallback(
    async (
      sheetNameToChange: string,
      content: string
    ): Promise<boolean | undefined> => {
      const projectState = _projectState.current;
      if (!projectState) return;

      if (isAIPendingChanges) {
        toast.info(
          'Cannot update sheet due to you have pending AI changes. Please accept or discard them'
        );

        return;
      }

      if (sheetNameToChange === currentSheetName) {
        return updateSheetContent(sheetNameToChange, content);
      } else if (_projectState.current) {
        const sheet = projectSheets?.find(
          (sheet) => sheet.sheetName === sheetNameToChange
        );
        if (sheet) {
          appendInitialStateToProjectHistory(
            sheetNameToChange,
            sheet.content,
            projectState.projectName,
            projectState.bucket,
            projectState.path
          );
        }

        const newProjectStateRequest = updateSheetInProject(
          _projectState.current,
          sheetNameToChange,
          {
            content,
          }
        );
        isProjectUpdateActive.current = true;
        const newProjectState = await putProjectRequest(newProjectStateRequest);

        if (newProjectState) {
          setProjectState(newProjectState);
        }
        isProjectUpdateActive.current = false;
        processProjectSubscriptionEvents();

        return !!newProjectState;
      }
    },
    [
      isAIPendingChanges,
      currentSheetName,
      updateSheetContent,
      projectSheets,
      putProjectRequest,
      processProjectSubscriptionEvents,
      setProjectState,
    ]
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
      updateSheetContent(sheetName, sheetContent, false);

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
      updateSheetContent(sheetName, updatedSheetContent);
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
      isProjectUpdateActive.current = true;
      const newProjectState = await putProjectRequest(newProjectStateRequest);

      if (!newProjectState) {
        displayToast('error', `Creating new sheet "${newSheetName}" failed`);

        return;
      }

      setProjectState(newProjectState);
      isProjectUpdateActive.current = false;
      processProjectSubscriptionEvents();
      openSheet({ sheetName: newSheetName });
    },
    [
      openSheet,
      processProjectSubscriptionEvents,
      projectSheets,
      putProjectRequest,
      setProjectState,
    ]
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
      isProjectUpdateActive.current = true;
      const newProjectState = await putProjectRequest(newProjectStateRequest);

      if (!newProjectState) {
        displayToast('error', `Deleting sheet "${sheetName}" failed`);

        return;
      }

      deleteSheetHistory(
        sheetName,
        _projectState.current.projectName,
        _projectState.current.bucket,
        _projectState.current.path
      );
      setProjectState(newProjectState);
      isProjectUpdateActive.current = false;
      processProjectSubscriptionEvents();

      if (sheetName === currentSheetName) {
        resetSheetState();

        const newSheet = newProjectState.sheets[0]?.sheetName;
        if (!newSheet) {
          createSheet({ silent: true });
        } else {
          openSheet({ sheetName: newSheet });
        }
      }
    },
    [
      createSheet,
      currentSheetName,
      openSheet,
      processProjectSubscriptionEvents,
      putProjectRequest,
      resetSheetState,
      setProjectState,
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
          `Project "${projectName}" cannot be opened because it doesn't exist or has been removed.`
        );

        return;
      }

      setProjectPermissions(projectMetadata?.permissions ?? []);
      setProjectState(project);

      if (project.sheets) {
        openSheet({
          sheetName: projectSheetName ?? project.sheets[0].sheetName,
        });
      }
    },
    [
      getProjectRequest,
      getResourceMetadataRequest,
      navigate,
      openSheet,
      setLoading,
      setProjectState,
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

  const getDimensionalSchema = useCallback(
    async (formula: string) => {
      const recordSheets =
        _projectState.current?.sheets.reduce((acc, curr) => {
          acc[curr.sheetName] = curr.content;

          return acc;
        }, {} as Record<string, string>) ?? {};

      const dimensionalSchema = await getDimensionalSchemaRequest({
        formula,
        worksheets: recordSheets,
      });

      if (dimensionalSchema) {
        eventBus.publish({
          topic: 'DimensionalSchemaResponse',
          payload: dimensionalSchema,
        });
      }
    },
    [eventBus, getDimensionalSchemaRequest]
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

    cleanUpChartKeysByProjects(projectList);
    // cleanUpRecentProjects(projectList);
    // cleanUpProjectHistory(projectList);
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

  const getCurrentProjectViewport = useCallback(
    async (viewports: Viewport[]) => {
      if (!_projectState.current) return;

      const worksheets = _projectState.current.sheets.reduce((acc, curr) => {
        acc[curr.sheetName] = curr.content;

        return acc;
      }, {} as Record<string, string>);

      const res = await getViewportRequest({
        projectName: _projectState.current.projectName,
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

          const newParsedSheet = { ...parsedSheet };

          const tableToUpdate = newParsedSheet.tables.find(
            (table) => table.tableName === tableName
          );

          if (!tableToUpdate) return parsedSheet;

          tableToUpdate.setDynamicFields(dynamicFields);

          setParsedSheets((parsedSheets) => {
            if (!parsedSheets || !currentSheetName) return parsedSheets;

            parsedSheets[currentSheetName] = newParsedSheet;

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

    if (!projectName || !projectBucket) return;

    cleanUpProjectChartKeys(
      updatedParsedSheets,
      projectName,
      projectBucket,
      projectPath
    );
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

      getDimensionalSchema,
      getFunctions,
      getCurrentProjectViewport,
      getProjects,
    }),
    [
      projectName,
      projectSheets,
      projectVersion,
      projectBucket,
      projectPath,
      projectPermissions,
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
      getDimensionalSchema,
      getFunctions,
      getCurrentProjectViewport,
      getProjects,
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
