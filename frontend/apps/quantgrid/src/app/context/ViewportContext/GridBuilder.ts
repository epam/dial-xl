import {
  ColumnChunk,
  ColumnDataType,
  defaultChartCols,
  defaultChartRows,
  GridCell,
  GridData,
  GridField,
  GridTable,
  isNumericType,
  isValidUrl,
  TableData,
} from '@frontend/common';
import {
  CachedOverrideRow,
  dynamicFieldName,
  OverrideValue,
  ParsedTable,
  unescapeOverrideValue,
} from '@frontend/parser';

import { getOverrideRow } from './getOverrideRow';
import {
  getFieldErrors,
  getOverrideErrors,
  getTotalErrors,
} from './gridErrors';
import { ApplyBlockGridParams, TableDimensions } from './types';
import { chunkSize, defaultZIndex, ViewGridData } from './ViewGridData';

/**
 * Class which converts tablesData to necessary format for grid
 */
export class GridBuilder {
  protected viewGridData: ViewGridData;

  constructor(viewGridData: ViewGridData) {
    this.viewGridData = viewGridData;
  }

  /**
   * Method which creates 2 dimensional object if it's not exists and set value to it (col, row)
   * @param data {GridData} Object which grid allows to put in
   * @param row {number} Row
   * @param col {number} Column
   * @param cell {GridCell} Grid cell value (styles, value, meta info, etc.)
   * @returns {GridData} Reference to updated GridData
   */
  protected static setSafeDataCell(
    data: GridData,
    row: number,
    col: number,
    cell: GridCell
  ): GridData {
    if (!data[row]) data[row] = {};

    data[row][col] = cell;

    return data;
  }

  /**
   * Gets real dimension which cached table (by specified tableName) occupies on grid (startRow, endRow, startCol, endCol)
   * @param tableName {string} specified tableName
   * @returns {TableDimensions} table dimensions
   */
  public getTableDimensions(
    tableName: string,
    isTableHorizontal: boolean
  ): TableDimensions {
    const tableData = this.viewGridData.getTableData(tableName);

    if (!tableData) {
      throw new Error(
        "[ViewGridData] getTableDimensions, table data doesn't exists requested tableName: " +
          tableName
      );
    }

    const { table, maxKnownRowIndex } = tableData;

    const [startRow, startCol] = table.getPlacement();
    const totalSize = table.getTotalSize();

    if (table.isLineChart()) {
      const chartSize = table.getChartSize();
      const chartRows = chartSize[0] || defaultChartRows;
      const chartCols = chartSize[1] || defaultChartCols;

      return {
        startCol,
        startRow,
        endCol: startCol + chartCols - 1,
        endRow:
          startRow +
          chartRows +
          table.getTableNameHeaderHeight() +
          table.getTableFieldsHeaderHeight(),
      };
    }

    const fieldsCount = table.getFieldsCount();

    if (isTableHorizontal) {
      const maxCol =
        (maxKnownRowIndex || 0) +
        startCol +
        totalSize +
        table.getTableFieldsHeaderHeight() -
        1;

      const endCol =
        maxCol > 0 ? maxCol : startCol + table.getTableFieldsHeaderHeight() - 1;
      const endRow =
        startRow + table.getTableNameHeaderHeight() + fieldsCount - 1;

      return {
        startCol,
        startRow,
        endRow,
        endCol,
      };
    }

    const maxRow =
      (maxKnownRowIndex || 0) +
      startRow +
      totalSize +
      table.getTableNameHeaderHeight() +
      table.getTableFieldsHeaderHeight() -
      1;

    const endRow =
      maxRow > 0
        ? maxRow
        : startRow +
          table.getTableNameHeaderHeight() +
          table.getTableFieldsHeaderHeight() -
          1;
    const endCol =
      fieldsCount > 0 ? startCol + table.getTableFieldsSizes() - 1 : startCol;

    return {
      startCol,
      startRow,
      endRow,
      endCol,
    };
  }

