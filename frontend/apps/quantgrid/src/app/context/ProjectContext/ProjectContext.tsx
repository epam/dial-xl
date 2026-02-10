import { createContext } from 'react';

import {
  ProjectResourceActions,
  ProjectResourceValues,
} from './ProjectResourceContext';
import {
  ProjectSessionActions,
  ProjectSessionValues,
} from './ProjectSessionContext';
import { ProjectSubscriptionActions } from './ProjectSubscriptionContext';

type ProjectContextValues = ProjectResourceValues & ProjectSessionValues;
type ProjectContextActions = ProjectResourceActions &
  ProjectSessionActions &
  ProjectSubscriptionActions & {
    closeCurrentProject: (skipNavigate?: boolean) => void;
    openProject: (args: {
      path: string | null | undefined;
      projectName: string;
      projectSheetName?: string | undefined;
      bucket: string;
    }) => void;
  };

export const ProjectContext = createContext<
  ProjectContextActions & ProjectContextValues
>({} as ProjectContextActions & ProjectContextValues);
