import { GridCell, GridData, GridTable, SelectionEdges } from '../types';

export type SelectionAnchor =
  | { type: 'table'; tableName: string }
  | { type: 'cell'; tableName: string; fieldName: string; rowNum: number };

/**
 * Derives a stable "selection anchor" from the current selection edges.
 *
 * The anchor encodes which logical object is selected (table header, field header
 * or a concrete data cell) instead of raw row/column coordinates. This allows the
 * selection to be restored or remapped after data / tableStructure changes
 * (e.g., column reordering, resizing, etc.).
 */
export function getSelectionAnchor(
  edges: SelectionEdges | null,
  data: GridData,
): SelectionAnchor | null {
  if (!edges) return null;

  const { startCol, endCol, startRow, endRow } = edges;

  const colFrom = Math.min(startCol, endCol);
  const colTo = Math.max(startCol, endCol);
  const rowFrom = Math.min(startRow, endRow);
  const rowTo = Math.max(startRow, endRow);

  const objectKeys = new Set<string>();
  let anchorCell: GridCell | null = null;

  for (let row = rowFrom; row <= rowTo; row++) {
    const rowData = data[row];
    if (!rowData) continue;

    for (let col = colFrom; col <= colTo; col++) {
      const cell = rowData[col];
      if (!cell) continue;

      const tableName = cell.table?.tableName;
      const columnId = cell.field?.fieldName;
      const rowNum = cell.row ?? row;

      if (!tableName) continue;

      if (cell.table?.chartType) {
        return {
          type: 'table',
          tableName: cell.table.tableName,
        };
      }

      const key = `${tableName}|${columnId ?? ''}|${rowNum}`;
      objectKeys.add(key);
      if (!anchorCell) anchorCell = cell;

      if (objectKeys.size > 1) {
        return null;
      }
    }
  }

  if (!anchorCell) return null;

  const { table, field, isTableHeader, row, isFieldHeader, dataIndex } =
    anchorCell;

  if (rowFrom === rowTo && table && field) {
    // single cell (field header or data cell)
    const rowNum = isFieldHeader
      ? 0
      : dataIndex !== undefined
        ? dataIndex + 1
        : row;

    return {
      type: 'cell',
      tableName: table.tableName,
      fieldName: field.fieldName,
      rowNum,
    };
  }

  // table header
  if (isTableHeader && table) {
    return { type: 'table', tableName: table.tableName };
  }

  return null;
}

/**
 * Keeps the grid selection in sync with data and tableStructure changes.
 *
 * Using the previously computed selection anchor, recomputes the selection edges
 * when the underlying table layout or data changes.
 * It tries to select the same logical object (table, field header or data cell)
 * even if its row/column coordinates have shifted.
 */
export function getNextSelectionEdges(
  data: GridData,
  tableStructure: GridTable[],
  anchor: SelectionAnchor,
): SelectionEdges | null {
  const findTable = (tableName: string) =>
    tableStructure.find((t) => t.tableName === tableName);

  switch (anchor.type) {
    case 'cell': {
      const table = findTable(anchor.tableName);
      if (!table) return null;

      if (!table.isTableHorizontal) {
        const fieldIndex = table.fieldNames.indexOf(anchor.fieldName);
        if (fieldIndex === -1) return null;

        const colIndex = table.startCol + fieldIndex;
        let rowIndex: number;

        // field header
        if (anchor.rowNum === 0) {
          if (table.isTableFieldsHeaderHidden) return null;

          const tableNameHeaderOffset = table.isTableNameHeaderHidden ? 0 : 1;
          rowIndex = table.startRow + tableNameHeaderOffset;
        } else {
          const tableNameHeaderRows = table.isTableNameHeaderHidden ? 0 : 1;
          const fieldsHeaderRows = table.isTableFieldsHeaderHidden ? 0 : 1;
          const dataStartRow =
            table.startRow +
            tableNameHeaderRows +
            fieldsHeaderRows +
            table.totalSize;
          rowIndex = dataStartRow + (anchor.rowNum - 1);
        }

        const isCellOutOfTable =
          rowIndex < table.startRow || rowIndex > table.endRow;

        if (isCellOutOfTable) return null;

        const rowData = data[rowIndex];
        const cell = rowData?.[colIndex];
        if (!cell) return null;

        if (
          cell.table?.tableName !== anchor.tableName ||
          cell.field?.fieldName !== anchor.fieldName
        ) {
          return null;
        }

        return {
          startRow: cell.row,
          endRow: cell.row,
          startCol: cell.startCol,
          endCol: cell.endCol,
        };
      }

      // Fallback for horizontal tables
      for (let row = table.startRow; row <= table.endRow; row++) {
        const rowData = data[row];
        if (!rowData) continue;

        for (let col = table.startCol; col <= table.endCol; col++) {
          const cell = rowData[col];
          if (!cell) continue;

          const { table, field } = cell;

          if (
            table?.tableName !== anchor.tableName ||
            field?.fieldName !== anchor.fieldName
          ) {
            continue;
          }

          const rowNumCandidate = cell.isFieldHeader
            ? 0
            : cell.dataIndex !== undefined
              ? cell.dataIndex + 1
              : (cell.row ?? row);

          if (rowNumCandidate !== anchor.rowNum) continue;

          return {
            startRow: cell.row,
            endRow: cell.row,
            startCol: cell.startCol,
            endCol: cell.endCol,
          };
        }
      }

      return null;
    }

    case 'table': {
      const table = findTable(anchor.tableName);

      if (!table) return null;

      return {
        startRow: table.startRow,
        endRow: table.chartType ? table.endRow : table.startRow,
        startCol: table.startCol,
        endCol: table.endCol,
      };
    }

    default:
      return null;
  }
}