  /**
   * Gets list of tables with dimensions needed for grid actions (actual placement of saved tables)
   * @returns {GridTable[]} Actual list
   */
  public getGridTableStructure(): GridTable[] {
    const tablesData = this.viewGridData.getTablesData();
    const tableStructure: GridTable[] = [];

    for (const { table, diff } of tablesData) {
      tableStructure.push({
        tableName: table.tableName,
        ...this.getTableDimensions(
          table.tableName,
          table.getIsTableDirectionHorizontal()
        ),
        isTableNameHeaderHidden: table.getIsTableHeaderHidden(),
        isTableFieldsHeaderHidden: table.getIsTableFieldsHidden(),
        isTableHorizontal: table.getIsTableDirectionHorizontal(),
        totalSize: table.getTotalSize(),
        hasKeys: table.hasKeys(),
        isManual: table.isManual(),
        isNewAdded: !!diff?.table,
      });
    }

    return tableStructure;
  }

  /**
   * Converts tableData to table header (tableName, buttons with option menu, field headers names, total rows, meta information which grid uses)
   * @param tableData {TableData} Table data for specified table
   * @param zIndex {number} zIndex, needed in case of table/charts intersection
   * @returns {GridData} Grid Data
   */
  public buildGridTableHeader(tableData: TableData, zIndex: number): GridData {
    const { table, diff } = tableData;
    const { tableName } = table;
    const isTableHorizontal = table.getIsTableDirectionHorizontal();
    const isTableHeaderHidden = table.getIsTableHeaderHidden();
    const isFieldsHeaderHidden = table.getIsTableFieldsHidden();
    const totalSize = table.getTotalSize();

    const tableDimensions = this.getTableDimensions(
      tableName,
      isTableHorizontal
    );
    const { startCol, startRow, endCol } = tableDimensions;

    const data: GridData = {};

    // Add table header (first table row with tableName)
    if (!isTableHeaderHidden) {
      for (let col = startCol; col <= endCol; col++) {
        GridBuilder.setSafeDataCell(data, startRow, col, {
          table: {
            ...tableDimensions,
            tableName,
            isTableNameHeaderHidden: isTableHeaderHidden,
            isTableFieldsHeaderHidden: isFieldsHeaderHidden,
            hasKeys: table.hasKeys(),
            isTableHorizontal,
            totalSize,
            isManual: table.isManual(),
            isNewAdded: !!diff?.table,
          },
          value: tableName,
          row: startRow,
          col,
          startCol: tableDimensions.startCol,
          endCol: tableDimensions.endCol,
          zIndex: col === startCol ? zIndex + 1 : zIndex,
          isFieldHeader: false,
          isTableHeader: true,
        });
      }
    }

    // Add table fields headers (second table row with names of the fields)
    const fieldRow = startRow + table.getTableNameHeaderHeight();
    let directionIndex = isTableHorizontal ? fieldRow : startCol;

    for (const field of table.fields) {
      const columnName = field.key.fieldName;
      const fieldSize = !isTableHorizontal ? field.getSize() : 1;

      // dynamic fields are drawing separately
      if (columnName === dynamicFieldName) {
        continue;
      }

      const isNested = tableData.nestedColumnNames.has(columnName);
      const type = tableData.types[columnName];
      const isPeriodSeries = type === ColumnDataType.PERIOD_SERIES;
      const expression = field.expressionMetadata?.text || '';
      const viewportErrorMessage = tableData?.fieldErrors[columnName];
      const fieldErrorMessage = getFieldErrors(
        this.viewGridData.getParsingErrors(),
        this.viewGridData.getCompilationErrors(),
        viewportErrorMessage,
        tableName,
        columnName
      );

      const note = field.note?.text || '';
      const { sort, isFiltered, numericFilter, isFieldUsedInSort } =
        this.getApplyBlockGridParams(tableData, table, columnName);

      // This iterations needed for case when table is NOT horizontal and fields sizes not 1
      for (
        let innerFieldIndex = 0;
        innerFieldIndex < fieldSize;
        innerFieldIndex++
      ) {
        const directionOffset = directionIndex + innerFieldIndex;
        const cellCol = isTableHorizontal
          ? startCol
          : directionIndex + innerFieldIndex;
        const cellRow = isTableHorizontal ? directionOffset : fieldRow;
        const isMainFieldCell = innerFieldIndex === 0;
        const fieldStartCol = isTableHorizontal ? startCol : directionIndex;
        const fieldEndCol = isTableHorizontal
          ? startCol
          : directionIndex + fieldSize - 1;
        const targetColumnName = field.isDynamic
          ? dynamicFieldName
          : columnName;
        const totalFieldTypes =
          table.total?.getFieldTotalTypes(targetColumnName);

        const cellTable: GridTable = {
          ...tableDimensions,
          tableName,
          isTableNameHeaderHidden: isTableHeaderHidden,
          isTableFieldsHeaderHidden: isFieldsHeaderHidden,
          hasKeys: table.hasKeys(),
          isTableHorizontal,
          totalSize,
          isManual: table.isManual(),
          isNewAdded: !!diff?.table,
        };

        const cellField: GridField = {
          fieldName: columnName,
          note,
          expression,
          isPeriodSeries,
          isDynamic: field.isDynamic,
          isNested,
          isKey: field.isKey,
          isDim: field.isDim,
          hasError: !!fieldErrorMessage,
          errorMessage: fieldErrorMessage,
          isFiltered,
          numericFilter,
          totalFieldTypes,
          sort,
          isFieldUsedInSort,
          type,
          isChanged: !!diff?.fields.includes(columnName),
        };

        if (!isFieldsHeaderHidden) {
          GridBuilder.setSafeDataCell(data, cellRow, cellCol, {
            table: cellTable,
            value: isMainFieldCell ? columnName : '',
            field: cellField,
            row: cellRow,
            col: cellCol,
            startCol: fieldStartCol,
            endCol: fieldEndCol,
            zIndex,
            isFieldHeader: true,
            isTableHeader: false,
          });
        }

        // Add total rows
        for (let i = 1; i <= totalSize; i++) {
          const offset = isFieldsHeaderHidden ? 1 : 0;
          const col = isTableHorizontal ? cellCol + i - offset : cellCol;
          const row = isTableHorizontal ? cellRow : cellRow + i - offset;

          const targetColumnName = field.isDynamic
            ? dynamicFieldName
            : columnName;
          const totalExpression = table.total?.getFieldTotalByIndex(
            targetColumnName,
            i
          );
          const totalValue = tableData.total[targetColumnName]?.[i];
          const value = totalValue && totalExpression ? totalValue : '';
          const totalErrorMessage = getTotalErrors(
            this.viewGridData.getParsingErrors(),
            this.viewGridData.getCompilationErrors(),
            tableName,
            columnName,
            i
          );
          const isRightAligned = this.isValueRightAligned(
            cellField.isNested,
            cellField.type
          );

          GridBuilder.setSafeDataCell(data, row, col, {
            table: cellTable,
            field: cellField,
            totalExpression: totalExpression?.expression || '',
            totalIndex: i,
            totalType: totalExpression?.type,
            hasError: !!totalErrorMessage,
            errorMessage: totalErrorMessage,
            value,
            row,
            col,
            startCol: isTableHorizontal ? col : fieldStartCol,
            endCol: isTableHorizontal ? col : fieldEndCol,
            zIndex,
            isRightAligned,
            isFieldHeader: false,
            isTableHeader: false,
          });
        }
      }

      directionIndex += fieldSize;
    }

    return data;
  }

