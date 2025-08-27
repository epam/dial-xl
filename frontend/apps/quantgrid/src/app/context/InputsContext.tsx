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
import { toast } from 'react-toastify';

import {
  appMessages,
  csvFileExtension,
  DimensionalSchemaResponse,
  FilesMetadata,
  MetadataNodeType,
  projectFoldersRootPrefix,
} from '@frontend/common';

import {
  PreUploadFile,
  SelectFile,
  WithCustomProgressBar,
} from '../components';
import { useApiRequests, useRequestDimTable } from '../hooks';
import { constructPath, getProjectSheetsRecord } from '../utils';
import { ProjectContext } from './ProjectContext';
import { ViewportContext } from './ViewportContext';

type Inputs = {
  [fileName: string]: { fields: string[] };
};

type InputsContextActions = {
  inputsParentPath: string | null | undefined;
  inputsBucket: string | undefined;

  isInputsLoading: boolean;
  inputList: FilesMetadata[] | null;

  inputs: Inputs;

  uploadFiles: (args?: {
    files?: FileList;
    row?: number;
    col?: number;
  }) => void;
  importInput: () => void;
  getInputs: () => void;
  updateInputsFolder: (args: {
    parentPath: string | null | undefined;
    bucket: string | undefined;
  }) => void;
  expandFile: (file: FilesMetadata) => void;
};

export const InputsContext = createContext<InputsContextActions>(
  {} as InputsContextActions
);

