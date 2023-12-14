import {
  ChartData,
  ColumnChunk,
  ColumnData,
  TableData,
  Viewport,
} from '@frontend/common';
import { dynamicFieldName, ParsedTable } from '@frontend/parser';

import { CachedViewport } from '../common';
import { DynamicFieldsByTable } from '../context';

export const chunkSize = 100;

export function saveChunksToCache(
  updatedTableData: TableData,
  columnData: ColumnData
) {
  const {
    tableName,
    columnName,
    data,
    endRow,
    startRow,
    isNested,
    errorMessage,
    type,
    referenceTableName,
  } = columnData;

  let table = updatedTableData[tableName];

  if (!table) {
    table = {
      maxKnownRowIndex: 0,
      columnDataLoaded: new Set(),
      nestedColumnNames: new Set(),
      fieldErrors: {},
      types: {},
      chunks: {},
      columnReferenceTableNames: {},
    };
  }

  if (referenceTableName) {
    table.columnReferenceTableNames[columnName] = referenceTableName;
  }

  if (!data.length) {
    table.columnDataLoaded.add(columnName);

    if (errorMessage) {
      table.fieldErrors[columnName] = errorMessage;
    }

    updatedTableData[tableName] = table;

    return updatedTableData;
  }

  const { chunks } = table;
  const rowsCount = data.length;
  const responseEndRow = parseInt(endRow);
  const responseStartRow =
    startRow === undefined || !startRow
      ? responseEndRow - rowsCount
      : parseInt(startRow);

  let index = Math.floor(responseStartRow / chunkSize);
  let keepUpdating = true;

  while (keepUpdating) {
    keepUpdating = false;

    const chunkStartRow = index * chunkSize;
    const chunkEndRow = chunkStartRow + chunkSize;

    if (!chunks[index]) chunks[index] = {};
    const chunk = chunks[index];

    const start = Math.max(chunkStartRow, responseStartRow);
    const end = Math.min(chunkEndRow, responseStartRow + rowsCount);

    if (responseStartRow + rowsCount > end) {
      keepUpdating = true;
    }

    if (!chunk[columnName]) {
      chunk[columnName] = new Array(Math.min(chunkSize, end - start));
    }
    for (let i = start; i < end; i++) {
      chunk[columnName][i - chunkStartRow] = data[i - responseStartRow];
    }
    index++;
  }

  if (isNested) table.nestedColumnNames.add(columnName);

  if (columnName !== dynamicFieldName) {
    const maxTableRow =
      responseEndRow - rowsCount === 0
        ? responseEndRow
        : responseStartRow + rowsCount;
    table.maxKnownRowIndex = Math.max(table.maxKnownRowIndex, maxTableRow);
  }

  table.types[columnName] = type;

  if (errorMessage) {
    table.fieldErrors[columnName] = errorMessage;
  }

  updatedTableData[tableName] = table;

  return updatedTableData;
}

export function getNotLoadedChunks(
  chunks: { [index: number]: ColumnChunk },
  fields: string[],
  startRow: number,
  endRow: number
): CachedViewport | null {
  const start = Math.floor(startRow / chunkSize);
  const end = Math.floor(endRow / chunkSize);
  const notLoadedFields: Set<string> = new Set();

  let min: number | null = null;
  let max: number | null = null;

  for (let chunkIndex = start; chunkIndex <= end; ++chunkIndex) {
    const allFieldsLoaded =
      fields &&
      fields.every(
        (field) => chunks[chunkIndex] && field in chunks[chunkIndex]
      );

    fields.forEach((f) => {
      if (!(chunks[chunkIndex] && f in chunks[chunkIndex])) {
        notLoadedFields.add(f);
      }
    });

    if (!(chunkIndex in chunks) || !allFieldsLoaded) {
      if (min == null) {
        min = chunkIndex;
      }
      max = chunkIndex;
    }
  }

  if (min === null || max === null) return null;

  return {
    startRow: min * chunkSize,
    endRow: (max + 1) * chunkSize,
    fields: notLoadedFields,
  };
}

