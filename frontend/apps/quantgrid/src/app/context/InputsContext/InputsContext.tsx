import { createContext } from 'react';

import {
  CommonMetadata,
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
};

export const InputsContext = createContext<InputsContextActions>(
  {} as InputsContextActions
);
