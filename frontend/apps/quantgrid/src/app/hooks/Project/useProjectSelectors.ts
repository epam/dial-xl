import { useMemo } from 'react';

import { ProjectState } from '@frontend/common';

type Props = {
  projectState: ProjectState | null;
};

export function useProjectSelectors({ projectState }: Props) {
  const projectName = useMemo(
    () => projectState?.projectName ?? null,
    [projectState?.projectName],
  );
  const projectBucket = useMemo(
    () => projectState?.bucket ?? null,
    [projectState?.bucket],
  );
  const projectPath = useMemo(
    () => projectState?.path ?? null,
    [projectState?.path],
  );
  const projectVersion = useMemo(
    () => projectState?.version ?? null,
    [projectState?.version],
  );

  return {
    projectName,
    projectBucket,
    projectPath,
    projectVersion,
  };
}
