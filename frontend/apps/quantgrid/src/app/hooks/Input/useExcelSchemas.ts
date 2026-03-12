import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';

import {
  ApiRequestFunctionWithError,
  CommonMetadata,
  DimensionalSchemaResponse,
  ExcelCatalogGetResponse,
  GetDimensionalSchemaParams,
  GetExcelCatalogParams,
  WorksheetState,
} from '@frontend/common';

import { ExcelCatalog, ExcelSheet, ExcelTable } from '../../context';
import { getProjectSheetsRecord } from '../../utils';

type UseExcelSchemasDeps = {
  projectName: string | null;
  projectSheets: WorksheetState[] | null;
  getExcelCatalog: ApiRequestFunctionWithError<
    GetExcelCatalogParams,
    ExcelCatalogGetResponse['excelCatalogGetResponse']
  >;
  getDimensionalSchema: ApiRequestFunctionWithError<
    GetDimensionalSchemaParams,
    DimensionalSchemaResponse
  >;
};

export function useExcelSchemas({
  projectName,
  projectSheets,
  getExcelCatalog,
  getDimensionalSchema,
}: UseExcelSchemasDeps) {
  const [excelCatalogs, setExcelCatalogs] = useState<
    Record<string, ExcelCatalog>
  >({});
  const [excelSheets, setExcelSheets] = useState<Record<string, ExcelSheet>>(
    {},
  );
  const [excelTables, setExcelTables] = useState<Record<string, ExcelTable>>(
    {},
  );

  const expandExcelCatalog = useCallback(
    async (file: CommonMetadata) => {
      if (!projectName || !file.url || excelCatalogs[file.url]) return;

      const res = await getExcelCatalog({ path: file.url });

      if (!res.success) {
        toast.error(
          `Error happened during getting schema for file "${file.name}". Recheck file structure and reupload it.`,
        );

        return;
      }

      const { sheets, tables } = res.data;

      setExcelCatalogs((prev) => ({
        ...prev,
        [file.url!]: {
          fileUrl: file.url!,
          sheets,
          tables,
        },
      }));
    },
    [excelCatalogs, getExcelCatalog, projectName],
  );

  const expandExcelSheet = useCallback(
    async (fileUrl: string, sheetName: string) => {
      const sheetKey = `${fileUrl}:${sheetName}`;
      if (excelSheets[sheetKey]) return;

      const formula = `INPUT("${fileUrl}?sheet=${sheetName}")`;

      const dimensionalSchema = await getDimensionalSchema({
        formula,
        worksheets: getProjectSheetsRecord(projectSheets || []),
        suppressErrors: true,
      });

      if (
        !dimensionalSchema.success ||
        dimensionalSchema.data.dimensionalSchemaResponse?.errorMessage
      ) {
        toast.error(
          `Error happened during getting schema for sheet "${sheetName}". Recheck file structure.`,
        );

        return;
      }

      const { schema } = dimensionalSchema.data.dimensionalSchemaResponse;

      setExcelSheets((prev) => ({
        ...prev,
        [sheetKey]: { fileUrl, sheetName, columns: schema },
      }));
    },
    [excelSheets, getDimensionalSchema, projectSheets],
  );

  const expandExcelTable = useCallback(
    async (fileUrl: string, tableName: string) => {
      const tableKey = `${fileUrl}:${tableName}`;
      if (excelTables[tableKey]) return;

      const formula = `INPUT("${fileUrl}?table=${tableName}")`;

      const dimensionalSchema = await getDimensionalSchema({
        formula,
        worksheets: getProjectSheetsRecord(projectSheets || []),
        suppressErrors: true,
      });

      if (
        !dimensionalSchema.success ||
        dimensionalSchema.data.dimensionalSchemaResponse?.errorMessage
      ) {
        toast.error(
          `Error happened during getting schema for table "${tableName}". Recheck file structure.`,
        );

        return;
      }

      const { schema } = dimensionalSchema.data.dimensionalSchemaResponse;

      setExcelTables((prev) => ({
        ...prev,
        [tableKey]: { fileUrl, tableName, columns: schema },
      }));
    },
    [excelTables, getDimensionalSchema, projectSheets],
  );

  return {
    excelCatalogs,
    excelSheets,
    excelTables,
    expandExcelCatalog,
    expandExcelSheet,
    expandExcelTable,
    setExcelCatalogs,
    setExcelSheets,
    setExcelTables,
  };
}
