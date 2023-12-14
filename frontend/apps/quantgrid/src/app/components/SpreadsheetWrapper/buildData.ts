import {
  ColumnDataType,
  CompilationError,
  ParsingError,
  TableData,
  tableFieldOffset,
  tableRowOffset,
} from '@frontend/common';
import {
  defaultRowKey,
  dynamicFieldName,
  OverrideValue,
  ParsedTable,
  SheetReader,
} from '@frontend/parser';
import {
  defaultChartRows,
  GridCell,
  GridData,
  GridTable,
  toolbarRows,
} from '@frontend/spreadsheet';
import { defaultChartCols } from '@frontend/spreadsheet';

import { chunkSize } from '../../services';

const defaultZIndex = 2;

export function buildData(
  tables: ParsedTable[] | undefined,
  tableData: TableData,
  parsingErrors: ParsingError[] | null,
  compilationErrors: CompilationError[] | null
) {
  const data: GridData = {};

  if (!tables) return data;

  let zIndex = defaultZIndex;

  const safeSetCell = (row: number, col: number, cell: GridCell) => {
    if (!data[row]) data[row] = {};

    data[row][col] = cell;
  };

  for (const table of tables) {
    const { tableName } = table;
    zIndex++;
    const [startRow, startCol] = table.getPlacement();

    const fieldsCount = table.getFieldsCount();
    const maxRow = tableData[tableName]?.maxKnownRowIndex + startRow + 1 || 0;
    const endRow = maxRow > 0 ? maxRow : startRow + 1;
    const endCol = fieldsCount > 0 ? startCol + fieldsCount - 1 : startCol;

    const tablePlacement: GridTable = {
      endRow,
      endCol,
      startRow,
      startCol,
      tableName,
    };

    // Add table header row
    if (table.isLineChart()) {
      const chartSize = table.getChartSize();
      const chartRows = chartSize[0] || defaultChartRows;
      const chartCols = chartSize[1] || defaultChartCols;

      const chartEndCol = startCol + chartCols - 1;
      tablePlacement.endCol = chartEndCol;
      tablePlacement.endRow = startRow + chartRows + toolbarRows;
      tablePlacement.chartType = 'line';

      for (let col = startCol; col <= chartEndCol; col++) {
        safeSetCell(startRow, col, {
          table: tablePlacement,
          value: tableName,
          row: startRow,
          col,
          zIndex: col === startCol ? zIndex + 1 : zIndex,
        });
      }

      continue;
    }

    for (let col = startCol; col <= endCol; col++) {
      safeSetCell(startRow, col, {
        table: tablePlacement,
        value: tableName,
        row: startRow,
        col,
        zIndex: col === startCol ? zIndex + 1 : zIndex,
      });
    }

    // Add table fields
    let colIndex = startCol;

    for (const {
      key: { fieldName },
      expressionMetadata,
      isKey,
      isDim,
      isDynamic,
    } of table.fields) {
      const fieldRow = startRow + tableFieldOffset;
      const columnName = fieldName;

      if (columnName === dynamicFieldName) continue;

      const viewportErrorMessage =
        tableData[tableName]?.fieldErrors[columnName];
      const errorMessage = getMergedErrorMessage(
        parsingErrors,
        compilationErrors,
        viewportErrorMessage,
        tableName,
        columnName
      );

      const isNested = tableData[tableName]?.nestedColumnNames.has(columnName);
      const type = tableData[tableName]?.types[columnName];
      const isPeriodSeries = type === ColumnDataType.PERIOD_SERIES;

      safeSetCell(fieldRow, colIndex, {
        table: tablePlacement,
        value: columnName,
        field: {
          fieldName: columnName,
          expression: expressionMetadata?.text || '',
          isPeriodSeries,
          isDynamic,
          isNested,
          isKey,
          isDim,
          type,
        },
        row: fieldRow,
        col: colIndex,
        error: errorMessage,
        isManual: table.isManual(),
        zIndex,
      });

      colIndex += 1;
    }

    const cachedTableData = tableData[tableName];

    if (!cachedTableData) continue;

    // Add table values
    for (const chunkIndex of Object.keys(cachedTableData.chunks)) {
      const chunk = cachedTableData.chunks[parseInt(chunkIndex)];
      let minRowIndex = Number.MAX_SAFE_INTEGER;
      let maxRowIndex = Number.MIN_SAFE_INTEGER;

      // Add cells that have data in chunks
      for (const columnName of Object.keys(chunk)) {
        if (columnName === dynamicFieldName) continue;

        const column = chunk[columnName];
        const fieldIndex = table.fields
          .filter((f) => f.key.fieldName !== dynamicFieldName)
          .findIndex((f) => f.key.fieldName === columnName);
        const field = table.fields.find((f) => f.key.fieldName === columnName);

        if (fieldIndex === -1 || !field) continue;

        const rowOffset = parseInt(chunkIndex) * chunkSize;

        for (let rowIndex = 0; rowIndex < column.length; rowIndex++) {
          const row = rowIndex + rowOffset + startRow + tableRowOffset;
          const col = startCol + fieldIndex;
          const tableRowData: Record<string, string> = {};

          minRowIndex = Math.min(minRowIndex, row);
          maxRowIndex = Math.max(maxRowIndex, row);

          Object.keys(chunk).forEach((fieldName) => {
            tableRowData[fieldName] = chunk[fieldName][rowIndex];
          });

          const { overrideValue, overrideIndex } = getOverrideValue(
            table,
            columnName,
            rowIndex,
            tableRowData
          );

          const referenceTableName =
            tableData[tableName]?.columnReferenceTableNames[columnName];

          const type = cachedTableData.types[columnName];
          const value = column[rowIndex];

          safeSetCell(row, col, {
            table: tablePlacement,
            isOverride: !!overrideValue,
            isManual: table.isManual(),
            field: {
              fieldName: columnName,
              expression: field?.expressionMetadata?.text || '',
              isPeriodSeries: type === ColumnDataType.PERIOD_SERIES,
              isNested: cachedTableData.nestedColumnNames.has(columnName),
              isKey: field?.isKey,
              isDim: field?.isDim,
              isDynamic: field?.isDynamic,
              type,
              referenceTableName,
            },
            overrideIndex: overrideIndex !== null ? overrideIndex : undefined,
            value,
            row,
            col,
            zIndex,
          });
        }
      }

      // Add cells that have no data in chunks
      const noDataFieldNames = table.fields.filter(
        (f) => !chunk[f.key.fieldName] && f.key.fieldName !== dynamicFieldName
      );

      for (const field of noDataFieldNames) {
        const columnName = field.key.fieldName;
        const fieldIndex = table.fields
          .filter((f) => f.key.fieldName !== dynamicFieldName)
          .findIndex((f) => f.key.fieldName === columnName);
        const col = startCol + fieldIndex;
        const type = cachedTableData.types[columnName];
        const referenceTableName =
          tableData[tableName]?.columnReferenceTableNames[columnName];

        for (let row = minRowIndex; row <= maxRowIndex; row++) {
          safeSetCell(row, col, {
            table: tablePlacement,
            isOverride: false,
            isManual: table.isManual(),
            field: {
              fieldName: columnName,
              expression: field?.expressionMetadata?.text || '',
              isPeriodSeries: type === ColumnDataType.PERIOD_SERIES,
              isNested: cachedTableData.nestedColumnNames.has(columnName),
              isKey: field?.isKey,
              isDim: field?.isDim,
              isDynamic: field?.isDynamic,
              type,
              referenceTableName,
            },
            overrideIndex: undefined,
            value: undefined,
            row,
            col,
            zIndex,
          });
        }
      }
    }

    const tableErrors =
      parsingErrors?.filter((error) => error.tableName === tableName) || [];

    for (const error of tableErrors) {
      let errorFieldColumn = table.fields.findIndex(
        (field) =>
          SheetReader.stripQuotes(field.key.fieldName) === error.fieldName
      );

      if (errorFieldColumn === -1) continue;

      errorFieldColumn += startCol;
      const errorEndRow = Math.max(
        Math.min(endRow, endRow - tableRowOffset),
        0
      );

      for (let rowIndex = startRow; rowIndex <= errorEndRow; rowIndex++) {
        const row = rowIndex + tableRowOffset;

        safeSetCell(row, errorFieldColumn, {
          error: error.message,
          table: tablePlacement,
          row,
          col: errorFieldColumn,
          zIndex,
        });
      }
    }
  }

  return data;
}

