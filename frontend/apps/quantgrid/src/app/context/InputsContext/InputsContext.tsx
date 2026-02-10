import { createContext } from 'react';

import {
  CommonMetadata,
  ImportCatalog,
  ImportDataset,
  ImportSource,
  ResourceMetadata,
  SharedWithMeMetadata,
} from '@frontend/common';

export type Inputs = {
  [fileName: string]: { fields: string[] };
};

type InputsContextActions = {
  inputsParentPath: string | null | undefined;
  inputsBucket: string | undefined;

  isInputsLoading: boolean;
  inputList: (ResourceMetadata | SharedWithMeMetadata)[] | null;

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
  expandFile: (file: CommonMetadata) => void;
  onSwitchInput: (tableName: string, fieldName: string) => void;
  importSources: Record<string, ImportSource>;
  getImportSources: () => Promise<void>;
  importCatalogs: Record<string, ImportCatalog>;
  importDatasets: Record<string, ImportDataset>;
  isImportSourcesLoading: boolean;
  expandImportSource: (sourceKey: string) => Promise<void>;
  expandImportCatalog: (sourceKey: string, datasetKey: string) => Promise<void>;
  syncAllImports: (params?: {
    source?: string;
    dataset?: string;
  }) => Promise<void>;
  syncSingleImportField: (
    tableName: string,
    fieldName: string
  ) => Promise<void>;
  onRenameImportSource: (oldName: string, newName: string) => void;
};

export const InputsContext = createContext<InputsContextActions>(
  {} as InputsContextActions
);