export function InputsContextProvider({
  children,
}: PropsWithChildren<Record<string, unknown>>): JSX.Element {
  const { projectName, projectBucket, projectPath, projectSheets } =
    useContext(ProjectContext);
  const {
    createFile,
    getFiles,
    getSharedWithMeFiles,
    getDimensionalSchema,
    cloneFile,
  } = useApiRequests();
  const { viewGridData } = useContext(ViewportContext);
  const { requestDimSchemaForDimFormula } = useRequestDimTable();

  const [inputsFolder, setInputsFolder] = useState<{
    path: string | null | undefined;
    bucket: string | undefined;
  }>();
  const [inputList, setInputList] = useState<FilesMetadata[] | null>(null);
  const [inputs, setInputs] = useState<Inputs>({});
  const [isInputsLoading, setIsInputsLoading] = useState(true);
  const [isPreUploadOpen, setIsPreUploadOpen] = useState(false);
  const [isImportInputOpen, setIsImportInputOpen] = useState(false);
  const [initialFileList, setInitialFileList] = useState<
    FileList | undefined
  >();
  const [isDragAndDrop, setIsDragAndDrop] = useState(false);
  const uploadColRef = useRef<number>();
  const uploadRowRef = useRef<number>();

  const onDimensionalSchemaResponse = useCallback(
    (response: DimensionalSchemaResponse) => {
      const { schema, formula, errorMessage } =
        response.dimensionalSchemaResponse;

      if (!formula.startsWith('INPUT')) return;

      const fileName = formula.slice(
        formula.indexOf('"') + 1,
        formula.lastIndexOf('"')
      );
      const shortFileName = fileName.split('/').pop();

      if (errorMessage) {
        toast.error(
          appMessages.fileUploadSchemaError(
            shortFileName ?? fileName,
            errorMessage
          )
        );

        return;
      }

      setInputs((prevInputs) => {
        return { ...prevInputs, [fileName]: { fields: schema } };
      });
    },
    []
  );

  const requestInput = useCallback(
    async (file: FilesMetadata) => {
      if (!projectName || !file.url || inputs[file.url]) return;

      const { url } = file;

      if (!url) return;

      const formula = `INPUT("${url}")`;

      const dimensionalSchema = await getDimensionalSchema({
        formula,
        worksheets: getProjectSheetsRecord(projectSheets || []),
        suppressErrors: true,
      });

      if (!dimensionalSchema) {
        toast.error(
          `Error happened during creating schema for file "${file.name}". Recheck file structure and reupload it.`
        );

        return;
      }

      onDimensionalSchemaResponse(dimensionalSchema);
    },
    [
      getDimensionalSchema,
      inputs,
      onDimensionalSchemaResponse,
      projectName,
      projectSheets,
    ]
  );

  const getInputs = useCallback(async () => {
    setInputList([]);
    setIsInputsLoading(true);

    let files: FilesMetadata[] | undefined;

    if (inputsFolder?.bucket) {
      files = await getFiles({
        path: `${constructPath([inputsFolder?.bucket, inputsFolder?.path])}/`,
        suppressErrors: true,
      });
    } else {
      files = await getSharedWithMeFiles();
    }

    setIsInputsLoading(false);

    const filterFiles = (files: FilesMetadata[]): FilesMetadata[] =>
      files
        .filter((file) => file?.name)
        .filter(
          (file) =>
            file.name.endsWith(csvFileExtension) ||
            file.nodeType === MetadataNodeType.FOLDER
        )
        .map((file) => ({
          ...file,
          items: file.items ? filterFiles(file.items) : file.items,
        }));

    const finalFiles = filterFiles(files ?? []);

    setInputList(finalFiles);
  }, [
    getFiles,
    getSharedWithMeFiles,
    inputsFolder?.bucket,
    inputsFolder?.path,
  ]);

  const expandFile = useCallback(
    (file: FilesMetadata) => {
      requestInput(file);
    },
    [requestInput]
  );

  const updateInputsFolder = useCallback(
    ({
      parentPath,
      bucket,
    }: {
      parentPath: string | null | undefined;
      bucket: string | undefined;
    }) => {
      setInputsFolder({
        path: parentPath,
        bucket,
      });
    },
    []
  );

  const uploadFiles = useCallback(
    ({
      files,
      row,
      col,
    }: { files?: FileList; row?: number; col?: number } = {}) => {
      const bucket = inputsFolder?.bucket;

      if (!bucket) return;

      setIsDragAndDrop(!!col && !!row);

      setInitialFileList(files);
      uploadColRef.current = col;
      uploadRowRef.current = row;

      setIsPreUploadOpen(true);
    },
    [inputsFolder?.bucket]
  );

  const importInput = useCallback(() => {
    setIsImportInputOpen(true);
  }, []);

  const handleImportInput = useCallback(
    async (path: string | null | undefined, bucket: string, name: string) => {
      setIsImportInputOpen(false);

      if (!projectBucket || projectPath === null || !projectName) return;

      await cloneFile({
        name,
        path,
        bucket,
        targetBucket: projectBucket,
        targetPath: constructPath([
          projectFoldersRootPrefix,
          projectPath,
          projectName,
        ]),
      });

      getInputs();
    },
    [cloneFile, getInputs, projectBucket, projectName, projectPath]
  );

  const handleUploadFiles = useCallback(
    async (
      parentPath: string | null | undefined,
      uploadBucket: string,
      files: { file: File; name: string; extension: string }[]
    ) => {
      setIsPreUploadOpen(false);

      const bucket = uploadBucket ?? inputsFolder?.bucket;
      if (!bucket || !files) return;

      toast.dismiss();

      const requests = files.map(async (file) => {
        const uploadingToast = toast(WithCustomProgressBar, {
          customProgressBar: true,
          data: {
            message: `File '${file.name}' uploading...`,
          },
        });

        const fullFileName = file.name + file.extension;

        const result = await createFile({
          bucket: bucket,
          fileName: fullFileName,
          fileType: file.file.type,
          fileBlob: file.file,
          path: parentPath,
          onProgress: (progress) => {
            toast.update(uploadingToast, {
              progress: progress / 100,
            });
          },
        });

        if (result?.file) {
          toast.dismiss(uploadingToast);
          toast.success(`File "${fullFileName}" uploaded successfully`);
        } else {
          toast.dismiss(uploadingToast);
          toast.error(`Error happened during uploading "${fullFileName}"`);
        }

        return result?.file;
      });

      const results = await Promise.allSettled(requests);
      results.forEach((result) => {
        if (
          result.status === 'fulfilled' &&
          result.value &&
          result.value.name.endsWith(csvFileExtension)
        ) {
          expandFile(result.value);

          if (uploadColRef.current && uploadRowRef.current) {
            const formula = `:INPUT("${result.value.url}")`;
            requestDimSchemaForDimFormula(
              uploadColRef.current,
              uploadRowRef.current,
              formula
            );
          }
        }
      });

      viewGridData.clearCachedViewports();
      getInputs();
    },
    [
      requestDimSchemaForDimFormula,
      createFile,
      expandFile,
      getInputs,
      inputsFolder?.bucket,
      viewGridData,
    ]
  );

  useEffect(() => {
    if (inputsFolder) {
      getInputs();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputsFolder]);

  useEffect(() => {
    if (projectBucket) {
      setInputsFolder({
        path: constructPath([
          projectFoldersRootPrefix,
          projectPath,
          projectName,
        ]),
        bucket: projectBucket,
      });
    }

    // below triggers, not dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectPath, projectBucket, projectName]);

  const value = useMemo(
    () => ({
      inputList,
      inputs,
      inputsParentPath: inputsFolder?.path,
      inputsBucket: inputsFolder?.bucket,
      isInputsLoading,
      uploadFiles,
      getInputs,
      updateInputsFolder,
      expandFile,
      importInput,
    }),
    [
      inputList,
      inputs,
      inputsFolder?.path,
      inputsFolder?.bucket,
      isInputsLoading,
      uploadFiles,
      getInputs,
      updateInputsFolder,
      expandFile,
      importInput,
    ]
  );

  return (
    <InputsContext.Provider value={value}>
      {children}

      {isPreUploadOpen && inputsFolder?.bucket && (
        <PreUploadFile
          allowedExtensions={[csvFileExtension]}
          hideFilesSelectionOnOpen={isDragAndDrop}
          initialBucket={inputsFolder.bucket}
          initialFiles={initialFileList}
          initialPath={inputsFolder.path}
          onCancel={() => setIsPreUploadOpen(false)}
          onOk={handleUploadFiles}
        />
      )}

      {isImportInputOpen && (
        <SelectFile
          fileExtensions={[csvFileExtension]}
          initialBucket={projectBucket || ''}
          initialPath={projectPath}
          modalTitle="Import input file"
          okButtonText="Select input"
          onCancel={() => setIsImportInputOpen(false)}
          onOk={handleImportInput}
        />
      )}
    </InputsContext.Provider>
  );
}
