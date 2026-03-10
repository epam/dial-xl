import { useCallback, useEffect, useMemo, useState } from 'react';

import { projectFoldersRootPrefix } from '@frontend/common';

import { constructPath } from '../../utils';

export type InputsFolder = {
  path?: string | null;
  bucket?: string;
};

export function useInputsFolderState(params: {
  projectBucket?: string | null;
  projectPath?: string | null;
  projectName: string | null;
}) {
  const { projectBucket, projectPath, projectName } = params;

  const [inputsFolder, setInputsFolder] = useState<InputsFolder>();

  const fullProjectInputsFolder = useMemo(
    () => constructPath([projectFoldersRootPrefix, projectPath, projectName]),
    [projectName, projectPath],
  );

  useEffect(() => {
    if (!projectBucket || !fullProjectInputsFolder) return;
    setInputsFolder({ path: fullProjectInputsFolder, bucket: projectBucket });
  }, [projectBucket, fullProjectInputsFolder]);

  const updateInputsFolder = useCallback(
    (next: { parentPath?: string | null; bucket?: string }) => {
      setInputsFolder({ path: next.parentPath, bucket: next.bucket });
    },
    [],
  );

  return {
    inputsFolder,
    setInputsFolder,
    fullProjectInputsFolder,
    updateInputsFolder,
  };
}