  /**
   * Converts tableData to table grid values (actual values, borders, styles, meta information, etc...)
   * @param tableData {TableData} Table data
   * @param zIndex {number} zIndex, needed in case of table/charts intersection
   * @returns {GridData} Grid data
   */
  public buildGridTableData(tableData: TableData, zIndex: number): GridData {
    const data: GridData = {};
    const { table, diff } = tableData;
    const { tableName } = table;
    const isTableHorizontal = table.getIsTableDirectionHorizontal();
    const tableDimensions = this.getTableDimensions(
      tableName,
      table.getIsTableDirectionHorizontal()
    );
    const { startCol: tableStartCol, startRow: tableStartRow } =
      tableDimensions;
    const totalSize = table.getTotalSize();
    const allDataMainDirectionStart = isTableHorizontal
      ? tableStartCol + table.getTableFieldsHeaderHeight() + totalSize
      : tableStartRow +
        table.getTableNameHeaderHeight() +
        table.getTableFieldsHeaderHeight() +
        totalSize;
    const allDataSecondaryDirectionStart = isTableHorizontal
      ? tableStartRow + table.getTableNameHeaderHeight()
      : tableStartCol;

    const buildChunk = (chunk: ColumnChunk, chunkIndex: number) => {
      let minDirectionIndex = Number.MAX_SAFE_INTEGER;
      let maxDirectionIndex = Number.MIN_SAFE_INTEGER;
      const cachedOverrideValues: Record<number, CachedOverrideRow> = {};

      // Add cells that have data in chunks
      for (const chunkKey of Object.keys(chunk)) {
        if (chunkKey === dynamicFieldName) {
          continue;
        }

        const field = table.fields.find((f) => f.key.fieldName === chunkKey);
        const fieldIndex = table.fields
          .filter((f) => f.key.fieldName !== dynamicFieldName)
          .findIndex((f) => f.key.fieldName === chunkKey);
        const dataFieldSecondaryDirectionStart = table.fields
          .filter((f) => f.key.fieldName !== dynamicFieldName)
          .map((field) => (isTableHorizontal ? 1 : field.getSize()))
          .slice(0, fieldIndex)
          .reduce((acc, curr) => acc + curr, allDataSecondaryDirectionStart);

        const chunkData = chunk[chunkKey];

        if (fieldIndex === -1 || !field) continue;

        const accChunkOffset = chunkIndex * chunkSize;

        for (
          let innerChunkDataIndex = 0;
          innerChunkDataIndex < chunkData.length;
          innerChunkDataIndex++
        ) {
          const resultedChunkDataIndex = innerChunkDataIndex + accChunkOffset;
          const dataDirectionIndex =
            innerChunkDataIndex + accChunkOffset + allDataMainDirectionStart;

          minDirectionIndex = Math.min(minDirectionIndex, dataDirectionIndex);
          maxDirectionIndex = Math.max(maxDirectionIndex, dataDirectionIndex);

          const tableDirectionData: Record<string, string> = {};

          Object.keys(chunk).forEach((fieldName) => {
            tableDirectionData[fieldName] =
              chunk[fieldName][innerChunkDataIndex];
          });

          const referenceTableName =
            tableData.columnReferenceTableNames[chunkKey];
          const type = tableData.types[chunkKey];
          const fieldName = chunkKey;
          const expression = field?.expressionMetadata?.text || '';
          const isPeriodSeries = type === ColumnDataType.PERIOD_SERIES;
          const isNested = tableData.nestedColumnNames.has(chunkKey);
          const isKey = field?.isKey;
          const isDim = field?.isDim;
          const isDynamic = field?.isDynamic;
          const note = field?.note?.text || '';
          const { sort, isFiltered, numericFilter, isFieldUsedInSort } =
            this.getApplyBlockGridParams(tableData, table, chunkKey);
          const fieldSize = isTableHorizontal ? 1 : field.getSize();
          const viewportErrorMessage = tableData?.fieldErrors[fieldName];
          const fieldErrorMessage = getFieldErrors(
            this.viewGridData.getParsingErrors(),
            this.viewGridData.getCompilationErrors(),
            viewportErrorMessage,
            tableName,
            fieldName
          );
          const isRightAligned = this.isValueRightAligned(isNested, type);

          let overrideValue: OverrideValue = null;
          let overrideIndex = null;

          const {
            overrideRow,
            overrideIndex: index,
            overrideSectionIndex,
          } = getOverrideRow(
            table,
            chunkKey,
            resultedChunkDataIndex,
            tableDirectionData,
            cachedOverrideValues
          );

          let isOverrideChanged = false;
          if (overrideRow) {
            overrideValue = overrideRow[fieldName];
            overrideIndex = index;
            isOverrideChanged =
              !!overrideValue &&
              !!diff?.overrides?.some(
                (diffOverrideRow) =>
                  overrideValue && diffOverrideRow[fieldName] === overrideValue
              );
          }

          const overrideErrorMessage =
            overrideSectionIndex !== null &&
            overrideSectionIndex !== undefined &&
            getOverrideErrors(
              this.viewGridData.getParsingErrors(),
              this.viewGridData.getCompilationErrors(),
              tableName,
              fieldName,
              overrideSectionIndex + 1
            );

          const dataIndex = resultedChunkDataIndex;

          for (
            let fieldInnerIndex = 0;
            fieldInnerIndex < fieldSize;
            fieldInnerIndex++
          ) {
            const col = isTableHorizontal
              ? dataDirectionIndex
              : dataFieldSecondaryDirectionStart + fieldInnerIndex;
            const row = isTableHorizontal
              ? dataFieldSecondaryDirectionStart
              : dataDirectionIndex;
            const value = chunkData[innerChunkDataIndex];
            const fieldStartCol = isTableHorizontal
              ? col
              : dataFieldSecondaryDirectionStart;
            const fieldEndCol = isTableHorizontal
              ? col
              : dataFieldSecondaryDirectionStart + fieldSize - 1;
            const finalValue =
              fieldStartCol === col ||
              [ColumnDataType.DOUBLE, ColumnDataType.INTEGER].includes(type)
                ? value
                : '';

            GridBuilder.setSafeDataCell(data, row, col, {
              table: {
                ...tableDimensions,
                tableName,
                isTableNameHeaderHidden: table.getIsTableHeaderHidden(),
                isTableFieldsHeaderHidden: table.getIsTableFieldsHidden(),
                hasKeys: table.hasKeys(),
                isTableHorizontal,
                totalSize,
                isManual: table.isManual(),
                isNewAdded: !!diff?.table,
              },

              field: {
                fieldName,
                note,
                expression,
                isPeriodSeries,
                isNested,
                isKey,
                isDim,
                isDynamic,
                isFiltered,
                numericFilter,
                type,
                referenceTableName,
                sort,
                isFieldUsedInSort,
                hasError: !!fieldErrorMessage,
                errorMessage: fieldErrorMessage,
                isChanged: !!diff?.fields.includes(fieldName),
              },
              isOverride: !!overrideValue,
              isOverrideChanged,
              overrideValue: overrideValue,
              overrideIndex: overrideIndex !== null ? overrideIndex : undefined,
              value: finalValue,
              isUrl: isValidUrl(finalValue),
              row,
              col,
              dataIndex,
              isRightAligned,
              startCol: fieldStartCol,
              endCol: fieldEndCol,
              zIndex,
              isFieldHeader: false,
              isTableHeader: false,
              hasError: !!overrideErrorMessage,
              errorMessage: overrideErrorMessage || undefined,
            });
          }
        }
      }

      // TODO: Possible redraw problem
      // Add cells that have no data in chunks
      const noDataFieldNames = table.fields.filter(
        (f) => !chunk[f.key.fieldName] && f.key.fieldName !== dynamicFieldName
      );

      for (const field of noDataFieldNames) {
        const dataName = field.key.fieldName;
        const noDynamicFields = table.fields.filter(
          (f) => f.key.fieldName !== dynamicFieldName
        );
        const fieldIndex = noDynamicFields.findIndex(
          (f) => f.key.fieldName === dataName
        );
        const dataFieldSecondaryDirectionStart = noDynamicFields
          .filter((f) => f.key.fieldName !== dynamicFieldName)
          .map((field) => (isTableHorizontal ? 1 : field.getSize()))
          .slice(0, fieldIndex)
          .reduce((acc, curr) => acc + curr, allDataSecondaryDirectionStart);
        const type = tableData.types[dataName];
        const { sort, isFiltered, numericFilter, isFieldUsedInSort } =
          this.getApplyBlockGridParams(tableData, table, dataName);
        const fieldSize = isTableHorizontal ? 1 : field.getSize();
        const viewportErrorMessage = tableData?.fieldErrors[dataName];
        const fieldErrorMessage = getFieldErrors(
          this.viewGridData.getParsingErrors(),
          this.viewGridData.getCompilationErrors(),
          viewportErrorMessage,
          tableName,
          dataName
        );

        const referenceTableName =
          tableData.columnReferenceTableNames[dataName];

        for (
          let directionIndex = minDirectionIndex;
          directionIndex <= maxDirectionIndex;
          directionIndex++
        ) {
          for (
            let fieldInnerIndex = 0;
            fieldInnerIndex < field.getSize();
            fieldInnerIndex++
          ) {
            const col = isTableHorizontal
              ? directionIndex
              : dataFieldSecondaryDirectionStart + fieldInnerIndex;
            const row = isTableHorizontal
              ? dataFieldSecondaryDirectionStart
              : directionIndex;
            const fieldStartCol = isTableHorizontal
              ? col
              : dataFieldSecondaryDirectionStart;
            const fieldEndCol = isTableHorizontal
              ? col
              : dataFieldSecondaryDirectionStart + fieldSize - 1;

            GridBuilder.setSafeDataCell(data, row, col, {
              table: {
                ...tableDimensions,
                tableName,
                isTableNameHeaderHidden: table.getIsTableHeaderHidden(),
                isTableFieldsHeaderHidden: table.getIsTableFieldsHidden(),
                hasKeys: table.hasKeys(),
                isTableHorizontal,
                totalSize,
                isManual: table.isManual(),
                isNewAdded: !!diff?.table,
              },
              isOverride: false,
              field: {
                fieldName: dataName,
                note: field?.note?.text || '',
                expression: field?.expressionMetadata?.text || '',
                isPeriodSeries: type === ColumnDataType.PERIOD_SERIES,
                isNested: tableData.nestedColumnNames.has(dataName),
                isKey: field?.isKey,
                isDim: field?.isDim,
                isDynamic: field?.isDynamic,
                hasError: !!fieldErrorMessage,
                errorMessage: fieldErrorMessage,
                isFiltered,
                numericFilter,
                isFieldUsedInSort,
                sort,
                type,
                referenceTableName,
                isChanged: !!diff?.fields.includes(dataName),
              },
              overrideIndex: undefined,
              value: undefined,
              row,
              col,
              dataIndex: directionIndex - minDirectionIndex,
              startCol: fieldStartCol,
              endCol: fieldEndCol,
              zIndex,
              isFieldHeader: false,
              isTableHeader: false,
            });
          }
        }
      }
    };

    const existingIndexes = [
      ...Object.keys(tableData.fallbackChunks),
      ...Object.keys(tableData.chunks),
    ];

    const indexes = Array.from(new Set(existingIndexes));

    for (const index of indexes) {
      const chunkIndex = +index;

      buildChunk(
        {
          ...tableData.chunks[chunkIndex],
          ...tableData.fallbackChunks[chunkIndex],
        },
        chunkIndex
      );
    }

    return data;
  }

