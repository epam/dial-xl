import { useCallback, useMemo, useState } from 'react';

import {
  ApiRequestFunctionWithError,
  CloneFileParams,
  filesEndpointType,
} from '@frontend/common';

import { FileReference } from '../../common';
import { constructPath, encodeApiUrl } from '../../utils';

type UseInputImportAndSwitchFlowDeps = {
  projectBucket: string | null;
  projectPath?: string | null;
  projectName: string | null;
  fullProjectInputsFolder?: string | null;
  cloneFile: ApiRequestFunctionWithError<FileReference & CloneFileParams, void>;
  editExpression: (
    tableName: string,
    fieldName: string,
    expression: string,
  ) => void;
  getInputs: () => Promise<void>;
};

export function useInputImportAndSwitchFlow({
  projectBucket,
  projectPath,
  projectName,
  fullProjectInputsFolder,
  cloneFile,
  editExpression,
  getInputs,
}: UseInputImportAndSwitchFlowDeps) {
  const [isImportInputOpen, setIsImportInputOpen] = useState(false);
  const [switchInputOptions, setSwitchInputOptions] = useState<{
    tableName: string;
    fieldName: string;
  } | null>(null);

  const importInput = useCallback(() => setIsImportInputOpen(true), []);
  const closeImport = useCallback(() => setIsImportInputOpen(false), []);

  const handleImportInput = useCallback(
    async (path: string | null | undefined, bucket: string, name: string) => {
      setIsImportInputOpen(false);

      if (!projectBucket || projectPath == null || !projectName) return;
      if (!fullProjectInputsFolder) return;

      const result = await cloneFile({
        name,
        parentPath: path,
        bucket,
        targetBucket: projectBucket,
        targetPath: fullProjectInputsFolder,
      });

      if (!result.success) return;

      getInputs();
    },
    [
      cloneFile,
      fullProjectInputsFolder,
      getInputs,
      projectBucket,
      projectName,
      projectPath,
    ],
  );

  const onSwitchInput = useCallback((tableName: string, fieldName: string) => {
    setSwitchInputOptions({ tableName, fieldName });
  }, []);

  const closeSwitch = useCallback(() => setSwitchInputOptions(null), []);

  const handleSwitchInput = useCallback(
    (parentPath: string | null | undefined, bucket: string, name: string) => {
      if (!switchInputOptions) return;

      const { tableName, fieldName } = switchInputOptions;

      const expression = `INPUT("${encodeApiUrl(
        constructPath([filesEndpointType, bucket, parentPath, name]),
      )}")`;

      editExpression(tableName, fieldName, expression);
      setSwitchInputOptions(null);
    },
    [editExpression, switchInputOptions],
  );

  const publicApi = useMemo(
    () => ({
      importInput,
      onSwitchInput,
    }),
    [importInput, onSwitchInput],
  );

  return {
    publicApi,
    isImportInputOpen,
    switchInputOptions,
    closeImport,
    closeSwitch,
    handleImportInput,
    handleSwitchInput,
  };
}
