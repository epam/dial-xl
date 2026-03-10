import {
  type JSX,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
} from 'react';

import {
  csvFileExtension,
  xlsFileExtension,
  xlsxFileExtension,
} from '@frontend/common';

import {
  CreateTableFromImportModal,
  PreUploadFile,
  SelectFile,
  ViewImportVersionsModal,
} from '../../components';
import {
  useApiRequests,
  useExcelSchemas,
  useFieldEditDsl,
  useImports,
  useInputImportAndSwitchFlow,
  useInputSchemas,
  useInputsFolderState,
  useInputsList,
  useInputUploadFlow,
  useRequestDimTable,
} from '../../hooks';
import { useUserSettingsStore } from '../../store';
import { ProjectContext } from '../ProjectContext';
import { ViewportContext } from '../ViewportContext';
import { InputsContext } from './InputsContext';

export function InputsContextProvider({
  children,
}: PropsWithChildren<Record<string, unknown>>): JSX.Element {
  const { projectName, projectBucket, projectPath, projectSheets } =
    useContext(ProjectContext);
  const {
    createFile,
    getFiles,
    getSharedWithMeResources,
    getDimensionalSchema,
    cloneFile,
    getExcelCatalog,
  } = useApiRequests();
  const { viewGridData } = useContext(ViewportContext);
  const { requestDimSchemaForDimFormula } = useRequestDimTable();
  const { editExpression } = useFieldEditDsl();

  const imports = useImports();

  const showHiddenFiles = useUserSettingsStore((s) => s.data.showHiddenFiles);

  const { inputsFolder, fullProjectInputsFolder, updateInputsFolder } =
    useInputsFolderState({
      projectBucket,
      projectPath,
      projectName,
    });

  const { inputList, isInputsLoading, getInputs } = useInputsList({
    inputsFolder,
    showHiddenFiles,
    getFiles,
    getSharedWithMeResources,
  });

  const { inputs, expandCSVFile } = useInputSchemas({
    projectName,
    projectSheets,
    getDimensionalSchema,
  });

  const excel = useExcelSchemas({
    projectName,
    projectSheets,
    getDimensionalSchema,
    getExcelCatalog,
  });

  const uploadFlow = useInputUploadFlow({
    inputsFolder,
    createFile,
    expandCSVFile,
    requestDimSchemaForDimFormula,
    viewGridData,
    getInputs,
  });

  const importSwitchFlow = useInputImportAndSwitchFlow({
    projectBucket,
    projectPath,
    projectName,
    fullProjectInputsFolder,
    cloneFile,
    editExpression,
    getInputs,
  });

  useEffect(() => {
    if (!inputsFolder) return;

    getInputs();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputsFolder]);

  const value = useMemo(
    () => ({
      inputList,
      inputs,
      inputsParentPath: inputsFolder?.path,
      inputsBucket: inputsFolder?.bucket,
      isInputsLoading,
      getInputs,
      updateInputsFolder,
      expandCSVFile,

      ...excel,
      ...importSwitchFlow.publicApi,
      ...imports,

      uploadFiles: uploadFlow.uploadFiles,
    }),
    [
      excel,
      expandCSVFile,
      getInputs,
      importSwitchFlow.publicApi,
      imports,
      inputList,
      inputs,
      inputsFolder?.bucket,
      inputsFolder?.path,
      isInputsLoading,
      updateInputsFolder,
      uploadFlow.uploadFiles,
    ],
  );

  return (
    <InputsContext.Provider value={value}>
      {children}

      {uploadFlow.isPreUploadOpen && inputsFolder?.bucket && (
        <PreUploadFile
          allowedExtensions={[
            csvFileExtension,
            xlsFileExtension,
            xlsxFileExtension,
          ]}
          hideFilesSelectionOnOpen={uploadFlow.isDragAndDrop}
          initialBucket={inputsFolder.bucket}
          initialFiles={uploadFlow.initialFileList}
          initialPath={inputsFolder.path}
          onCancel={uploadFlow.close}
          onOk={uploadFlow.handleUploadFiles}
        />
      )}

      {importSwitchFlow.isImportInputOpen && (
        <SelectFile
          fileExtensions={[csvFileExtension]}
          initialBucket={projectBucket || ''}
          initialPath={projectPath}
          modalTitle="Import input file"
          okButtonText="Select input"
          onCancel={importSwitchFlow.closeImport}
          onOk={importSwitchFlow.handleImportInput}
        />
      )}

      {importSwitchFlow.switchInputOptions && (
        <SelectFile
          fileExtensions={[csvFileExtension]}
          initialBucket={projectBucket || ''}
          initialPath={fullProjectInputsFolder ?? undefined}
          modalTitle="Switch input file"
          okButtonText="Select input"
          onCancel={importSwitchFlow.closeSwitch}
          onOk={importSwitchFlow.handleSwitchInput}
        />
      )}

      <ViewImportVersionsModal />
      <CreateTableFromImportModal />
    </InputsContext.Provider>
  );
}
