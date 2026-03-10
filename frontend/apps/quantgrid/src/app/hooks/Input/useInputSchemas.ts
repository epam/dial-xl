import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';

import {
  ApiRequestFunction,
  appMessages,
  CommonMetadata,
  DimensionalSchemaResponse,
  GetDimensionalSchemaParams,
  WorksheetState,
} from '@frontend/common';

import { InputsList } from '../../context';
import { getProjectSheetsRecord } from '../../utils';

type UseInputSchemasDeps = {
  projectName: string | null;
  projectSheets: WorksheetState[] | null;
  getDimensionalSchema: ApiRequestFunction<
    GetDimensionalSchemaParams,
    DimensionalSchemaResponse
  >;
};

export function useInputSchemas({
  projectName,
  projectSheets,
  getDimensionalSchema,
}: UseInputSchemasDeps) {
  const [inputs, setInputs] = useState<InputsList>({});

  const onExpandCSVDimensionalSchemaResponse = useCallback(
    (response: DimensionalSchemaResponse) => {
      const { schema, formula, errorMessage } =
        response.dimensionalSchemaResponse;

      if (!formula.startsWith('INPUT')) return;

      const fileName = formula.slice(
        formula.indexOf('"') + 1,
        formula.lastIndexOf('"'),
      );
      const shortFileName = fileName.split('/').pop();

      if (errorMessage) {
        toast.error(
          appMessages.fileUploadSchemaError(
            shortFileName ?? fileName,
            errorMessage,
          ),
        );

        return;
      }

      setInputs((prev) => ({ ...prev, [fileName]: { fields: schema } }));
    },
    [],
  );

  const expandCSVFile = useCallback(
    async (file: CommonMetadata) => {
      if (!projectName || !file.url || inputs[file.url]) return;

      const formula = `INPUT("${file.url}")`;

      const dimensionalSchema = await getDimensionalSchema({
        formula,
        worksheets: getProjectSheetsRecord(projectSheets || []),
        suppressErrors: true,
      });

      if (!dimensionalSchema) {
        toast.error(
          `Error happened during creating schema for file "${file.name}". Recheck file structure and reupload it.`,
        );

        return;
      }

      onExpandCSVDimensionalSchemaResponse(dimensionalSchema);
    },
    [
      getDimensionalSchema,
      inputs,
      onExpandCSVDimensionalSchemaResponse,
      projectName,
      projectSheets,
    ],
  );

  return {
    inputs,
    setInputs,
    expandCSVFile,
  };
}
