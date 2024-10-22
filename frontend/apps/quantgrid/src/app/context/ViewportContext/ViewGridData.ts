import { bufferTime, debounceTime, Observable, Subject } from 'rxjs';

import {
  ChartData,
  ColumnData,
  CompilationError,
  defaultChartCols,
  defaultChartRows,
  DiffData,
  escapeFieldName,
  escapeTableName,
  ParsingError,
  RuntimeError,
  Viewport,
} from '@frontend/common';
import {
  ChartsData,
  GridChart,
  GridData,
  GridTable,
  GridViewport,
  SelectedChartKey,
  TableData,
  TablesData,
} from '@frontend/common';
import { dynamicFieldName, ParsedTable } from '@frontend/parser';

import { getChartKeysByProject } from '../../services';
import { GridBuilder } from './GridBuilder';
import { ChartUpdate, TableDynamicFieldsLoadUpdate } from './types';
import { ViewportBuilder } from './ViewportBuilder';

export const chunkSize = 500;
export const defaultZIndex = 2;
export const dataUpdateDebounceTime = 50;
// TODO: Remove chart grouping after API Change related with multiply viewports override
export const chartUpdateBufferTime = 200;

/**
 * ViewGridData class for updating, managing and representing grid related data.
 * @property {TablesData} tablesData - The object consists of all table data.
 * @property {ChartsData} chartsData - The object consists of chart data points by key.
 * @property {ParsingError[]} parsingErrors - List of parsing errors.
 * @property {CompilationError[]} compilationErrors - List of compilation errors .
 * @property {Subject} _shouldUpdate$ - Observable which trigger action if grid should update data.
 * @property {Subject} _chartUpdate$ - Observable which trigger action if grid should update charts.
 * @property {Subject} _tableDynamicFieldsLoad$ - An Observable which triggers whenever any table should update dynamic fields.
 * @property {Subject} _tableDynamicFieldsRequest$ - An Observable which triggers additional calculation request for dynamic fields.
 * @property {GridBuilder} gridBuilder - Instance of GridBuilder class (build tablesData to necessary format for grid).
 * @property {ViewportBuilder} viewportBuilder - Instance of ViewportBuilder class (generating viewports request considering tablesData).
 */
export class ViewGridData {
  protected tablesData: TablesData;
  protected chartsData: ChartsData;

  protected parsingErrors: ParsingError[];
  protected compilationErrors: CompilationError[];

  protected _shouldUpdate$: Subject<boolean>;
  protected _tableDynamicFieldsLoad$: Subject<TableDynamicFieldsLoadUpdate>;
  protected _tableDynamicFieldsRequest$: Subject<void>;
  protected _chartUpdate$: Subject<ChartUpdate>;

  protected gridBuilder: GridBuilder;
  protected viewportBuilder: ViewportBuilder;

  protected tableOrder: string[] = [];

  constructor() {
    this.tablesData = {};
    this.chartsData = {};

    this._shouldUpdate$ = new Subject();
    this._chartUpdate$ = new Subject();
    this._tableDynamicFieldsLoad$ = new Subject();
    this._tableDynamicFieldsRequest$ = new Subject();

    this.parsingErrors = [];
    this.compilationErrors = [];

    this.gridBuilder = new GridBuilder(this);
    this.viewportBuilder = new ViewportBuilder(this);

    this.tableOrder = [];
  }

  /**
   * Observable which trigger action if grid should update data
   * @returns {Observable<boolean>} Actual observable
   */
  get shouldUpdate$(): Observable<boolean> {
    return this._shouldUpdate$.pipe(debounceTime(dataUpdateDebounceTime));
  }

  /**
   * Observable which trigger action if grid should update charts
   * @returns {Observable<ChartUpdate[]>} Actual observable
   */
  get chartUpdate(): Observable<ChartUpdate[]> {
    // TODO: Remove bufferTime -> check chartUpdateBufferTime description
    return this._chartUpdate$.pipe(bufferTime(chartUpdateBufferTime));
  }