  /**
   * Converts tableData in case if table -> line chart to chart header
   * @param tableData {TableData} Table data
   * @param zIndex {number} zIndex, needed in case of table/charts intersection
   * @returns {GridData} Grid data
   */
  public buildGridChartHeader(tableData: TableData, zIndex: number): GridData {
    const data: GridData = {};

    const { table, diff } = tableData;
    const { tableName } = table;

    const totalSize = table.getTotalSize();
    const tableDimensions = this.getTableDimensions(
      tableName,
      table.getIsTableDirectionHorizontal()
    );

    const { startCol, startRow, endCol } = tableDimensions;

    for (let col = startCol; col <= endCol; col++) {
      GridBuilder.setSafeDataCell(data, startRow, col, {
        table: {
          ...tableDimensions,
          chartType: 'line',
          tableName,
          isTableNameHeaderHidden: table.getIsTableHeaderHidden(),
          isTableFieldsHeaderHidden: table.getIsTableFieldsHidden(),
          isTableHorizontal: table.getIsTableDirectionHorizontal(),
          hasKeys: table.hasKeys(),
          totalSize,
          isManual: table.isManual(),
          isNewAdded: !!diff?.table,
        },
        value: tableName,
        row: startRow,
        col,
        startCol,
        endCol,
        zIndex,

        isFieldHeader: false,
        isTableHeader: true,
      });
    }

    return data;
  }

