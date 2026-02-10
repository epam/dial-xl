import { useMemo, useState } from 'react';

import { publicBucket, ResourcePermission } from '@frontend/common';

import { useProjectReadonlyByUser } from '../useProjectReadonlyByUser';

type Props = {
  projectBucket: string | null;
  projectName: string | null;
  projectPath: string | null;
  projectPermissions: ResourcePermission[];
  isTemporaryState: boolean;
  isTemporaryStateEditable: boolean;
};

export function useProjectEditState({
  projectBucket,
  projectName,
  projectPath,
  projectPermissions,
  isTemporaryState,
  isTemporaryStateEditable,
}: Props) {
  // We should be able to make a project readonly during different operations,
  // For example, during chat answering
  const [isProjectEditingDisabled, setIsProjectEditingDisabled] =
    useState(false);

  // User able to make a project readonly
  const {
    isReadonly: isProjectReadonlyByUser,
    setIsReadonly: setIsProjectReadonlyByUser,
  } = useProjectReadonlyByUser({ projectBucket, projectName, projectPath });

  const isProjectShareable = useMemo(() => {
    return (
      projectBucket === publicBucket || projectPermissions.includes('SHARE')
    );
  }, [projectBucket, projectPermissions]);

  const hasEditPermissions = useMemo(() => {
    return (['READ', 'WRITE'] as ResourcePermission[]).every((permission) =>
      projectPermissions.includes(permission)
    );
  }, [projectPermissions]);

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

  return {
    hasEditPermissions,
    isProjectShareable,
    isProjectReadonlyByUser,
    setIsProjectReadonlyByUser,
    isProjectEditingDisabled,
    setIsProjectEditingDisabled,
    isProjectEditable,
  };
}