  /**
   * Observable which trigger action if received all dynamic fields
   * @returns {Observable<boolean>} Actual observable
   */
  get tableDynamicFieldsLoad$(): Observable<TableDynamicFieldsLoadUpdate> {
    return this._tableDynamicFieldsLoad$.asObservable();
  }

  /**
   * Observable which trigger additional calculation request for the dynamic fields
   * @returns {Observable<boolean>} Actual observable
   */
  get tableDynamicFieldsRequest$(): Observable<void> {
    return this._tableDynamicFieldsRequest$.asObservable();
  }

  /**
   * Method which trigger grid data update, check this observable
   */
  protected triggerDataUpdate(): void {
    this._shouldUpdate$.next(true);
  }

  /**
   * Method which trigger grid charts update, check this observable
   */
  protected triggerChartsUpdate(chartUpdate: ChartUpdate): void {
    this._chartUpdate$.next(chartUpdate);
  }

  /**
   * Method which trigger grid table dynamic fields update
   */
  protected triggerTableDynamicFieldsLoaded(
    tableName: string,
    dynamicFields: string[]
  ): void {
    this._tableDynamicFieldsLoad$.next({ tableName, dynamicFields });
  }

  /**
   * Method which trigger grid table dynamic fields request
   */
  public triggerTableDynamicFieldsRequest(): void {
    this._tableDynamicFieldsRequest$.next();
  }

  /**
   * Set compilation errors and triggers grid data update
   * @param compilationErrors Application compilation errors
   */
  public setCompilationErrors(compilationErrors: CompilationError[]): void {
    this.compilationErrors = compilationErrors;

    this.clearCompilationErrorFieldChunks();
    this.triggerDataUpdate();
  }

  /**
   * Set parsing errors and triggers grid data update
   * @param parsingErrors Application parsing errors
   */
  public setParsingErrors(parsingErrors: ParsingError[]): void {
    this.parsingErrors = parsingErrors;

    this.triggerDataUpdate();
  }

  /**
   * Gets tableData for specified tableName
   * @param tableName specified tableName
   * @returns {TableData} table data (chunks, metadata, table info, etc..)
   */
  public getTableData(tableName: string): TableData {
    return this.tablesData[tableName];
  }

  /**
   * Gets chartsData for specified tableName (charts made by analogy with table)
   * @param tableName specified tableName
   * @returns {ChartData} chart data (points by specified column)
   */
  protected getChartData(tableName: string): ChartData {
    return this.chartsData[tableName];
  }

  /**
   * Gets list of all table data
   * Sorted by tableOrder, which is actual order of tables in dsl
   * @returns {TableData[]} Actual list
   */
  public getTablesData(): TableData[] {
    return this.tableOrder.map((tableName) => this.tablesData[tableName]);
  }

  /**
   * Gets list of all fields runtime errors
   * @returns {RuntimeError[]} Actual list
   */
  public getRuntimeErrors(): RuntimeError[] {
    const tablesData = this.getTablesData();
    const errors: RuntimeError[] = [];

    for (const tableData of tablesData) {
      const { fieldErrors, table } = tableData;
      const { tableName } = table;

      for (const [fieldName, message] of Object.entries(fieldErrors)) {
        errors.push({
          fieldKey: {
            table: tableName,
            field: fieldName,
          },
          message,
        });
      }
    }

    return errors;
  }

  /**
   * Gets list of tableNames that saved in tablesData
   * @returns {string[]} Actual list
   */
  protected getCachedTableNames(): string[] {
    return Object.keys(this.tablesData);
  }

  /**
   * Gets copy of all charts data
   * @returns {ChartData} Actual chart data
   */
  public getChartsData(): ChartsData {
    return { ...this.chartsData };
  }

  /**
   * Gets list of parsing errors
   * @returns {ParsingError[]} Actual list
   */
  public getParsingErrors(): ParsingError[] {
    return this.parsingErrors;
  }

  /**
   * Gets list of compilation errors
   * @returns {CompilationError[]} Actual list
   */
  public getCompilationErrors(): CompilationError[] {
    return this.compilationErrors;
  }

