import { ViewportEdges } from '@frontend/canvas-spreadsheet';
import {
  ColumnChunk,
  ColumnDataType,
  defaultChartCols,
  defaultChartRows,
  GridCell,
  GridData,
  GridField,
  GridFieldCache,
  GridTable,
  isNumericType,
  isTextType,
  isValidUrl,
  TableData,
} from '@frontend/common';
import {
  CachedOverrideRow,
  defaultRowKey,
  dynamicFieldName,
  OverrideValue,
  ParsedTable,
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
   * @param isTableHorizontal {boolean} is table horizontal
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

    const { table, totalRows } = tableData;

    const [startRow, startCol] = table.getPlacement();
    const totalSize = table.getTotalSize();

    if (table.isChart()) {
      const chartSize = table.getChartSize();
      const chartRows = chartSize[0] || defaultChartRows;
      const chartCols = chartSize[1] || defaultChartCols;

      return {
        startCol,
        startRow,
        endCol: startCol + chartCols - 1,
        endRow: startRow + chartRows - 1 + table.getTableNameHeaderHeight(),
      };
    }

    const fieldsCount = table.getFieldsCount();

    if (isTableHorizontal) {
      const maxCol =
        (totalRows || 0) +
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
      (totalRows || 0) +
      startRow +
      totalSize +
      table.getTableNameHeaderHeight() +
      table.getTableFieldsHeaderHeight() -
      1;

    const endRow =
      maxRow > 0
        ? maxRow
        : Math.max(
            startRow,
            startRow +
              table.getTableNameHeaderHeight() +
              table.getTableFieldsHeaderHeight() -
              1
          );
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
        isChanged: !!diff?.table || !!diff?.deletedFields.length,
        note: table.note?.text || '',
        fieldNames: table.getFieldNames(),
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
    const { table, diff, totalRows } = tableData;
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
    const parsingErrors = this.viewGridData.getParsingErrors();
    const compilationErrors = this.viewGridData.getCompilationErrors();
    const isTableChanged = !!diff?.table || !!diff?.deletedFields.length;
    const hasKeys = table.hasKeys();
    const isManual = table.isManual();
    const tableHeaderHeight = table.getTableNameHeaderHeight();

    const data: GridData = {};

    const commonTableProps = {
      ...tableDimensions,
      tableName,
      isManual,
      hasKeys,
      totalSize,
      isTableHorizontal,
      isTableNameHeaderHidden: isTableHeaderHidden,
      isTableFieldsHeaderHidden: isFieldsHeaderHidden,
      isChanged: isTableChanged,
      note: table.note?.text || '',
      fieldNames: table.getFieldNames(),
    };

    // Add table header (first table row with tableName)
    if (!isTableHeaderHidden) {
      const tableHeaderCell = {
        table: commonTableProps,
        value: tableName,
        row: startRow,
        startCol,
        endCol,
        zIndex,
        isFieldHeader: false,
        isTableHeader: true,
      };

      for (let col = startCol; col <= endCol; col++) {
        GridBuilder.setSafeDataCell(data, startRow, col, {
          ...tableHeaderCell,
          col,
          zIndex: col === startCol ? zIndex + 1 : zIndex,
        });
      }
    }

    // Add table fields headers (second table row with names of the fields)
    const fieldRow = startRow + tableHeaderHeight;
    const fieldErrorsCache = new Map<string, string | undefined>();
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
      const note = field.note?.text || '';
      const isFieldChanged = !!diff?.changedFields.includes(columnName);
      const { sort, isFiltered, filter, isFieldUsedInSort } =
        this.getApplyBlockGridParams(tableData, table, columnName);
      const isRightAligned = this.isValueRightAligned(isNested, type);
      const viewportErrorMessage = tableData?.fieldErrors[columnName];
      let fieldErrorMessage = fieldErrorsCache.get(columnName);

      if (!fieldErrorMessage) {
        fieldErrorMessage = getFieldErrors(
          parsingErrors,
          compilationErrors,
          viewportErrorMessage,
          tableName,
          columnName
        );
        fieldErrorsCache.set(columnName, fieldErrorMessage);
      }

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
        filter,
        sort,
        isFieldUsedInSort,
        type,
        isChanged: isFieldChanged,
        isIndex: field.isIndex(),
        isDescription: field.isDescription(),
        descriptionField: field.getDescriptionFieldName(),
        dataLength: totalRows,
      };

      // These iterations needed for case when table is NOT horizontal and fields sizes not 1
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
        cellField.totalFieldTypes =
          table.total?.getFieldTotalTypes(targetColumnName);

        if (!isFieldsHeaderHidden) {
          GridBuilder.setSafeDataCell(data, cellRow, cellCol, {
            table: commonTableProps,
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
            parsingErrors,
            compilationErrors,
            tableName,
            columnName,
            i
          );

          GridBuilder.setSafeDataCell(data, row, col, {
            table: commonTableProps,
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
   * @param viewport {ViewportEdges} Viewport edges
   * @returns {GridData} Grid data
   */
  public buildGridTableData(
    tableData: TableData,
    zIndex: number,
    viewport: ViewportEdges
  ): GridData {
    const data: GridData = {};
    const { table, diff, totalRows } = tableData;
    const { tableName, note } = table;
    const isTableHorizontal = table.getIsTableDirectionHorizontal();
    const isTableHeaderHidden = table.getIsTableHeaderHidden();
    const isFieldsHeaderHidden = table.getIsTableFieldsHidden();
    const hasKeys = table.hasKeys();
    const isManual = table.isManual();
    const tableNameHeaderHeight = table.getTableNameHeaderHeight();
    const tableFieldsHeaderHeight = table.getTableFieldsHeaderHeight();
    const totalSize = table.getTotalSize();
    const isTableChanged = !!diff?.table || !!diff?.deletedFields.length;
    const parsingErrors = this.viewGridData.getParsingErrors();
    const compilationErrors = this.viewGridData.getCompilationErrors();
    const tableDimensions = this.getTableDimensions(
      tableName,
      isTableHorizontal
    );
    const {
      startCol: tableStartCol,
      endCol: tableEndCol,
      startRow: tableStartRow,
    } = tableDimensions;
    const allDataMainDirectionStart = isTableHorizontal
      ? tableStartCol + tableFieldsHeaderHeight + totalSize
      : tableStartRow +
        tableNameHeaderHeight +
        tableFieldsHeaderHeight +
        totalSize;
    const allDataSecondaryDirectionStart = isTableHorizontal
      ? tableStartRow + tableNameHeaderHeight
      : tableStartCol;

    const commonTableProps: GridTable = {
      ...tableDimensions,
      tableName,
      isManual,
      hasKeys,
      totalSize,
      isTableHorizontal,
      isTableNameHeaderHidden: isTableHeaderHidden,
      isTableFieldsHeaderHidden: isFieldsHeaderHidden,
      isChanged: isTableChanged,
      note: note?.text || '',
      fieldNames: table.getFieldNames(),
    };

    const tableFields = table.fields.filter(
      (f) => f.key.fieldName !== dynamicFieldName
    );
    const fieldMap = new Map<string, GridFieldCache>();

    let accumulatedSecondaryDirectionStart = allDataSecondaryDirectionStart;
    const fieldErrorsCache = new Map<string, string | undefined>();
    const applyBlockParamsCache = new Map<string, ApplyBlockGridParams>();

    tableFields.forEach((field, index) => {
      const fieldName = field.key.fieldName;
      const fieldSize = isTableHorizontal ? 1 : field.getSize();
      const type = tableData.types[fieldName];
      const isNested = tableData.nestedColumnNames.has(fieldName);
      const isRightAligned = this.isValueRightAligned(isNested, type);

      let fieldErrorMessage = fieldErrorsCache.get(fieldName);
      if (!fieldErrorMessage) {
        const viewportErrorMessage = tableData?.fieldErrors[fieldName];
        fieldErrorMessage = getFieldErrors(
          parsingErrors,
          compilationErrors,
          viewportErrorMessage,
          tableName,
          fieldName
        );
        fieldErrorsCache.set(fieldName, fieldErrorMessage);
      }

      let applyBlockParams = applyBlockParamsCache.get(fieldName);
      if (!applyBlockParams) {
        applyBlockParams = this.getApplyBlockGridParams(
          tableData,
          table,
          fieldName
        );
        applyBlockParamsCache.set(fieldName, applyBlockParams);
      }

      const cellField: GridField = {
        fieldName,
        isNested,
        type,
        note: field.note?.text || '',
        expression: field.expressionMetadata?.text || '',
        isPeriodSeries: type === ColumnDataType.PERIOD_SERIES,
        isKey: field.isKey,
        isDim: field.isDim,
        isDynamic: field.isDynamic,
        hasError: !!fieldErrorMessage,
        errorMessage: fieldErrorMessage,
        isFiltered: applyBlockParams.isFiltered,
        filter: applyBlockParams.filter,
        isFieldUsedInSort: applyBlockParams.isFieldUsedInSort,
        sort: applyBlockParams.sort,
        referenceTableName: tableData.columnReferenceTableNames[fieldName],
        isChanged: !!diff?.changedFields.includes(fieldName),
        isIndex: field.isIndex(),
        isDescription: field.isDescription(),
        descriptionField: field.getDescriptionFieldName(),
        dataLength: totalRows,
      };

      fieldMap.set(fieldName, {
        field,
        fieldIndex: index,
        dataFieldSecondaryDirectionStart: accumulatedSecondaryDirectionStart,
        fieldSize,
        isRightAligned,
        cellField,
      });

      accumulatedSecondaryDirectionStart += fieldSize;
    });

    const buildChunk = (chunk: ColumnChunk, chunkIndex: number) => {
      let minDirectionIndex = Number.MAX_SAFE_INTEGER;
      let maxDirectionIndex = Number.MIN_SAFE_INTEGER;
      const cachedOverrideValues: Record<number, CachedOverrideRow> = {};

      // Add cells that have data in chunks
      for (const chunkKey of Object.keys(chunk)) {
        if (chunkKey === dynamicFieldName) {
          continue;
        }

        const fieldData = fieldMap.get(chunkKey);
        if (!fieldData) continue;

        const {
          dataFieldSecondaryDirectionStart,
          fieldSize,
          isRightAligned,
          cellField,
        } = fieldData;

        const { fieldName } = cellField;
        const chunkData = chunk[chunkKey];
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

          let overrideValue: OverrideValue = null;
          let overrideIndex = null;
          let isOverrideChanged = false;

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

          if (overrideRow) {
            overrideValue = overrideRow[fieldName];
            overrideIndex = index;

            const fieldKeys = table
              .getKeys()
              .map((field) => field.key.fieldName);
            const keys = fieldKeys.length
              ? fieldKeys
              : !table.isManual()
              ? [defaultRowKey]
              : [];
            const overrideMatch = keys.length
              ? diff?.overrides?.find(
                  (diffOverrideRow) =>
                    overrideValue &&
                    keys.every(
                      (key) => diffOverrideRow[key] === overrideRow[key]
                    ) &&
                    diffOverrideRow[fieldName] === overrideValue
                )
              : index
              ? diff?.overrides?.[index]
              : undefined;
            isOverrideChanged = !!overrideValue && !!overrideMatch?.[fieldName];
          }

          const overrideErrorMessage =
            overrideSectionIndex !== null &&
            overrideSectionIndex !== undefined &&
            getOverrideErrors(
              parsingErrors,
              compilationErrors,
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

            GridBuilder.setSafeDataCell(data, row, col, {
              table: commonTableProps,
              field: cellField,
              isOverride: !!overrideValue,
              isOverrideChanged,
              overrideValue,
              overrideIndex: overrideIndex !== null ? overrideIndex : undefined,
              value: value,
              isUrl: isValidUrl(value),
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
      const noDataFieldNames = tableFields
        .map((f) => f.key.fieldName)
        .filter((fieldName) => !chunk[fieldName]);

      for (const fieldName of noDataFieldNames) {
        const fieldData = fieldMap.get(fieldName);

        if (!fieldData) continue;

        const { dataFieldSecondaryDirectionStart, fieldSize, cellField } =
          fieldData;

        for (
          let directionIndex = minDirectionIndex;
          directionIndex <= maxDirectionIndex;
          directionIndex++
        ) {
          for (
            let fieldInnerIndex = 0;
            fieldInnerIndex < fieldSize;
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
              table: commonTableProps,
              field: cellField,
              isOverride: false,
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

    const tableColInsideViewport =
      viewport.startCol <= tableEndCol && viewport.endCol >= tableStartCol;

    if (!tableColInsideViewport) {
      return data;
    }

    const startViewportChunk = Math.floor(
      (viewport.startRow - tableStartRow) / chunkSize
    );
    const endViewportChunk = Math.floor(
      (viewport.endRow - tableStartRow) / chunkSize
    );

    const indexes = Array.from(new Set(existingIndexes)).filter((index) => {
      const chunkIndex = +index;

      return chunkIndex >= startViewportChunk && chunkIndex <= endViewportChunk;
    });

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

    const { startCol, startRow, endCol, endRow } = tableDimensions;
    const chartType = table.getChartType() || undefined;
    const fieldNames = table.getFieldNames();

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        GridBuilder.setSafeDataCell(data, row, col, {
          table: {
            ...tableDimensions,
            chartType,
            tableName,
            isTableNameHeaderHidden: table.getIsTableHeaderHidden(),
            isTableFieldsHeaderHidden: table.getIsTableFieldsHidden(),
            isTableHorizontal: table.getIsTableDirectionHorizontal(),
            hasKeys: table.hasKeys(),
            totalSize,
            isManual: table.isManual(),
            isChanged: !!diff?.table || !!diff?.deletedFields.length,
            note: table.note?.text || '',
            fieldNames,
          },
          value:
            row === startRow && !table.getIsTableHeaderHidden()
              ? tableName
              : '',
          row,
          col,
          startCol,
          endCol,
          zIndex,

          isFieldHeader: false,
          isTableHeader: row === startRow,
        });
      }
    }

    return data;
  }

  /**
   * Build a data object with tables and charts to provide to the Grid (table - table header, field headers, values, errors), merging parts of tables
   * @returns {GridData} Data object which would be provided to the Grid
   */
  public toGridData(viewport: ViewportEdges): GridData {
    let data: GridData = {};
    const tablesData = this.viewGridData.getTablesData();

    if (!tablesData.length) return data;

    let zIndex = defaultZIndex;

    for (const tableData of tablesData) {
      zIndex++;

      if (tableData.table.isChart()) {
        const gridChartHeader = this.buildGridChartHeader(tableData, zIndex);
        data = this.mergeGridData(data, gridChartHeader);
        continue;
      }

      const gridTableHeader = this.buildGridTableHeader(tableData, zIndex);
      const gridTableData = this.buildGridTableData(
        tableData,
        zIndex,
        viewport
      );

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
    if (!table.apply) {
      return {
        sort: null,
        isFiltered: false,
        filter: undefined,
        isFieldUsedInSort: false,
      };
    }

    const sort = table.apply.getFieldSortOrder(columnName) || null;
    const isFieldUsedInSort =
      table.apply.isFieldUsedInSort(columnName) || false;
    const isFiltered = table.apply.isFieldFiltered(columnName) || false;
    const isNumeric = isNumericType(tableData.types[columnName]);
    const isText = isTextType(tableData.types[columnName]);

    const filter =
      isNumeric || isText
        ? table.apply.getFieldConditionFilter(columnName)
        : undefined;

    return {
      sort,
      isFiltered,
      filter,
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
