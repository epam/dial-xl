import {
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import isEqual from 'react-fast-compare';

import {
  ApiError,
  CompilationError,
  IndexError,
  ParsingError,
  ProjectState,
  TableHighlightDataMap,
  useStateWithRef,
  WorksheetState,
} from '@frontend/common';

import {
  useGetFunctions,
  useParsedSheets,
  useProjectEditState,
  useRuntimeErrors,
  useSheetNavigation,
  useViewportRequests,
} from '../../hooks';
import useEventBus from '../../hooks/useEventBus';
import { EventBusMessages } from '../../services';
import { ProjectResourceContext } from './ProjectResourceContext';
import { ProjectSessionContext } from './ProjectSessionContext';

export function ProjectSessionProvider({
  children,
}: PropsWithChildren<Record<string, unknown>>) {
  const eventBus = useEventBus<EventBusMessages>();
  const {
    projectState,
    _projectState,
    updateProjectOnServer,
    getProjectFromServer,
    localDsl,
    projectName,
    projectBucket,
    projectPath,
    projectPermissions,
    longCalcStatus,
    setLongCalcStatus,
    cancelAllViewportRequests,
    manageRequestLifecycle,
  } = useContext(ProjectResourceContext);

  const [currentSheetName, setCurrentSheetName, currentSheetNameRef] =
    useStateWithRef<string | null>(null);

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
    [currentSheet?.content],
  );

  // Errors
  const [currentSheetCompilationErrors, setCurrentSheetCompilationErrors] =
    useState<CompilationError[]>([]);
  const [currentSheetParsingErrors, setCurrentSheetParsingErrors] = useState<
    ParsingError[]
  >([]);
  const [indexErrors, setIndexErrors] = useState<IndexError[] | null>(null);
  const { runtimeErrors, setRuntimeErrors } = useRuntimeErrors();
  const [projectDataLoadingError, setProjectDataLoadingError] =
    useState<ApiError | null>(null);
  // ---

  // Conflict resolution and temporary state
  const [isConflictResolving, setIsConflictResolving] = useState(false);
  const [isTemporaryState, setIsTemporaryState, isTemporaryStateRef] =
    useStateWithRef(false);
  const [
    isTemporaryStateEditable,
    setIsTemporaryStateEditable,
    isTemporaryStateEditableRef,
  ] = useStateWithRef(false);

  const [beforeTemporaryState, setBeforeTemporaryState] =
    useState<ProjectState | null>(null);
  const startTemporaryState = useCallback(() => {
    if (!isTemporaryState) {
      setBeforeTemporaryState(_projectState.current);
    }
    setIsTemporaryState(true);
  }, [_projectState, isTemporaryState, setIsTemporaryState]);
  // ---

  const [diffData, setDiffData, diffDataRef] =
    useStateWithRef<TableHighlightDataMap | null>(null);

  const { functions } = useGetFunctions({
    currentSheetContent,
    sheets: _projectState.current?.sheets,
    onSetProjectDataLoadingError: setProjectDataLoadingError,
  });

  const { parsedSheets, setParsedSheets, parsedSheet, setParsedSheet } =
    useParsedSheets({
      projectBucket,
      projectPath,
      projectName,
      currentSheetContent,
      currentSheetName,
      isTemporaryStateEditable,
      isTemporaryState,
      projectSheets,
      diffDataRef,
    });

  const {
    isProjectEditable,
    isProjectEditingDisabled,
    isProjectShareable,
    isProjectReadonlyByUser,
    setIsProjectReadonlyByUser,
    setIsProjectEditingDisabled,
    hasEditPermissions,
  } = useProjectEditState({
    projectBucket,
    projectName,
    projectPath,
    projectPermissions,
    isTemporaryState,
    isTemporaryStateEditable,
  });

  const resetRuntimeErrors = useCallback(() => {
    setRuntimeErrors([]);
    setIndexErrors([]);
  }, [setRuntimeErrors]);

  const resetSheetState = useCallback(() => {
    setCurrentSheetName(null);
    setParsedSheet(null);
    setCurrentSheetCompilationErrors([]);
    setCurrentSheetParsingErrors([]);
    resetRuntimeErrors();
  }, [resetRuntimeErrors, setCurrentSheetName, setParsedSheet]);

  const {
    initialOpenSheet,
    openSheet,
    manuallyUpdateSheetContent,
    updateSheetContent,
  } = useSheetNavigation({
    cancelAllViewportRequests,
    isProjectEditable,
    currentSheetNameRef,
    setCurrentSheetName,
    setParsedSheet,
    isTemporaryStateRef,
    isTemporaryStateEditableRef,
    resetRuntimeErrors,
  });

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
    [
      _projectState,
      currentSheetName,
      getProjectFromServer,
      localDsl,
      openSheet,
    ],
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

      // We need to reset the project state to server changes
      if (useServer) {
        discardTemporaryChanges(beforeTemporaryState);
      }

      // We need to just try to put a temporary state top server
      if (useTemporary) {
        updateProjectOnServer(_projectState.current, {
          isTemporaryState: isTemporaryStateRef.current,
        });
      }
    },
    [
      _projectState,
      beforeTemporaryState,
      discardTemporaryChanges,
      isTemporaryStateRef,
      setIsTemporaryState,
      updateProjectOnServer,
    ],
  );

  const initConflictResolving = useCallback(() => {
    setIsConflictResolving(true);
    startTemporaryState();
  }, [startTemporaryState]);

  const resolveConflictUsingServerChanges = useCallback(() => {
    if (!_projectState.current || !localDsl.current) return;

    setIsConflictResolving(false);

    // Set dsl from server as local
    resolveTemporaryState({ useServer: true });
  }, [_projectState, localDsl, resolveTemporaryState]);

  const resolveConflictUsingLocalChanges = useCallback(() => {
    if (!_projectState.current) return;

    setIsConflictResolving(false);

    resolveTemporaryState({ useTemporary: true });
  }, [_projectState, resolveTemporaryState]);

  const { getVirtualProjectViewport, getCurrentProjectViewport, fieldInfos } =
    useViewportRequests({
      _projectState,
      manageRequestLifecycle,
      hasEditPermissions,
      currentSheetName,
      setIndexErrors,
      parsedSheet,
      setCurrentSheetCompilationErrors,
      setCurrentSheetParsingErrors,
      onSetProjectDataLoadingError: setProjectDataLoadingError,
    });

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

  useEffect(() => {
    eventBus.subscribe('StartConflictResolving', () => {
      setIsConflictResolving(true);
      setIsTemporaryState(true);
    });

    eventBus.subscribe('CancelAllViewportRequests', () => {
      cancelAllViewportRequests();
    });
  }, [cancelAllViewportRequests, eventBus, setIsTemporaryState]);

  const value = useMemo(
    () => ({
      beforeTemporaryState,
      cancelAllViewportRequests,
      compilationErrors: currentSheetCompilationErrors,
      diffData,
      fieldInfos,
      functions,
      getCurrentProjectViewport,
      getVirtualProjectViewport,
      hasEditPermissions,
      indexErrors,
      initConflictResolving,
      initialOpenSheet,
      isConflictResolving,
      isProjectEditable,
      isProjectEditingDisabled,
      isProjectReadonlyByUser,
      isProjectShareable,
      isTemporaryState,
      isTemporaryStateEditable: isTemporaryStateEditable,
      isTemporaryStateEditableRef,
      isTemporaryStateRef,
      longCalcStatus,
      manuallyUpdateSheetContent,
      openSheet,
      parsedSheet,
      parsedSheets,
      projectDataLoadingError,
      projectSheets,
      resetSheetState,
      resolveConflictUsingLocalChanges,
      resolveConflictUsingServerChanges,
      resolveTemporaryState,
      runtimeErrors,
      setBeforeTemporaryState,
      setCurrentSheetName,
      setDiffData,
      setIsConflictResolving,
      setIsProjectEditingDisabled,
      setIsProjectReadonlyByUser,
      setIsTemporaryState,
      setIsTemporaryStateEditable,
      setLongCalcStatus,
      setParsedSheet,
      setParsedSheets,
      setProjectDataLoadingError,
      sheetContent: currentSheetContent,
      sheetErrors: currentSheetParsingErrors,
      sheetName: currentSheetName,
      startTemporaryState,
      updateSheetContent,
    }),
    [
      beforeTemporaryState,
      cancelAllViewportRequests,
      currentSheetCompilationErrors,
      currentSheetContent,
      currentSheetName,
      currentSheetParsingErrors,
      diffData,
      fieldInfos,
      functions,
      getCurrentProjectViewport,
      getVirtualProjectViewport,
      hasEditPermissions,
      indexErrors,
      initConflictResolving,
      initialOpenSheet,
      isConflictResolving,
      isProjectEditable,
      isProjectEditingDisabled,
      isProjectReadonlyByUser,
      isProjectShareable,
      isTemporaryState,
      isTemporaryStateEditable,
      isTemporaryStateEditableRef,
      isTemporaryStateRef,
      longCalcStatus,
      manuallyUpdateSheetContent,
      openSheet,
      parsedSheet,
      parsedSheets,
      projectDataLoadingError,
      projectSheets,
      resetSheetState,
      resolveConflictUsingLocalChanges,
      resolveConflictUsingServerChanges,
      resolveTemporaryState,
      runtimeErrors,
      setCurrentSheetName,
      setDiffData,
      setIsProjectEditingDisabled,
      setIsProjectReadonlyByUser,
      setIsTemporaryState,
      setIsTemporaryStateEditable,
      setLongCalcStatus,
      setParsedSheet,
      setParsedSheets,
      setProjectDataLoadingError,
      startTemporaryState,
      updateSheetContent,
    ],
  );

  return (
    <ProjectSessionContext.Provider value={value}>
      {children}
    </ProjectSessionContext.Provider>
  );
}