  /**
   * Gets list of dynamic fields names that saved in tablesData by specified tableName
   * @param tableName {string} specified tableName
   * @returns {string[] | undefined} list of dynamic fields names
   */
  public getTableDynamicFields(tableName: string): string[] | undefined {
    const tableData = this.getTableData(tableName);

    if (!tableData) {
      return;
    }

    return tableData.dynamicFields;
  }

  /**
   * Gets list of tables with dimensions needed for grid actions (actual placement of saved tables)
   * @returns {GridTable[]} Actual list
   */
  public getGridTableStructure(): GridTable[] {
    return this.gridBuilder.getGridTableStructure();
  }

  /**
   * Gets list of saved charts by projectName, checking stored keys, available keys for this chart
   * @returns {GridTable[]} Actual list
   */
  public getCharts(
    projectName: string,
    projectBucket: string,
    projectPath: string | null | undefined
  ): GridChart[] {
    // projectName, because we store keys in localStorage by project, see getChartKeysByProject
    const charts: GridChart[] = [];

    const tablesData = this.getTablesData();

    if (!tablesData.length) {
      return [];
    }

    for (const { table, chunks } of tablesData) {
      const { tableName } = table;

      if (!table.isLineChart()) continue;

      const [startRow, startCol] = table.getPlacement();

      const chartSize = table.getChartSize();
      const chartRows = chartSize[0] || defaultChartRows;
      const chartCols = chartSize[1] || defaultChartCols;

      const endCol = startCol + chartCols;
      const endRow = startRow + table.getTableNameHeaderHeight() + chartRows;

      const fieldKeys = table.fields
        .filter((f) => f.isKey)
        .map((f) => f.key.fieldName);

      const selectedKeys: Record<string, string> = {};
      const availableKeys: Record<string, string[]> = {};

      for (const chunkIndex of Object.keys(chunks)) {
        const chunk = chunks[+chunkIndex];

        for (const fieldKey in chunk) {
          if (!(fieldKey in availableKeys)) {
            availableKeys[fieldKey] = [];
          }

          availableKeys[fieldKey].push(...chunk[fieldKey]);
        }
      }

      for (const availableKey in availableKeys) {
        availableKeys[availableKey] = Array.from(
          new Set(availableKeys[availableKey])
        );
      }

      const projectKeys = getChartKeysByProject(
        projectName,
        projectBucket,
        projectPath
      );

      for (const fieldKey of fieldKeys) {
        if (projectKeys[tableName] && projectKeys[tableName][fieldKey]) {
          selectedKeys[fieldKey] = projectKeys[tableName][fieldKey];
        }
      }

      const chart: GridChart = {
        tableName,
        chartType: 'line',
        startCol,
        startRow: startRow + table.getTableNameHeaderHeight(),
        endCol,
        endRow,
        fieldKeys,
        selectedKeys,
        availableKeys,
      };

      charts.push(chart);
    }

    return charts;
  }

  /**
   * Removes table data for specified tableName
   * @param tableName {string} specified tableName
   */
  protected removeTableData(tableName: string): void {
    delete this.tablesData[tableName];

    this.tableOrder = this.tableOrder.filter((name) => name !== tableName);
  }

  /**
   * Removes chart data for specified tableName
   * @param tableName {string} specified tableName
   */
  protected removeChartData(tableName: string): void {
    delete this.chartsData[tableName];
  }

  /**
   * Creates empty tableData for new table, if it's line chart also creates a chart data for specified table
   * @param table {ParsedTable} specified table
   * @returns {TableData} reference to created table data
   */
  protected initTableData(
    table: ParsedTable,
    diff: DiffData | undefined
  ): TableData {
    const { tableName } = table;

    this.tablesData[tableName] = {
      table,
      chunks: {},
      fallbackChunks: {},

      total: {},

      maxKnownRowIndex: 0,

      nestedColumnNames: new Set(),
      isDynamicFieldsRequested: false,

      types: {},
      columnReferenceTableNames: {},

      diff,

      fieldErrors: {},
    };

    if (table.isLineChart()) {
      this.chartsData[tableName] = {};
    }

    return this.tablesData[tableName];
  }

