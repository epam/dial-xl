import { useCallback, useContext } from 'react';
import { toast } from 'react-toastify';

import {
  ColumnDataType,
  CompileResponse,
  csvFileExtension,
  FieldInfo,
  parseSSEResponse,
  ViewportResponse,
} from '@frontend/common';
import { dynamicFieldName } from '@frontend/parser';

import { ProjectContext } from '../context';
import { constructPath, triggerDownload } from '../utils';
import { useApiRequests } from './useApiRequests';

export const useDownloadTable = () => {
  const { projectPath, projectBucket, projectName, projectSheets } =
    useContext(ProjectContext);
  const { getCompileInfo, getViewport, downloadTableBlob } = useApiRequests();

  const getDynamicFields = useCallback(
    async (
      fields: FieldInfo[],
      worksheets: Record<string, string>,
      project: string
    ) => {
      const viewportRes = await getViewport({
        projectPath: project,
        viewports: fields.map((fieldInfo) => ({
          fieldKey: fieldInfo.fieldKey,
          start_row: 0,
          end_row: 1000000,
        })),
        worksheets,
      });

      if (!viewportRes) return;

      const resultedData: string[] = [];
      try {
        await parseSSEResponse(viewportRes, {
          onData: (parsedData: Partial<ViewportResponse>) => {
            if (parsedData.columnData) {
              if (parsedData.columnData.errorMessage) {
                throw new Error(
                  `Failed getting information for dynamic field ${parsedData.columnData.fieldKey?.field} - ${parsedData.columnData.errorMessage}`
                );
              }

              resultedData.push(...parsedData.columnData.data);
            }
          },
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);

        return;
      }

      return resultedData;
    },
    [getViewport]
  );

  const collectFields = useCallback(
    async (
      tableName: string,
      project: string,
      sheets: Record<string, string>
    ) => {
      const res = await getCompileInfo({ worksheets: sheets ?? {} });

      if (!res) return;

      const response = await res.json();

      if (!response) return;

      const responseData = response as CompileResponse;

      const fields = responseData.compileResult.fieldInfo?.filter(
        (fieldInfo) =>
          fieldInfo.fieldKey?.table === tableName &&
          ![ColumnDataType.INPUT, ColumnDataType.TABLE].includes(fieldInfo.type)
      );
      const dynamicFields = fields?.filter(
        (fieldInfo) => fieldInfo.fieldKey?.field === dynamicFieldName
      );
      const staticFields =
        fields?.filter(
          (fieldInfo) => fieldInfo.fieldKey?.field !== dynamicFieldName
        ) ?? [];
      const resultedFields = [
        ...staticFields.map((field) => field.fieldKey?.field),
      ];

      if (dynamicFields) {
        const resultedDynamicFields = await getDynamicFields(
          dynamicFields,
          sheets,
          project
        );

        if (!resultedDynamicFields) return;

        resultedFields.push(...resultedDynamicFields);
      }

      return resultedFields.filter(Boolean) as string[];
    },
    [getCompileInfo, getDynamicFields]
  );

  const getDownloadLink = useCallback(
    async (tableName: string, fileName: string) => {
      const project = constructPath([projectBucket, projectPath, projectName]);
      const sheets = projectSheets?.reduce((acc, sheet) => {
        acc[sheet.sheetName] = sheet.content;

        return acc;
      }, {} as Record<string, string>);

      if (!sheets) return;

      const fields = await collectFields(tableName, project, sheets);

      if (!fields) return;

      if (!fields.length) {
        toast.error('Table has no fields with simple values to export.');

        return;
      }

      const fileBlob = await downloadTableBlob({
        columns: fields,
        projectPath: project,
        table: tableName,
        worksheets: sheets,
      });

      if (!fileBlob) return;

      const singleFile = new File([fileBlob], fileName);
      const fileUrl = window.URL.createObjectURL(singleFile);

      return fileUrl;
    },
    [
      collectFields,
      downloadTableBlob,
      projectBucket,
      projectName,
      projectPath,
      projectSheets,
    ]
  );

  const downloadTable = useCallback(
    async (tableName: string) => {
      const toastId = toast.loading('Preparing table data for download...');

      const fileName = `${tableName}${csvFileExtension}`;
      const resultedLink = await getDownloadLink(tableName, fileName);

      toast.dismiss(toastId);

      if (!resultedLink) {
        toast.error('Error happened during table download', {
          updateId: toastId,
        });

        return;
      }

      triggerDownload(resultedLink, `${tableName}${csvFileExtension}`);
    },
    [getDownloadLink]
  );

  return { downloadTable };
};
