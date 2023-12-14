import { Modal } from 'antd';
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
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import {
  CompilationError,
  FunctionInfo,
  KeyboardCode,
  ParsedSheets,
  ParsingError,
  ProjectState,
  RenameProjectState,
  RenameWorksheetState,
  WorksheetState,
} from '@frontend/common';
import { ParsedSheet, SheetReader } from '@frontend/parser';
import { SelectedCell } from '@frontend/spreadsheet';

import { ModalRefFunction, RenameModalRefFunction } from '../common';
import {
  DeleteProject,
  NewProject,
  NewSheet,
  OpenProject,
  RenameProject,
  RenameSheet,
} from '../components';
import { useApi, useOpenWorksheet } from '../hooks';
import {
  addRecentProject,
  autoRenameFields,
  autoRenameTables,
  cleanUpChartKeysByProjects,
  cleanUpProjectChartKeys,
  cleanUpRecentProjects,
  deleteProjectHistory,
  deleteSheetHistory,
  getRecentSheet,
  renameChartKeysProject,
  renameProjectHistory,
  renameRecentProject,
  renameSheetHistory,
  saveRecentProject,
  saveRecentSheet,
} from '../services';
import { ApiContext, AppContext, ViewportContext } from './';

const defaultSheetName = 'Sheet1';

type ProjectContextValues = {
  projects: string[];

  projectName: string | null;

  projectSheets: WorksheetState[] | null;
  sheetName: string | null;
  sheetContent: string | null;
  sheetErrors: ParsingError[] | null;
  compilationErrors: CompilationError[] | null;

  parsedSheet: ParsedSheet | null;
  parsedSheets: ParsedSheets;

  selectedCell: SelectedCell | null;

  functions: FunctionInfo[];
};

type ProjectContextActions = {
  updateSelectedCell: (selectedCell: SelectedCell | null) => void;

  updateSheetContent: (sheetName: string, sheetContent: string) => void;
  manuallyUpdateSheetContent: (sheetName: string, sheetContent: string) => void;

  createProject: ModalRefFunction;
  openProject: ModalRefFunction;
  deleteProject: ModalRefFunction;
  newSheet: ModalRefFunction;
  renameProject: RenameModalRefFunction;
  renameSheet: RenameModalRefFunction;

  updateProjectList: (projectList: string[]) => void;

  openStatusModal: (text: string) => void;
};

type ProjectContextCallbacks = {
  onCreateProjectResponse: (projectState: ProjectState) => void;
  onOpenProjectResponse: (projectState: ProjectState) => void;
  onProjectDeleteResponse: (projectState: ProjectState) => void;
  onRenameProjectResponse: (projectState: RenameProjectState) => void;
  onCloseProjectResponse: (projectState: ProjectState) => void;

  onPutSheetResponse: (worksheetState: WorksheetState) => void;
  onOpenSheetResponse: (worksheetState: WorksheetState) => void;
  onDeleteSheetResponse: (worksheetState: WorksheetState) => void;
  onRenameSheetResponse: (worksheetState: RenameWorksheetState) => void;
  onCloseSheetResponse: (worksheetState: WorksheetState) => void;

  onParallelRenameSheetResponse: (worksheetState: RenameWorksheetState) => void;
  onParallelRenameProjectResponse: (projectState: RenameProjectState) => void;
  onParallelUpdateProject: (projectState: ProjectState) => void;
  onParallelUpdateWorksheet: (worksheetState: WorksheetState) => void;

  onFunctionsResponse: (functions: FunctionInfo[]) => void;

  onReconnect: () => void;
};

export const ProjectContext = createContext<
  ProjectContextActions & ProjectContextValues & ProjectContextCallbacks
>({} as ProjectContextActions & ProjectContextValues & ProjectContextCallbacks);