  /**
   * After dsl change:
   * -> all tables should update meta information (list of the fields, placement, formulas, etc.)
   * -> update specified table
   * -> move chunks to fallbackChunks to show something until new data would come
   * -> should clear not existing fields for specified table in fallbackChunks
   * -> trigger data update
   * @param table {ParsedTable} specified table
   */
  public updateTableMeta(table: ParsedTable, diff?: DiffData): void {
    const { tableName } = table;

    const tableData = this.getTableData(tableName);

    if (!tableData) {
      this.initTableData(table, diff);

      return;
    }

    tableData.table = table;
    tableData.fallbackChunks = { ...tableData.chunks };
    tableData.chunks = {};
    tableData.maxKnownRowIndex = 0;
    tableData.isDynamicFieldsRequested = false;
    tableData.diff = diff;

    this.removeRedundantFields(tableName);
    this.triggerDataUpdate();
  }

  /**
   * After dsl change:
   * update table order and use it to loop through tablesData to maintain dsl table order in the grid
   * @param tableNames {string[]} tableNames which presented in actual dsl
   */
  public updateTableOrder(tableNames: string[]): void {
    this.tableOrder = tableNames;
  }

  /**
   * Method which remove data for not existing table, and removes not existing fields from existing table
   * @param currentTableNames tableNames which presented in actual dsl
   */
  public removeRedundantTables(currentTableNames: string[]) {
    const cachedTableNames = this.getCachedTableNames();

    const tableNamesToRemove = cachedTableNames.filter(
      (cachedTableName) => !currentTableNames.includes(cachedTableName)
    );

    for (const tableNameToRemove of tableNamesToRemove) {
      this.removeTableData(tableNameToRemove);
      this.removeChartData(tableNameToRemove);
    }

    this.triggerDataUpdate();

    this.triggerChartsUpdate({});
  }

  /**
   * Removes not existing fieldNames for specified tableName considering new table dsl
   * If it's line chart should remove not existing keys from chartData
   * @param tableName {string} specified tableName
   */
  public removeRedundantFields(tableName: string): void {
    const tableData = this.getTableData(tableName);

    if (!tableData) {
      throw new Error(
        "[ViewGridData] Table data doesn't exists for provided tableName"
      );
    }

    const { table, dynamicFields, fallbackChunks } = tableData;

    const currentFieldNames = table.fields.map((field) => field.key.fieldName);

    if (table.isLineChart()) {
      const chartData = this.getChartData(table.tableName);

      if (chartData) {
        const fieldNamesInCache = Object.keys(chartData);

        const fieldNamesToRemove = fieldNamesInCache.filter(
          (fieldName) => !currentFieldNames.includes(fieldName)
        );

        for (const fieldNameToRemove of fieldNamesToRemove) {
          delete chartData[fieldNameToRemove];
        }
      }
    }

    // old cache also should remove not existing fields
    for (const index in fallbackChunks) {
      const fieldNamesInCache = Object.keys(fallbackChunks[index]);

      const fieldNamesToRemove = fieldNamesInCache.filter(
        (fieldName) =>
          !currentFieldNames.includes(fieldName) &&
          !dynamicFields?.includes(fieldName)
      );

      for (const fieldNameToRemove of fieldNamesToRemove) {
        delete fallbackChunks[index][fieldNameToRemove];
      }
    }
  }

  /**
   * Removes chunks and fallback chunks if the field has compilation error
   */
  public clearCompilationErrorFieldChunks(): void {
    for (const error of this.compilationErrors) {
      const { fieldKey } = error;
      if (!fieldKey) continue;

      const table = this.tablesData[fieldKey.table];

      if (table?.chunks) {
        const { chunks } = table;

        Object.values(chunks).forEach((chunk) => {
          if (chunk[fieldKey.field]) {
            delete chunk[fieldKey.field];
          }
        });
      }

      if (table?.fallbackChunks) {
        const { fallbackChunks } = table;

        Object.values(fallbackChunks).forEach((chunk) => {
          if (chunk[fieldKey.field]) {
            delete chunk[fieldKey.field];
          }
        });
      }
    }
  }

