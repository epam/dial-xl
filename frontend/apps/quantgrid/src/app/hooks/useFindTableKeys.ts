import { useCallback, useContext } from 'react';

import { ColumnDataType, firstRowNum } from '@frontend/common';
import { ParsedTable } from '@frontend/parser';

import { chunkSize, ViewportContext } from '../context';

export function useFindTableKeys() {
  const { viewGridData } = useContext(ViewportContext);

  const findTableKeys = useCallback(
    (table: ParsedTable, row: number): string | number => {
      const tableKeys = table.fields
        .filter((f) => f.isKey)
        .map((f) => f.key.fieldName);

      const [startRow] = table.getPlacement();
      const keyValues: string[] = [];
      const isTableHorizontal = table.getIsTableDirectionHorizontal();
      const tableRow =
        Math.abs(row - startRow) -
        table.getTableNameHeaderHeight() -
        table.getTotalSize() -
        (isTableHorizontal ? 0 : table.getTableFieldsHeaderHeight());

      tableKeys.forEach((key) => {
        const tableData = viewGridData.getTableData(table.tableName);
        const fieldType = tableData.types[key];
        const chunkIndex = Math.floor(tableRow / chunkSize);
        const chunk = tableData.chunks[+chunkIndex];
        let tableDataValue = '';

        if (chunk && chunk[key]) {
          const innerChunkIndex = tableRow % chunkSize;
          tableDataValue = chunk[key][innerChunkIndex];
        }

        // The case is for heavy calculations:
        // when the fresh data is not loaded yet, but old data is still available
        if (!tableDataValue) {
          const fallbackChunk = tableData.fallbackChunks[+chunkIndex];

          if (fallbackChunk && fallbackChunk[key]) {
            const innerChunkIndex = tableRow % chunkSize;
            tableDataValue = fallbackChunk[key][innerChunkIndex];
          }
        }

        if (key && tableDataValue) {
          const formattedValue =
            fieldType === ColumnDataType.STRING
              ? `"${tableDataValue}"`
              : tableDataValue;
          keyValues.push(formattedValue);
        }
      });

      const values = keyValues.join(',');

      return values ? values : tableRow + firstRowNum;
    },
    [viewGridData]
  );

  return {
    findTableKeys,
  };
}
