import type { DataNode } from 'antd/es/tree';
import { EventDataNode } from 'antd/es/tree';
import { useCallback, useContext } from 'react';

import { InputsContext } from '../../../../context';
import {
  excelTreeKey,
  importTreeKey,
  InputChildData,
} from './contextMenuTypes';

export interface UseInputsExpandParams {
  childData: InputChildData;
}

export function useInputsExpand({ childData }: UseInputsExpandParams) {
  const {
    expandCSVFile,
    expandImportSource,
    expandImportCatalog,
    expandExcelCatalog,
    expandExcelSheet,
    expandExcelTable,
  } = useContext(InputsContext);

  const onExpand = useCallback(
    async (node: EventDataNode<DataNode>) => {
      if (node.isLeaf) return;

      const key = node.key as string;

      // Check if it's an import source
      if (key.startsWith(importTreeKey.source)) {
        const sourceKey = key.replace(importTreeKey.source, '');
        await expandImportSource(sourceKey);

        return;
      }

      // Check if it's an import catalog (table)
      if (key.startsWith(importTreeKey.catalog)) {
        const [sourceKey, datasetKey] = key
          .replace(importTreeKey.catalog, '')
          .split(':');
        await expandImportCatalog(sourceKey, datasetKey);

        return;
      }

      // Check if it's an Excel file
      if (key.startsWith(excelTreeKey.file)) {
        const file = childData[key];
        if (file) {
          await expandExcelCatalog(file);
        }

        return;
      }

      // Check if it's an Excel sheet
      if (key.startsWith(excelTreeKey.sheet)) {
        const file = childData[key];
        if (file) {
          const sheetName = key
            .replace(excelTreeKey.sheet, '')
            .split(':')
            .pop();
          if (sheetName) {
            await expandExcelSheet(file.url, sheetName);
          }
        }

        return;
      }

      // Check if it's an Excel table
      if (key.startsWith(excelTreeKey.table)) {
        const file = childData[key];
        if (file) {
          const tableName = key
            .replace(excelTreeKey.table, '')
            .split(':')
            .pop();
          if (tableName) {
            await expandExcelTable(file.url, tableName);
          }
        }

        return;
      }

      expandCSVFile(childData[node.key as string]);
    },
    [
      childData,
      expandCSVFile,
      expandExcelCatalog,
      expandExcelSheet,
      expandExcelTable,
      expandImportSource,
      expandImportCatalog,
    ],
  );

  return { onExpand };
}
