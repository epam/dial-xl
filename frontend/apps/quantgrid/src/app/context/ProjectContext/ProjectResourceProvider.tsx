import {
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import isEqual from 'react-fast-compare';

import {
  dialProjectFileExtension,
  filesEndpointType,
  MetadataResourceType,
  ProjectAIResponseId,
  ProjectState,
  ResourcePermission,
  WorksheetState,
} from '@frontend/common';

import {
  useApiRequests,
  useForkedProjectInfo,
  useGetProjectAuthor,
  useLongCalculations,
  useProjectSelectors,
} from '../../hooks';
import useEventBus from '../../hooks/useEventBus';
import { cleanUpProjectHistory, EventBusMessages } from '../../services';
import { useUIStore } from '../../store';
import { constructPath, displayToast, encodeApiUrl } from '../../utils';
import { ProjectResourceContext } from './ProjectResourceContext';

export function ProjectResourceProvider({
  children,
}: PropsWithChildren<Record<string, unknown>>) {
  const setLoading = useUIStore((s) => s.setLoading);
  const eventBus = useEventBus<EventBusMessages>();
  const {
    getProject: getProjectRequest,
    putProject: putProjectRequest,
    getResourceMetadata: getResourceMetadataRequest,
  } = useApiRequests();

  // Use this inside the project context
  const _projectState = useRef<ProjectState | null>(null);
  const [projectState, _setProjectState] = useState<ProjectState | null>(null);
  const { projectName, projectBucket, projectPath, projectVersion } =
    useProjectSelectors({
      projectState,
    });

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

  // sync variables
  const remoteEtag = useRef<string | null>(null);
  const inflightRequest = useRef<'get' | 'put' | null>(null);
  const localDsl = useRef<WorksheetState[] | null>(null);
  const inflightDsl = useRef<WorksheetState[] | null>(null);
  // ---

  const [isProjectChangedOnServerByUser, setIsProjectChangedOnServerByUser] =
    useState(false);
  const [projectPermissions, setProjectPermissions] = useState<
    ResourcePermission[]
  >([]);
  const responseIds: ProjectAIResponseId[] = useMemo(
    () => projectState?.settings.projectMetadata?.assistantResponseIds ?? [],
    [projectState]
  );

  const fullProjectPath = useMemo(() => {
    if (!projectName || !projectBucket) return '';

    return encodeApiUrl(
      constructPath([
        filesEndpointType,
        projectBucket,
        projectPath,
        projectName,
      ])
    );
  }, [projectBucket, projectName, projectPath]);

  const { forkedProject, updateForkedProjectInfo } = useForkedProjectInfo();
  const { projectAuthor } = useGetProjectAuthor({
    projectBucket,
    projectPath,
    projectName,
  });

  const {
    longCalcStatus,
    setLongCalcStatus,
    manageRequestLifecycle,
    cancelAllViewportRequests,
    cancelAllImportSyncRequests,
  } = useLongCalculations();

  const setProjectState = useCallback(
    (newProjectState: ProjectState | null) => {
      _projectState.current = newProjectState;
      setIsProjectChangedOnServerByUser(false);

      _setProjectState(newProjectState);
    },
    []
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
        parentPath: path,
      });
      const projectMetadata = await getResourceMetadataRequest({
        path: constructPath([
          bucket,
          path,
          projectName + dialProjectFileExtension,
        ]),
        withPermissions: true,
        resourceType: MetadataResourceType.FILE,
      });

      setLoading(false);
      if (!project) {
        setLoading(false);
        // eslint-disable-next-line no-console
        console.warn('Redirect to home because of error while getting project');
        eventBus.publish({
          topic: 'CloseCurrentProject',
        });

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

      // No sub events or event tag the same as local etag
      if (!remoteEtag.current || project.version === remoteEtag.current) {
        remoteEtag.current = null;

        // the last remote dsl is different from received dsl
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
          eventBus.publish({
            topic: 'StartConflictResolving',
          });
        }

        inflightRequest.current = null;

        return project;
      }

      remoteEtag.current = null;

      // retry get project
      return await getProjectFromServer({
        path,
        projectName,
        bucket,
      });
    },
    [
      getProjectRequest,
      getResourceMetadataRequest,
      setLoading,
      setProjectState,
      updateForkedProjectInfo,
      eventBus,
    ]
  );

  const updateProjectOnServer = useCallback(
    async (
      updatedStateRequest: ProjectState,
      options: {
        isTemporaryState: boolean;
        onSuccess?: () => void;
        onFail?: () => void;
      }
    ) => {
      if (!_projectState.current) return;

      cancelAllViewportRequests();

      // We are doing an optimistic update
      setProjectState({
        ...updatedStateRequest,
        // We need to have the latest version in the project state
        version: _projectState.current!.version!,
      });

      // We don't need to update server if is ai pending changes
      if (options.isTemporaryState) return;

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

        // During put request some event appeared - we need to get a project again to be sure that project is actual
        if (remoteEtag.current !== null) {
          inflightDsl.current = null;

          getProjectFromServer({
            path: _projectState.current.path,
            bucket: _projectState.current.bucket,
            projectName: _projectState.current.projectName,
          });

          return;
        }

        // because we are doing optimistic updates, we need to be sure that latest changes are same with server
        // otherwise doing PUT
        inflightRequest.current = null;
        if (isEqual(_projectState.current?.sheets, localDsl.current)) {
          inflightDsl.current = null;
        } else {
          inflightDsl.current = _projectState.current?.sheets;

          return updateProjectOnServer(_projectState.current, {
            isTemporaryState: options.isTemporaryState,
          });
        }
      } else {
        options.onFail?.();

        inflightDsl.current = null;
        // Need to request the latest state to show an override banner later
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
      putProjectRequest,
      setProjectState,
    ]
  );

  useEffect(() => {
    cleanUpProjectHistory();
  }, [projectName]);

  const value = useMemo(
    () => ({
      _projectState,
      cancelAllImportSyncRequests,
      cancelAllViewportRequests,
      forkedProject,
      fullProjectPath,
      getProjectFromServer,
      inflightDsl,
      inflightRequest,
      isProjectChangedOnServerByUser,
      localDsl,
      longCalcStatus,
      manageRequestLifecycle,
      projectAuthor,
      projectBucket,
      projectName,
      projectPath,
      projectPermissions,
      projectSheets,
      projectState,
      projectVersion,
      remoteEtag,
      responseIds,
      setIsProjectChangedOnServerByUser,
      setLongCalcStatus,
      setProjectPermissions,
      setProjectState,
      updateProjectOnServer,
    }),
    [
      cancelAllImportSyncRequests,
      cancelAllViewportRequests,
      forkedProject,
      fullProjectPath,
      getProjectFromServer,
      isProjectChangedOnServerByUser,
      longCalcStatus,
      manageRequestLifecycle,
      projectAuthor,
      projectBucket,
      projectName,
      projectPath,
      projectPermissions,
      projectSheets,
      projectState,
      projectVersion,
      responseIds,
      setIsProjectChangedOnServerByUser,
      setLongCalcStatus,
      setProjectPermissions,
      setProjectState,
      updateProjectOnServer,
    ]
  );

  return (
    <ProjectResourceContext.Provider value={value}>
      {children}
    </ProjectResourceContext.Provider>
  );
}