function getOverrideValue(
  table: ParsedTable,
  fieldName: string,
  tableRowIndex: number,
  tableRowData: Record<string, string>
): { overrideValue: OverrideValue; overrideIndex: number | null } {
  const override = { overrideValue: null, overrideIndex: null };

  if (!table.overrides) return override;

  const { overrides } = table;

  // Manual table overrides
  if (table.isManual()) {
    const overrideValue = overrides.getValueAtIndex(fieldName, tableRowIndex);

    if (!overrideValue) return override;

    return {
      overrideValue,
      overrideIndex: tableRowIndex,
    };
  }

  if (overrides.hasKey(fieldName)) return override;

  // Table without keys, use 'row' as index key
  if (!table.hasKeys() && overrides.hasKey(defaultRowKey)) {
    const findOverride = overrides.getValueByKey(
      defaultRowKey,
      tableRowIndex + 1,
      fieldName
    );

    return !findOverride ? override : findOverride;
  }

  // Table with keys
  const findOverride = overrides.getValueByKeys(tableRowData, fieldName);

  return !findOverride ? override : findOverride;
}

function getMergedErrorMessage(
  parsingError: ParsingError[] | null,
  compilationError: CompilationError[] | null,
  viewportErrorMessage: string | undefined,
  tableName: string,
  fieldName: string
): string | undefined {
  const parsingMessage = parsingError?.find(
    (error: ParsingError | CompilationError) =>
      error.tableName === tableName &&
      (error.fieldName === fieldName || !error.fieldName)
  )?.message;

  const compilationMessage = compilationError?.find(
    (error) => error.tableName === tableName && error.fieldName === fieldName
  )?.message;

  if (!parsingMessage && !compilationMessage && !viewportErrorMessage) return;

  return [parsingMessage, compilationMessage, viewportErrorMessage].join('\n');
}

