import { useCallback, useRef, useState } from 'react';
import { toast } from 'react-toastify';

import {
  ApiRequestFunctionWithError,
  CommonMetadata,
  CreateFileParams,
  CreateFileResult,
  csvFileExtension,
} from '@frontend/common';

import { WithCustomProgressBar } from '../../components';
import { RequestDimSchemaForDimFormulaArgs } from '../useRequestDimTable';
import { InputsFolder } from './useInputsFolderState';

type UseInputUploadFlowDeps = {
  inputsFolder: InputsFolder | undefined;
  createFile: ApiRequestFunctionWithError<CreateFileParams, CreateFileResult>;
  expandCSVFile: (file: CommonMetadata) => Promise<void>;
  requestDimSchemaForDimFormula: (
    args: RequestDimSchemaForDimFormulaArgs,
  ) => void | Promise<void>;
  viewGridData: { clearCachedViewports: () => void };
  getInputs: () => Promise<void>;
};

export function useInputUploadFlow({
  inputsFolder,
  createFile,
  expandCSVFile,
  requestDimSchemaForDimFormula,
  viewGridData,
  getInputs,
}: UseInputUploadFlowDeps) {
  const [isPreUploadOpen, setIsPreUploadOpen] = useState(false);
  const [initialFileList, setInitialFileList] = useState<
    FileList | undefined
  >();
  const [isDragAndDrop, setIsDragAndDrop] = useState(false);

  const uploadColRef = useRef<number | undefined>(undefined);
  const uploadRowRef = useRef<number | undefined>(undefined);

  const uploadFiles = useCallback(
    ({
      files,
      row,
      col,
    }: { files?: FileList; row?: number; col?: number } = {}) => {
      const bucket = inputsFolder?.bucket;
      if (!bucket) return;

      const hasCell = col != null && row != null;
      setIsDragAndDrop(hasCell);

      setInitialFileList(files);
      uploadColRef.current = col;
      uploadRowRef.current = row;

      setIsPreUploadOpen(true);
    },
    [inputsFolder?.bucket],
  );

  const close = useCallback(() => setIsPreUploadOpen(false), []);

  const handleUploadFiles = useCallback(
    async (
      parentPath: string | null | undefined,
      uploadBucket: string,
      files: { file: File; name: string; extension: string }[],
    ) => {
      setIsPreUploadOpen(false);

      const bucket = uploadBucket ?? inputsFolder?.bucket;
      if (!bucket || !files?.length) return;

      const requests = files.map(async (f) => {
        const uploadingToast = toast(WithCustomProgressBar, {
          customProgressBar: true,
          data: { message: `File '${f.name}' uploading...` },
        });

        const fullFileName = f.name + f.extension;

        const result = await createFile({
          bucket,
          fileName: fullFileName,
          fileType: f.file.type,
          fileBlob: f.file,
          path: parentPath,
          onProgress: (progress) => {
            toast.update(uploadingToast, { progress: progress / 100 });
          },
        });

        if (result.success) {
          toast.dismiss(uploadingToast);
          toast.success(`File "${fullFileName}" uploaded successfully`);
        } else {
          toast.dismiss(uploadingToast);
          toast.error(`Error happened during uploading "${fullFileName}"`);
        }

        return result.success ? result.data.file : undefined;
      });

      const results = await Promise.allSettled(requests);

      for (const r of results) {
        if (r.status !== 'fulfilled') continue;
        const file = r.value;
        if (!file) continue;

        if (file.name.endsWith(csvFileExtension)) {
          await expandCSVFile(file);

          const col = uploadColRef.current;
          const row = uploadRowRef.current;

          if (col != null && row != null) {
            const formula = `:INPUT("${file.url}")`;
            await requestDimSchemaForDimFormula({ col, row, value: formula });
          }
        }
      }

      viewGridData.clearCachedViewports();
      await getInputs();
    },
    [
      createFile,
      expandCSVFile,
      getInputs,
      inputsFolder?.bucket,
      requestDimSchemaForDimFormula,
      viewGridData,
    ],
  );

  return {
    isPreUploadOpen,
    isDragAndDrop,
    initialFileList,
    uploadFiles,
    handleUploadFiles,
    close,
  };
}