export function createViewportRequest(
  sheetTables: ParsedTable[],
  tableData: TableData,
  viewportStartCol: number,
  viewportEndCol: number,
  viewportStartRow: number,
  viewportEndRow: number,
  cachedViewport: Record<string, CachedViewport>,
  dynamicFields?: DynamicFieldsByTable
) {
  const viewportRequest: Record<string, Viewport> = {};
  const updatedCachedViewport: Record<string, CachedViewport> = {};
  const [start_row, end_row] = getExtendedRoundedBorders(
    Math.max(0, viewportStartRow),
    viewportEndRow
  );

  for (const table of sheetTables) {
    const { tableName } = table;
    const [tableStartRow] = table.getPlacement();
    const endRow = Number.MAX_SAFE_INTEGER;

    if (!(viewportStartRow < endRow && viewportEndRow > tableStartRow))
      continue;

    const normalizedStartRow = Math.max(0, start_row - tableStartRow);
    const normalizedEndRow = Math.min(endRow, end_row) - tableStartRow;
    const chunks = tableData[tableName]?.chunks || {};
    const columnDataLoaded =
      tableData[tableName]?.columnDataLoaded || new Set();

    const fields = getTableFieldsForViewport(
      table,
      columnDataLoaded,
      viewportStartCol,
      viewportEndCol,
      dynamicFields?.[tableName]
    );

    const notLoadedChunks = getNotLoadedChunks(
      chunks,
      fields,
      normalizedStartRow,
      normalizedEndRow
    );

    if (
      !notLoadedChunks ||
      !notLoadedChunks.fields ||
      notLoadedChunks.fields.size === 0
    )
      continue;

    const cachedTableViewport = cachedViewport[tableName];
    const cachedFields = cachedTableViewport?.fields || new Set();
    const updatedCachedFields = new Set([
      ...cachedFields,
      ...notLoadedChunks.fields,
    ]);

    const sameRows =
      notLoadedChunks.startRow === cachedTableViewport?.startRow &&
      notLoadedChunks.endRow === cachedTableViewport?.endRow;
    const sameFields = cachedFields.size === updatedCachedFields.size;

    if (!dynamicFields && sameRows && sameFields) continue;

    updatedCachedViewport[tableName] = {
      startRow: notLoadedChunks.startRow,
      endRow: notLoadedChunks.endRow,
      fields: updatedCachedFields,
    };

    const viewportRequestStartRow = dynamicFields
      ? normalizedStartRow
      : Math.max(
          normalizedStartRow,
          Math.max(0, notLoadedChunks?.startRow || 0)
        );

    viewportRequest[tableName] = {
      start_row: viewportRequestStartRow,
      end_row: normalizedEndRow + tableStartRow,
      fields: Array.from(notLoadedChunks.fields),
    };
  }

  return { viewportRequest, updatedCachedViewport };
}

export function getExtendedRoundedBorders(
  start: number,
  end: number,
  maxSize = Number.MAX_SAFE_INTEGER
) {
  const startRow =
    Math.floor(Math.max(0, start - chunkSize) / chunkSize) * chunkSize;
  const endRow =
    (1 + Math.floor((end + chunkSize - 1) / chunkSize)) * chunkSize;

  return [startRow, maxSize && endRow > maxSize ? maxSize : endRow];
}

export function getTableFieldsForViewport(
  table: ParsedTable,
  columnDataLoaded: Set<string>,
  viewportStartCol: number,
  viewportEndCol: number,
  dynamicFields?: string[]
): string[] {
  const extraCols = 10;
  let fields = dynamicFields
    ? dynamicFields
    : table.fields.map((f) => f.key.fieldName);

  fields = fields.filter((f) => {
    if (columnDataLoaded.has(f)) return false;

    const [, startCol] = table.getPlacement();
    let fieldIndex = table.fields.findIndex(
      (field) => field.key.fieldName === f
    );

    if (fieldIndex === -1 && dynamicFields) {
      const dynamicVirtualFieldIndex = dynamicFields.findIndex(
        (field) => field === f
      );
      const dynamicFieldIndex = table.fields.findIndex(
        (field) => field.key.fieldName === dynamicFieldName
      );

      fieldIndex = dynamicVirtualFieldIndex + dynamicFieldIndex;
    }

    const fieldCol = fieldIndex + startCol;

    if (f === dynamicFieldName) return true;

    return (
      fieldCol < viewportEndCol + extraCols &&
      fieldCol > Math.max(0, viewportStartCol - extraCols)
    );
  });

  return fields;
}

export function createGetMoreChartKeysRequest(
  chartKeys: TableData,
  tableName: string,
  fieldName: string
) {
  const viewportRequest: Record<string, Viewport> = {};
  const tableData = chartKeys[tableName];

  if (tableData.columnDataLoaded.has(fieldName)) return viewportRequest;

  const { maxKnownRowIndex } = tableData;

  viewportRequest[tableName] = {
    start_row: maxKnownRowIndex,
    end_row: maxKnownRowIndex + chunkSize,
    fields: [fieldName],
  };

  return viewportRequest;
}

export function saveChartColumnData(
  updatedTableData: ChartData,
  columnData: ColumnData
) {
  const { tableName, columnName, periodSeries } = columnData;
  const table = updatedTableData[tableName] || {};

  if (periodSeries.length > 0) {
    table[columnName] = periodSeries;
  }

  updatedTableData[tableName] = table;

  return updatedTableData;
}