export function ProjectContextProvider({
  children,
}: PropsWithChildren<Record<string, unknown>>): JSX.Element {
  const { hideLoading } = useContext(AppContext);
  const {
    putWorksheet,
    openProject: openProjectRequest,
    getFunctions,
  } = useApi();
  const { projectVersionRef, isConnectionOpened } = useContext(ApiContext);
  const { clearCachedTableData, dynamicFields } = useContext(ViewportContext);
  const openWorksheet = useOpenWorksheet();
  const navigate = useNavigate();

  const [projectName, setProjectName] = useState<string | null>(null);
  const [projectSheets, setProjectSheets] = useState<WorksheetState[] | null>(
    null
  );

  const [sheetErrors, setSheetErrors] = useState<ParsingError[] | null>(null);
  const [compilationErrors, setCompilationErrors] = useState<
    CompilationError[] | null
  >(null);
  const [sheetName, setSheetName] = useState<string | null>(null);
  const [sheetContent, setSheetContent] = useState<string | null>(null);
  const [projects, setProjects] = useState<string[]>([]);

  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [parsedSheet, setParsedSheet] = useState<ParsedSheet | null>(null);
  const [parsedSheets, setParsedSheets] = useState<ParsedSheets>({});

  const [functions, setFunctions] = useState<FunctionInfo[]>([]);

  const newProjectModal = useRef<ModalRefFunction | null>(null);
  const openProjectModal = useRef<ModalRefFunction | null>(null);
  const deleteProjectModal = useRef<ModalRefFunction | null>(null);
  const newSheetModal = useRef<ModalRefFunction | null>(null);
  const renameProjectModal = useRef<RenameModalRefFunction | null>(null);
  const renameSheetModal = useRef<RenameModalRefFunction | null>(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusModalText, setStatusModalText] = useState('');

  const createProject = useCallback(() => {
    newProjectModal.current?.();
  }, []);

  const openProject = useCallback(() => {
    openProjectModal.current?.();
  }, []);

  const deleteProject = useCallback(() => {
    deleteProjectModal.current?.();
  }, []);

  const newSheet = useCallback(() => {
    newSheetModal.current?.();
  }, []);

  const renameProject = useCallback((name: string) => {
    renameProjectModal.current?.(name);
  }, []);

  const renameSheet = useCallback((name: string) => {
    renameSheetModal.current?.(name);
  }, []);

  const updateProjectList = useCallback((projectList: string[]) => {
    setProjects(projectList);

    cleanUpChartKeysByProjects(projectList);
    cleanUpRecentProjects(projectList);
  }, []);

  const closeStatusModalOnEnterOrSpace = useCallback((event: KeyboardEvent) => {
    if (event.key === KeyboardCode.Enter) {
      setStatusModalOpen(false);
    }
  }, []);

  useEffect(() => {
    setTimeout(() =>
      window.addEventListener('keydown', closeStatusModalOnEnterOrSpace)
    );

    return () => {
      window.removeEventListener('keydown', closeStatusModalOnEnterOrSpace);
    };
  }, [closeStatusModalOnEnterOrSpace, statusModalOpen]);

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

  const updateSheetContent = useCallback(
    (sheetName: string, content: string, sendPutWorksheet = true) => {
      try {
        const sheet = SheetReader.parseSheet(content);

        setParsedSheet(sheet);
      } catch (error) {
        setParsedSheet(null);
        toast.error('There was an error while parsing the sheet.', {
          toastId: 'parse-error',
        });
      }
      setSheetContent(content);

      if (sendPutWorksheet && projectName) {
        clearCachedTableData();
        putWorksheet(projectName, sheetName, content);
      }
    },
    [clearCachedTableData, projectName, putWorksheet]
  );

  const manuallyUpdateSheetContent = useCallback(
    (sheetNameToChange: string, content: string) => {
      if (sheetNameToChange === sheetName) {
        updateSheetContent(sheetNameToChange, content);
      } else if (projectName) {
        clearCachedTableData();
        putWorksheet(projectName, sheetNameToChange, content, false);
      }
    },
    [
      clearCachedTableData,
      projectName,
      putWorksheet,
      sheetName,
      updateSheetContent,
    ]
  );

  const saveProjectState = useCallback(
    (projectState: ProjectState) => {
      setProjectName(projectState.projectName);

      const currentVersion = projectVersionRef.current;
      const newVersion = +projectState.version;

      if (currentVersion == null || newVersion > currentVersion) {
        projectVersionRef.current = newVersion;
      }

      setProjectSheets(projectState.sheets);
    },
    [projectVersionRef]
  );

  const saveProjectSheets = useCallback((worksheetState: WorksheetState) => {
    setProjectSheets((sheets) => {
      if (!sheets) return null;

      const updatedSheets = sheets.filter(
        (s) => s.sheetName !== worksheetState.sheetName
      );
      updatedSheets.push(worksheetState);

      return updatedSheets;
    });
  }, []);

  const saveSheetState = useCallback(
    (worksheetState: WorksheetState) => {
      const sheetName = worksheetState.sheetName;

      setSheetName(sheetName);

      const currentVersion = projectVersionRef.current;
      const newVersion = +worksheetState.version;

      if (currentVersion == null || newVersion > currentVersion) {
        projectVersionRef.current = +worksheetState.version;
        updateSheetContent(sheetName, worksheetState.content, false);
      }

      setSheetErrors(worksheetState.parsingErrors || null);
      setCompilationErrors(worksheetState.compilationErrors || null);
    },
    [projectVersionRef, updateSheetContent]
  );

  const clearProjectState = useCallback(() => {
    projectVersionRef.current = null;
    setProjectName(null);

    setProjectSheets(null);
    setParsedSheet(null);
    setProjectSheets(null);
  }, [projectVersionRef]);

  const clearSheetState = useCallback(() => {
    setSheetName(null);
    setSheetContent(null);
  }, []);

  const onCreateProjectResponse = useCallback(
    (projectState: ProjectState) => {
      saveRecentProject(projectState.projectName);
      saveRecentSheet('');

      projectVersionRef.current = null;

      saveProjectState(projectState);

      setProjects([...projects, projectState.projectName]);
      addRecentProject(projectState.projectName, defaultSheetName);

      updateSheetContent(defaultSheetName, '', false);

      putWorksheet(projectState.projectName, defaultSheetName, '');

      navigate(`/${projectState.projectName}`, { replace: true });
    },
    [
      navigate,
      projectVersionRef,
      projects,
      putWorksheet,
      saveProjectState,
      updateSheetContent,
    ]
  );

  const onOpenProjectResponse = useCallback(
    (projectState: ProjectState) => {
      hideLoading();
      saveRecentProject(projectState.projectName);

      projectVersionRef.current = null;

      saveProjectState(projectState);

      if (projectState.sheets) {
        const recentSheet = getRecentSheet();
        clearCachedTableData();
        if (
          recentSheet &&
          projectState.sheets.some((sheet) => sheet.sheetName === recentSheet)
        ) {
          openWorksheet(projectState.projectName, recentSheet);
        } else if (projectState.sheets.length > 0) {
          openWorksheet(
            projectState.projectName,
            projectState.sheets[0].sheetName
          );
        }
      }

      navigate(`/${projectState.projectName}`, { replace: true });
    },
    [
      navigate,
      hideLoading,
      projectVersionRef,
      saveProjectState,
      clearCachedTableData,
      openWorksheet,
    ]
  );

  const onProjectDeleteResponse = useCallback(
    (projectState: ProjectState) => {
      if (projects) {
        setProjects((projects) =>
          projects.filter((p) => p !== projectState.projectName)
        );
      }

      if (projectState.projectName !== projectName) return;

      saveRecentProject('');
      saveRecentSheet('');
      clearProjectState();
      clearSheetState();
      deleteProjectHistory(projectState.projectName);

      navigate('/');
    },
    [clearProjectState, clearSheetState, navigate, projectName, projects]
  );

  const onRenameProjectResponse = useCallback(
    (projectState: RenameProjectState) => {
      const { oldProjectName, newProjectName } = projectState;
      saveRecentProject(newProjectName);
      setProjectName(newProjectName);
      renameProjectHistory(oldProjectName, newProjectName);

      renameChartKeysProject(oldProjectName, newProjectName);
      renameRecentProject(oldProjectName, newProjectName);

      setProjects((projects) => [
        ...projects.filter((p) => p !== oldProjectName),
        newProjectName,
      ]);

      navigate(`/${newProjectName}/${sheetName || ''}`, {
        replace: true,
      });
    },
    [navigate, sheetName]
  );

  const onCloseProjectResponse = useCallback(
    (projectState: ProjectState) => {
      clearProjectState();
      clearSheetState();
      saveRecentProject('');
      saveRecentSheet('');
      navigate('/');
    },
    [clearProjectState, clearSheetState, navigate]
  );

  const onPutSheetResponse = useCallback(
    (worksheetState: WorksheetState) => {
      const newSheetName = worksheetState.sheetName;
      saveRecentSheet(newSheetName);
      saveSheetState(worksheetState);

      if (newSheetName !== sheetName) {
        navigate(`/${projectName}/${newSheetName}`, { replace: true });
      }

      setProjectSheets((sheets) => {
        if (!sheets) {
          return [worksheetState];
        }

        if (sheets.some((sheet) => sheet.sheetName === newSheetName)) {
          return sheets.map((sheet) =>
            sheet.sheetName === newSheetName ? worksheetState : sheet
          );
        }

        return [...sheets, worksheetState];
      });
    },
    [navigate, projectName, saveSheetState, sheetName]
  );

  const onOpenSheetResponse = useCallback(
    (worksheetState: WorksheetState) => {
      const { sheetName, content, projectName } = worksheetState;
      saveRecentSheet(sheetName);
      setParsedSheet(null);
      addRecentProject(projectName, sheetName);
      saveSheetState(worksheetState);
      updateSheetContent(sheetName, content, false);

      navigate(`/${projectName}/${sheetName}`, { replace: true });

      if (!projectSheets) return;
      let updatedSheetContent = autoRenameTables(
        content,
        sheetName,
        projectSheets
      );

      if (content === updatedSheetContent) return;

      updatedSheetContent = autoRenameFields(updatedSheetContent);
      updateSheetContent(sheetName, updatedSheetContent);
    },
    [navigate, projectSheets, saveSheetState, updateSheetContent]
  );

  const onDeleteSheetResponse = useCallback(
    (worksheetState: WorksheetState) => {
      saveRecentSheet('');
      clearSheetState();

      if (!projectName || !projectSheets) return;
      deleteSheetHistory(projectName, worksheetState.sheetName);

      setProjectSheets((sheets) => {
        if (!sheets) return null;

        const remainSheets = sheets.filter((sheet) => {
          return sheet.sheetName !== worksheetState.sheetName;
        });

        if (remainSheets.length) {
          clearCachedTableData();
          openWorksheet(projectName, remainSheets[0].sheetName);
        }

        return remainSheets;
      });
    },
    [
      clearCachedTableData,
      clearSheetState,
      projectName,
      projectSheets,
      openWorksheet,
    ]
  );

  const onRenameSheetResponse = useCallback(
    (worksheetState: RenameWorksheetState) => {
      const { newSheetName, oldSheetName } = worksheetState;
      saveRecentSheet(newSheetName);

      if (sheetName === oldSheetName) {
        setSheetName(newSheetName);

        navigate(`/${projectName}/${newSheetName}`, {
          replace: true,
        });
      }

      if (projectName) {
        renameSheetHistory(projectName, oldSheetName, newSheetName);
      }

      setProjectSheets((sheets) =>
        !sheets
          ? null
          : sheets.map((sheet) =>
              sheet.sheetName === oldSheetName
                ? { ...sheet, sheetName: newSheetName }
                : sheet
            )
      );
    },
    [projectName, sheetName, navigate]
  );

  const onCloseSheetResponse = useCallback(
    (worksheetState: WorksheetState) => {
      saveRecentSheet('');
      clearSheetState();
    },
    [clearSheetState]
  );

  const isProjectUpdateResponseValid = useCallback(
    (state: ProjectState | WorksheetState | RenameWorksheetState) => {
      const version = projectVersionRef.current;
      if (version && state.version < version) return false;

      return state.projectName === projectName;
    },
    [projectName, projectVersionRef]
  );

  const onParallelRenameProjectResponse = useCallback(
    (projectState: RenameProjectState) => {
      const version = projectVersionRef.current;
      if (
        projectState.oldProjectName !== projectName ||
        (version && projectState.version < version)
      ) {
        setProjects((projects) => [
          ...projects.filter((p) => p !== projectState.oldProjectName),
          projectState.newProjectName,
        ]);

        return;
      }

      onRenameProjectResponse(projectState);
    },
    [onRenameProjectResponse, projectName, projectVersionRef]
  );

  const onParallelRenameSheetResponse = useCallback(
    (worksheetState: RenameWorksheetState) => {
      if (!isProjectUpdateResponseValid(worksheetState)) return;

      onRenameSheetResponse(worksheetState);
    },
    [isProjectUpdateResponseValid, onRenameSheetResponse]
  );

  const onParallelUpdateProject = useCallback(
    (projectState: ProjectState) => {
      if (
        !isProjectUpdateResponseValid(projectState) &&
        !projectState.isDeleted
      ) {
        setProjects((projects) => [...projects, projectState.projectName]);

        return;
      }

      if (projectState.isDeleted) {
        onProjectDeleteResponse(projectState);
      }
    },
    [isProjectUpdateResponseValid, onProjectDeleteResponse]
  );

  const onParallelUpdateWorksheet = useCallback(
    (worksheetState: WorksheetState) => {
      if (!isProjectUpdateResponseValid(worksheetState)) return;

      if (worksheetState.isDeleted) {
        onDeleteSheetResponse(worksheetState);
      } else {
        if (sheetName === worksheetState.sheetName) {
          saveSheetState(worksheetState);
          saveProjectSheets(worksheetState);
        } else {
          const currentVersion = projectVersionRef.current;
          const newVersion = +worksheetState.version;

          saveProjectSheets(worksheetState);

          if (currentVersion == null || newVersion > currentVersion) {
            projectVersionRef.current = +worksheetState.version;
          }
        }
      }
    },
    [
      isProjectUpdateResponseValid,
      onDeleteSheetResponse,
      projectVersionRef,
      saveProjectSheets,
      saveSheetState,
      sheetName,
    ]
  );

  const onFunctionsResponse = useCallback((functions: FunctionInfo[]) => {
    setFunctions(functions);
  }, []);

  const updateSelectedCell = useCallback(
    (selectedCell: SelectedCell | null) => {
      setSelectedCell(selectedCell);
    },
    []
  );

  const onReconnect = useCallback(() => {
    if (!isConnectionOpened || !projectName) return;

    hideLoading();

    openProjectRequest(projectName);
  }, [hideLoading, isConnectionOpened, openProjectRequest, projectName]);

  useEffect(() => {
    for (const tableName of Object.keys(dynamicFields)) {
      const parsedTable = parsedSheet?.tables.find(
        (t) => t.tableName === tableName
      );

      if (!parsedTable) continue;

      parsedTable.addDynamicFields(dynamicFields[tableName]);
    }

    setParsedSheet(parsedSheet);

    if (!sheetName || !parsedSheet) return;

    setParsedSheets((prevState) => {
      const updatedParsedSheets = { ...prevState };

      updatedParsedSheets[sheetName] = parsedSheet;

      return updatedParsedSheets;
    });
  }, [parsedSheet, dynamicFields, sheetName]);

  useEffect(() => {
    if (functions.length > 0) return;

    getFunctions();
  }, [functions, getFunctions]);

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

    if (!projectName) return;

    cleanUpProjectChartKeys(projectName, updatedParsedSheets);
  }, [projectSheets, projectName]);

  const value = useMemo(
    () => ({
      functions,
      projects,
      projectName,
      projectSheets,
      sheetName,
      sheetContent,
      sheetErrors,
      compilationErrors,

      selectedCell,
      updateSelectedCell,

      parsedSheets,
      parsedSheet,

      createProject,
      openProject,
      deleteProject,
      newSheet,
      renameProject,
      renameSheet,
      openStatusModal,

      updateProjectList,
      updateSheetContent,
      manuallyUpdateSheetContent,

      onCreateProjectResponse,
      onOpenProjectResponse,
      onProjectDeleteResponse,
      onRenameProjectResponse,
      onCloseProjectResponse,

      onPutSheetResponse,
      onOpenSheetResponse,
      onDeleteSheetResponse,
      onRenameSheetResponse,
      onCloseSheetResponse,

      onParallelRenameSheetResponse,
      onParallelRenameProjectResponse,
      onParallelUpdateProject,
      onParallelUpdateWorksheet,
      onFunctionsResponse,
      onReconnect,
    }),
    [
      functions,
      projects,
      projectName,
      projectSheets,
      sheetName,
      sheetContent,
      sheetErrors,
      compilationErrors,
      selectedCell,
      updateSelectedCell,
      parsedSheets,
      parsedSheet,
      createProject,
      openProject,
      deleteProject,
      newSheet,
      renameProject,
      renameSheet,
      openStatusModal,
      updateProjectList,
      updateSheetContent,
      manuallyUpdateSheetContent,
      onCreateProjectResponse,
      onOpenProjectResponse,
      onProjectDeleteResponse,
      onRenameProjectResponse,
      onCloseProjectResponse,
      onPutSheetResponse,
      onOpenSheetResponse,
      onDeleteSheetResponse,
      onRenameSheetResponse,
      onCloseSheetResponse,
      onParallelRenameSheetResponse,
      onParallelRenameProjectResponse,
      onParallelUpdateProject,
      onParallelUpdateWorksheet,
      onFunctionsResponse,
      onReconnect,
    ]
  );

  return (
    <ProjectContext.Provider value={value}>
      {children}
      <NewProject newProjectModal={newProjectModal} />
      <OpenProject openProjectModal={openProjectModal} />
      <DeleteProject deleteProjectModal={deleteProjectModal} />
      <NewSheet newSheetModal={newSheetModal} />
      <RenameProject renameProjectModal={renameProjectModal} />
      <RenameSheet renameSheetModal={renameSheetModal} />
      <Modal
        cancelButtonProps={{
          style: { display: 'none' },
        }}
        okButtonProps={{
          className: 'bg-blue-500 enabled:hover:bg-blue-700',
        }}
        open={statusModalOpen}
        title={statusModalText}
        onCancel={closeStatusModal}
        onOk={closeStatusModal}
      />
    </ProjectContext.Provider>
  );
}
