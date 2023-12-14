import { TableData } from '@frontend/common';
import { ParsedTable } from '@frontend/parser';
import {
  defaultChartCols,
  defaultChartRows,
  GridTable,
  toolbarRows,
} from '@frontend/spreadsheet';

export function createTableStructure(
  sheetTables: ParsedTable[] | undefined,
  tableData: TableData
): GridTable[] {
  const tableStructure: GridTable[] = [];

  if (sheetTables && sheetTables.length > 0) {
    for (const table of sheetTables) {
      const [startRow, startCol] = table.getPlacement();
      const fieldsCount = table.getFieldsCount();
      const endCol = fieldsCount > 0 ? startCol + fieldsCount - 1 : startCol;

      const maxRow =
        tableData[table.tableName]?.maxKnownRowIndex + startRow + 1 || 0;
      const endRow = maxRow > 0 ? maxRow : startRow + 1;

      if (table.isLineChart()) {
        const chartSize = table.getChartSize();
        const chartRows = chartSize[0] || defaultChartRows;
        const chartCols = chartSize[1] || defaultChartCols;

        tableStructure.push({
          startRow,
          startCol,
          endCol: startCol + chartCols - 1,
          endRow: startRow + chartRows + toolbarRows,
          tableName: table.tableName,
          chartType: 'line',
        });

        continue;
      }

      tableStructure.push({
        startRow,
        startCol,
        endCol,
        endRow,
        tableName: table.tableName,
      });
    }
  }

  return tableStructure;
}
