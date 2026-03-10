import { useCallback, useState } from 'react';

import {
  ApiRequestFunctionWithError,
  csvFileExtension,
  GetFilesParams,
  GetMetadataParams,
  MetadataNodeType,
  MetadataResourceType,
  ResourceMetadata,
  SharedWithMeMetadata,
  xlsFileExtension,
  xlsxFileExtension,
} from '@frontend/common';

import { constructPath } from '../../utils';
import { InputsFolder } from './useInputsFolderState';

type UseInputsListDeps = {
  inputsFolder: InputsFolder | undefined;
  showHiddenFiles: boolean;
  getFiles: ApiRequestFunctionWithError<GetFilesParams, ResourceMetadata[]>;
  getSharedWithMeResources: ApiRequestFunctionWithError<
    GetMetadataParams,
    SharedWithMeMetadata[]
  >;
};

const defaultAllowedExtensions = [
  csvFileExtension,
  xlsFileExtension,
  xlsxFileExtension,
];

export function useInputsList({
  inputsFolder,
  showHiddenFiles,
  getFiles,
  getSharedWithMeResources,
}: UseInputsListDeps) {
  const [inputList, setInputList] = useState<
    (ResourceMetadata | SharedWithMeMetadata)[] | null
  >(null);
  const [isInputsLoading, setIsInputsLoading] = useState(true);

  const getInputs = useCallback(async () => {
    setInputList([]);
    setIsInputsLoading(true);

    let files: (ResourceMetadata | SharedWithMeMetadata)[] = [];

    if (inputsFolder?.bucket) {
      const filesRes = await getFiles({
        path: `${constructPath([inputsFolder.bucket, inputsFolder.path])}/`,
      });
      files = filesRes.success ? filesRes.data : [];
    } else {
      const sharedRes = await getSharedWithMeResources({
        resourceType: MetadataResourceType.FILE,
      });
      files = sharedRes.success ? sharedRes.data : [];
    }

    setIsInputsLoading(false);
    setInputList(filterInputFiles(files, { showHiddenFiles }));
  }, [
    getFiles,
    getSharedWithMeResources,
    inputsFolder?.bucket,
    inputsFolder?.path,
    showHiddenFiles,
  ]);

  return {
    inputList,
    isInputsLoading,
    getInputs,
    setInputList,
  };
}

function filterInputFiles(
  files: (ResourceMetadata | SharedWithMeMetadata)[],
  opts: { showHiddenFiles: boolean; allowedExtensions?: string[] },
) {
  const allowedExtensions = opts.allowedExtensions ?? defaultAllowedExtensions;
  const { showHiddenFiles } = opts;

  const rec = (
    items: (ResourceMetadata | SharedWithMeMetadata)[],
  ): (ResourceMetadata | SharedWithMeMetadata)[] =>
    items
      .filter((f) => f?.name)
      .filter(
        (f) =>
          allowedExtensions.some((ext) => f.name.endsWith(ext)) ||
          f.nodeType === MetadataNodeType.FOLDER,
      )
      .filter((f) => showHiddenFiles || !f.name.startsWith('.'))
      .map((f) => ({ ...f, items: f.items ? rec(f.items) : f.items }));

  return rec(files);
}