export function removeTables(
  tableData: GridData,
  tablesToRemove: string[]
): GridData {
  const newTableData = { ...tableData };

  for (const row of Object.keys(newTableData)) {
    for (const col of Object.keys(newTableData[row])) {
      const cell = newTableData[row][col] as GridCell;
      const tableName = cell?.table?.tableName || '';

      if (tablesToRemove.includes(tableName)) {
        delete newTableData[row][col];
      }
    }
  }

  return newTableData;
}

// Remove all charts from table data and add chart headers to table data
export function updateChartsData(
  tableData: GridData,
  tables: ParsedTable[] | undefined
): GridData {
  const newTableData = { ...tableData };

  if (!tables) return newTableData;

  for (const row of Object.keys(newTableData)) {
    for (const col of Object.keys(newTableData[row])) {
      const cell = newTableData[row][col] as GridCell;
      const isChart = !!cell?.table?.chartType;

      if (isChart) {
        delete newTableData[row][col];
      }
    }
  }

  const safeSetCell = (row: number, col: number, cell: GridCell) => {
    if (!newTableData[row]) newTableData[row] = {};

    newTableData[row][col] = cell;
  };

  let zIndex = defaultZIndex;

  const chartTables = tables.filter((table) => table.isChart());

  for (const table of chartTables) {
    const { tableName } = table;
    zIndex++;
    const [startRow, startCol] = table.getPlacement();

    const fieldsCount = table.getFieldsCount();
    const endRow = startRow + 1;
    const endCol = fieldsCount > 0 ? startCol + fieldsCount - 1 : startCol;

    const tablePlacement: GridTable = {
      endRow,
      endCol,
      startRow,
      startCol,
      tableName,
    };

    // Add table header row
    if (table.isLineChart()) {
      const chartSize = table.getChartSize();
      const chartRows = chartSize[0] || defaultChartRows;
      const chartCols = chartSize[1] || defaultChartCols;

      const chartEndCol = startCol + chartCols - 1;
      tablePlacement.endCol = chartEndCol;
      tablePlacement.endRow = startRow + chartRows;
      tablePlacement.chartType = 'line';

      for (let col = startCol; col <= chartEndCol; col++) {
        safeSetCell(startRow, col, {
          table: tablePlacement,
          value: tableName,
          row: startRow,
          col,
          zIndex: col === startCol ? zIndex + 1 : zIndex,
        });
      }
    }
  }

  return newTableData;
}