  /**
   * Build a data object with tables and charts to provide to the Grid (table - table header, field headers, values, errors), merging parts of tables
   * @returns {GridData} Data object which would be provided to the Grid
   */
  public toGridData(): GridData {
    let data: GridData = {};
    const tablesData = this.viewGridData.getTablesData();

    if (!tablesData.length) return data;

    let zIndex = defaultZIndex;

    for (const tableData of tablesData) {
      zIndex++;

      if (tableData.table.isLineChart()) {
        const gridChartHeader = this.buildGridChartHeader(tableData, zIndex);
        data = this.mergeGridData(data, gridChartHeader);
        continue;
      }

      const gridTableHeader = this.buildGridTableHeader(tableData, zIndex);
      const gridTableData = this.buildGridTableData(tableData, zIndex);

      data = this.mergeGridData(data, gridTableHeader, gridTableData);
    }

    return data;
  }

  /**
   * Get field sort order
   * @param tableData {TableData} Table data for specified table
   * @param table {ParsedTable} Parsed table object
   * @param columnName {string} Target column name
   * @returns Object with apply block params needed for Spreadsheet
   */
  private getApplyBlockGridParams(
    tableData: TableData,
    table: ParsedTable,
    columnName: string
  ): ApplyBlockGridParams {
    const sort = table.apply?.getFieldSortOrder(columnName) || null;
    const isFieldUsedInSort =
      table.apply?.isFieldUsedInSort(columnName) || false;
    const isFiltered = table.apply?.isFieldFiltered(columnName) || false;
    const isNumeric = isNumericType(tableData.types[columnName]);
    const numericFilter = isNumeric
      ? table.apply?.getFieldNumericFilterValue(columnName)
      : undefined;

    return {
      sort,
      isFiltered,
      numericFilter,
      isFieldUsedInSort,
    };
  }

  /**
   * Check if value should be right aligned
   * @param isNested
   * @param type
   * @returns {boolean} True if value should be right aligned
   */
  private isValueRightAligned(
    isNested: boolean,
    type?: ColumnDataType
  ): boolean {
    const numberTypes = [ColumnDataType.INTEGER, ColumnDataType.DOUBLE];

    return !!(type && numberTypes.includes(type) && !isNested);
  }

  /**
   * Method which merge several grid objects to one
   * @param data {GridData[]} Several grid objects
   * @returns {GridData} One grid object
   */
  protected mergeGridData(...data: GridData[]): GridData {
    const mergedData: GridData = {};

    for (let i = 0; i < data.length; i++) {
      const gridData = data[i];

      for (const row in gridData) {
        if (!(row in mergedData)) {
          mergedData[row] = gridData[row];
          continue;
        }

        for (const col in gridData[row]) {
          mergedData[row][col] = gridData[row][col];
        }
      }
    }

    return mergedData;
  }
}