  public clearRuntimeErrorFieldChunks(
    tableData: TableData,
    columnName: string
  ): void {
    if (tableData?.chunks) {
      const { chunks } = tableData;

      Object.values(chunks).forEach((chunk) => {
        if (chunk[columnName]) {
          delete chunk[columnName];
        }
      });
    }

    if (tableData?.fallbackChunks) {
      const { fallbackChunks } = tableData;

      Object.values(fallbackChunks).forEach((chunk) => {
        if (chunk[columnName]) {
          delete chunk[columnName];
        }
      });
    }
  }

  /**
   * Save total data for specified table, field and row (index starts from 1)
   * @param {ColumnData} columnData
   * @returns
   */
  public saveTotalData({ totalKey, data }: ColumnData): void {
    if (!totalKey || data.length === 0) {
      return;
    }

    const { table, number, field } = totalKey;

    const tableName = escapeTableName(table, true);
    const columnName = escapeFieldName(field, true);
    const tableData = this.getTableData(tableName);

    if (!tableData) {
      return;
    }

    if (!tableData.total) {
      tableData.total = {};
    }

    if (!tableData.total[columnName]) {
      tableData.total[columnName] = { [number]: data[0] };
    } else {
      tableData.total[columnName][number] = data[0];
    }

    this.triggerDataUpdate();
  }

  /**
   * If it's table column update -> clear fallback cache for this column -> save new column data using chunks algorithm -> trigger data update
   * If it's chart -> save chart data -> trigger chartUpdate
   * If it's update for dynamic field columns -> save new dynamic fields -> trigger dynamic fields and data update
   * @param {ColumnData} columnData
   * @returns
   */
  public saveNewColumnData({
    fieldKey,
    data,
    endRow,
    startRow,
    isNested,
    errorMessage,
    type,
    referenceTableName,
    periodSeries,
  }: ColumnData): void {
    if (!fieldKey) {
      return;
    }
    const tableName = escapeTableName(fieldKey.table, true);
    const columnName = escapeFieldName(fieldKey.field, true);
    const tableData = this.getTableData(tableName);

    if (!tableData) {
      return;
    }

    const isPeriodSeriesData = periodSeries.length > 0;

    if (isPeriodSeriesData) {
      const chartData = this.getChartData(tableName);

      if (!chartData) {
        return;
      }

      chartData[columnName] = periodSeries;

      this.triggerChartsUpdate({
        chartName: tableName,
        isChartDataUpdate: true,
      });

      this.triggerDataUpdate();

      return;
    }

    if (columnName === dynamicFieldName) {
      tableData.dynamicFields = [...data];
      tableData.isDynamicFieldsRequested = true;

      this.triggerTableDynamicFieldsLoaded(tableName, [...data]);

      return;
    }

    if (referenceTableName) {
      tableData.columnReferenceTableNames[columnName] = referenceTableName;
    }

    tableData.types[columnName] = type;

    if (errorMessage) {
      tableData.fieldErrors[columnName] = errorMessage;
      this.clearRuntimeErrorFieldChunks(tableData, columnName);
    }

    // if data comes for specific field, should remove cache for this column
    this.clearOldCachedDataForColumn(tableName, columnName);

    const { chunks, table } = tableData;

    // if we don't have actual chunks data, that mean we get new maxKnownRowIndex from actual data, not from old
    if (!Object.keys(chunks).length) {
      tableData.maxKnownRowIndex = 0;
    }

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

      if (!chunks[index]) {
        chunks[index] = {};
      }

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

    if (isNested) {
      tableData.nestedColumnNames.add(columnName);
    } else {
      tableData.nestedColumnNames.delete(columnName);
    }

    if (errorMessage) {
      tableData.fieldErrors[columnName] = errorMessage;
    } else {
      if (columnName in tableData.fieldErrors) {
        delete tableData.fieldErrors[columnName];
      }
    }

    if (columnName !== dynamicFieldName) {
      const maxTableRow =
        responseEndRow - rowsCount === 0
          ? responseEndRow
          : rowsCount > 0
          ? responseStartRow + rowsCount
          : tableData.maxKnownRowIndex;

      tableData.maxKnownRowIndex = Math.max(
        tableData.maxKnownRowIndex,
        maxTableRow
      );
    }

    // trigger data update after at least one column is changed, grid applies data update without latency
    this.triggerDataUpdate();

    if (table.isLineChart()) {
      this.triggerChartsUpdate({
        chartName: tableName,
        isKeyUpdate: true,
      });
    }
  }

