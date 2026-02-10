import { createContext, MutableRefObject } from 'react';

import {
  ProjectAIResponseId,
  ProjectState,
  ResourcePermission,
  WorksheetState,
} from '@frontend/common';

import { ForkedProjectSettings, LongCalcStatus } from '../../common';
import { LongCalcAction, LongCalcRequestType } from '../../hooks';

export type ProjectResourceValues = {
  projectName: string | null;
  projectSheets: WorksheetState[] | null;
  projectVersion: string | null;
  projectBucket: string | null;
  projectPath: string | null;
  projectState: ProjectState | null;
  fullProjectPath: string;

  projectAuthor: string | null;
  projectPermissions: ResourcePermission[];
  responseIds: ProjectAIResponseId[];
  forkedProject: ForkedProjectSettings | null;

  isProjectChangedOnServerByUser: boolean;

  longCalcStatus: LongCalcStatus;
};

type ProjectResourceInternalValues = {
  _projectState: MutableRefObject<ProjectState | null>;
  remoteEtag: MutableRefObject<string | null>;
  inflightRequest: MutableRefObject<'get' | 'put' | null>;
  localDsl: MutableRefObject<WorksheetState[] | null>;
  inflightDsl: MutableRefObject<WorksheetState[] | null>;
};

type ProjectResourceInternalActions = {
  getProjectFromServer: ({
    path,
    projectName,
    bucket,
  }: {
    path: string | null | undefined;
    projectName: string;
    bucket: string;
  }) => Promise<ProjectState | undefined>;
  setIsProjectChangedOnServerByUser: (v: boolean) => void;
  setProjectPermissions: (p: ResourcePermission[]) => void;
  setProjectState: (state: ProjectState | null) => void;
  cancelAllViewportRequests: () => void;
};

export type ProjectResourceActions = {
  updateProjectOnServer: (
    updatedStateRequest: ProjectState,
    options: {
      isTemporaryState: boolean;
      onSuccess?: () => void;
      onFail?: () => void;
    }
  ) => Promise<void>;
  setLongCalcStatus: (status: LongCalcStatus) => void;
  cancelAllImportSyncRequests: () => void;
  manageRequestLifecycle: (
    action: LongCalcAction,
    reqType: LongCalcRequestType,
    controller?: AbortController
  ) => void;
};

type ProjectResourceContextType = ProjectResourceActions &
  ProjectResourceInternalActions &
  ProjectResourceValues &
  ProjectResourceInternalValues;

export const ProjectResourceContext = createContext<ProjectResourceContextType>(
  {} as ProjectResourceContextType
);