  /**
   * Builds viewports to request considering current data
   * @param viewport {GridViewport} Current grid viewport
   * @returns {Viewport[]} built viewports
   */
  public buildViewportsToRequest(viewport: GridViewport): Viewport[] {
    return this.viewportBuilder.buildViewportRequest(viewport);
  }

  /**
   * Builds chart request considering current data and selected keys
   * @param selectedKeys {SelectedChartKey[]} Current selected chart keys
   * @returns {Viewport[]} built viewport
   */
  public buildChartViewportRequest(
    selectedKeys: SelectedChartKey[]
  ): Viewport[] {
    return this.viewportBuilder.buildChartViewportRequest(selectedKeys);
  }

  /**
   * After scrolling keys in chart -> should trigger new keys request viewport by specified tableName, fieldName (chart)
   * @param tableName specified tableName
   * @param fieldName specified fieldName
   * @returns {Viewport[]} built viewports
   */
  public buildGetMoreChartKeysViewportRequest(
    tableName: string,
    fieldName: string
  ): Viewport[] {
    return this.viewportBuilder.buildGetMoreChartKeysViewportRequest(
      tableName,
      fieldName
    );
  }

  /**
   * Get list of filter values for the field
   * @param tableName {string} Target table name
   * @param columnName {string} Target column name
   * @returns list of filter values with a selected flag for each value
   */
  public getFieldFilterList(
    tableName: string,
    columnName: string
  ): { value: string; isSelected: boolean }[] {
    if (!this.tablesData || !this.tablesData[tableName]) return [];

    const tableData = this.tablesData[tableName];
    const viewportValues = this.getAllColumnValues(tableData, columnName);

    const filterValues =
      tableData.table.apply?.getFieldTextFilterValues(columnName) || [];

    const listFilter = viewportValues.map((value) => ({
      value,
      isSelected: filterValues.includes(value.toString()),
    }));

    const selectedCount = listFilter.filter((item) => item.isSelected).length;

    if (selectedCount === 0) {
      listFilter.forEach((item) => {
        item.isSelected = true;
      });
    }

    return listFilter;
  }

  /**
   * Method which gets all column values from tableData
   * @param tableData {TableData} Table data
   * @param columnName {string} Column name
   * @returns {string[]} List of column values
   */
  private getAllColumnValues(
    tableData: TableData,
    columnName: string
  ): string[] {
    const { chunks } = tableData;
    const columnValues = new Set<string>();

    for (const chunk of Object.keys(chunks)) {
      if (chunks[parseInt(chunk)][columnName]) {
        chunks[parseInt(chunk)][columnName].forEach((value) =>
          columnValues.add(value)
        );
      }
    }

    return Array.from(columnValues);
  }

  /**
   * Builds grid data (using specified format) considering current tableData, chartsData
   * @returns {GridData} Grid data which grid takes in
   */
  public toGridData(): GridData {
    return this.gridBuilder.toGridData();
  }

  /**
   * Clear fallback data for specified fieldName in table with specified tableName
   * @param tableName specified tableName
   * @param fieldName specified fieldName
   */
  public clearOldCachedDataForColumn(
    tableName: string,
    fieldName: string
  ): void {
    const tableData = this.getTableData(tableName);

    if (!tableData) {
      return;
    }

    const { fallbackChunks } = tableData;

    for (const chunkIndex in fallbackChunks) {
      const fallbackChunk = fallbackChunks[chunkIndex];

      delete fallbackChunk[fieldName];
    }
  }

  /**
   * Clears cached viewport
   */
  public clearCachedViewports() {
    this.viewportBuilder.clear();
  }

  /**
   * Clear all saved data
   */
  public clear() {
    this.compilationErrors = [];
    this.parsingErrors = [];

    this.tablesData = {};
    this.chartsData = {};
    this.tableOrder = [];
    this.clearCachedViewports();
  }
}
