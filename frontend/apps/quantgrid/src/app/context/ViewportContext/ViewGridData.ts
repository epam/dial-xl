import { bufferTime, debounceTime, filter, Observable, Subject } from 'rxjs';

import { ViewportEdges } from '@frontend/canvas-spreadsheet';
import {
  ChartData,
  chartRowNumberSelector,
  ChartsData,
  ChartTableWithoutSelectors,
  ChartType,
  ColumnData,
  ColumnDataType,
  CompilationError,
  defaultChartCols,
  defaultChartRows,
  DiffData,
  GridChart,
  GridChartSection,
  GridData,
  GridListFilter,
  GridTable,
  GridViewport,
  histogramChartSeriesSelector,
  isNumericType,
  ParsingError,
  RuntimeError,
  SelectedChartKey,
  TableData,
  TablesData,
  Viewport,
  VirtualTableData,
  VirtualTablesData,
} from '@frontend/common';
import {
  dynamicFieldName,
  escapeFieldName,
  escapeTableName,
  ParsedField,
  ParsedTable,
  unescapeValue,
} from '@frontend/parser';

import { hasValuesFieldName, histogramDefaultBucketCount } from '../../utils';
import { GridBuilder } from './GridBuilder';
import {
  ChartUpdate,
  FiltersUpdate,
  TableDynamicFieldsLoadUpdate,
} from './types';
import { ViewportBuilder } from './ViewportBuilder';
import { ViewportChartBuilder } from './ViewportChartBuilder';

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
 * @property {ViewportChartBuilder} viewportChartBuilder - Instance of ViewportChartBuilder class (generating viewports request considering charts).
 */
export class ViewGridData {
  protected tablesData: TablesData;
  protected chartsData: ChartsData;
  protected filtersData: Record<string, Record<string, string[]>>;

  protected parsingErrors: ParsingError[];
  protected compilationErrors: CompilationError[];

  protected _shouldUpdate$: Subject<boolean>;
  protected _tableDynamicFieldsLoad$: Subject<TableDynamicFieldsLoadUpdate>;
  protected _tableDynamicFieldsRequest$: Subject<void>;
  protected _chartUpdate$: Subject<ChartUpdate>;
  protected _filtersUpdate$: Subject<FiltersUpdate>;

  protected gridBuilder: GridBuilder;
  protected viewportBuilder: ViewportBuilder;
  protected viewportChartBuilder: ViewportChartBuilder;

  protected tableOrder: string[];

  protected virtualTablesData: VirtualTablesData;
  protected chartKeyVirtualTableMapping: Map<string, Map<string, string>>;
  protected chartDataVirtualTableMapping: Map<string, string>;
  protected filterDataVirtualTableMapping: Map<string, Map<string, string>>;

  constructor() {
    this.tablesData = {};
    this.chartsData = {};
    this.filtersData = {};

    this._shouldUpdate$ = new Subject();
    this._chartUpdate$ = new Subject();
    this._filtersUpdate$ = new Subject();
    this._tableDynamicFieldsLoad$ = new Subject();
    this._tableDynamicFieldsRequest$ = new Subject();

    this.parsingErrors = [];
    this.compilationErrors = [];

    this.gridBuilder = new GridBuilder(this);
    this.viewportBuilder = new ViewportBuilder(this);
    this.viewportChartBuilder = new ViewportChartBuilder(this);

    this.tableOrder = [];
    this.chartKeyVirtualTableMapping = new Map();
    this.chartDataVirtualTableMapping = new Map();
    this.filterDataVirtualTableMapping = new Map();
    this.virtualTablesData = {};
  }

  /**
   * Observable which trigger action if grid should update data
   * @returns {Observable<boolean>} Actual observable
   */
  get shouldUpdate$(): Observable<boolean> {
    return this._shouldUpdate$.pipe(debounceTime(dataUpdateDebounceTime));
  }

  /**
   * Observable which trigger action if grid should update data
   * @returns {Observable<boolean>} Actual observable
   */
  get filtersUpdate$(): Observable<FiltersUpdate> {
    return this._filtersUpdate$.asObservable();
  }

  /**
   * Observable which trigger action if grid should update charts
   * @returns {Observable<ChartUpdate[]>} Actual observable
   */
  get chartUpdate(): Observable<ChartUpdate[]> {
    // TODO: Remove bufferTime -> check chartUpdateBufferTime description
    return this._chartUpdate$.pipe(
      bufferTime(chartUpdateBufferTime),
      filter((events) => events.length > 0)
    );
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
   * Method which trigger grid filters update, check this observable
   */
  protected triggerFiltersUpdate(update: FiltersUpdate): void {
    this._filtersUpdate$.next(update);
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
   * Gets filters data
   * @returns {Record<string, Record<string, string[]>>} filters data map
   */
  public getFiltersData(): Record<string, Record<string, string[]>> {
    return this.filtersData;
  }

  /**
   * Clear all data for specified chart
   * @param tableName specified tableName
   */
  public clearChartData(tableName: string): void {
    this.chartsData[tableName] = {};
  }

  /**
   * Clear all filters data
   */
  public clearFiltersData(): void {
    this.filtersData = {};
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
   * Update existing Grid Charts with new keys for specified key
   * @param charts - list of Grid Charts
   * @param virtualTableName - virtual table name with chart keys
   */
  public updateChartWithNewKeys(
    charts: GridChart[],
    virtualTableName: string
  ): GridChart[] {
    const targetChart = charts.find((c) => c.tableName === virtualTableName);
    const virtualKeyTable = this.virtualTablesData[virtualTableName];

    if (!targetChart || !virtualKeyTable) return charts;

    const { availableKeys } = targetChart;
    this.updateAvailableKeys(availableKeys, virtualKeyTable);

    return charts;
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
  public getCharts(): GridChart[] {
    const tablesData = this.getTablesData();

    if (!tablesData.length) return [];

    const charts: GridChart[] = [];

    for (const { table, types, totalRows } of tablesData) {
      const chartType = table.getChartType();

      if (!chartType) continue;

      const chartSize = table.getChartSize();
      const [startRow, startCol] = table.getPlacement();
      const tableNameHeaderHeight = table.getTableNameHeaderHeight();
      const showLegend = !table.getIsTableFieldsHidden();
      const isEmpty = table.fields.length === 0;

      const chartRows = chartSize[0] || defaultChartRows;
      const chartCols = chartSize[1] || defaultChartCols;
      const endCol = startCol + chartCols;
      const chartStartRow = startRow + tableNameHeaderHeight;
      const endRow = chartStartRow + chartRows;
      const tableStartCol = startCol;
      const tableStartRow = startRow;

      const {
        selectorFieldNames,
        selectedKeys,
        availableKeys,
        keysWithNoDataPoint,
        customSeriesColors,
      } = this.processChartSelectors(table);

      this.addRowNumberSelectors(
        table,
        chartType,
        totalRows,
        selectorFieldNames,
        selectedKeys,
        availableKeys
      );

      const histogramBucketsCount = this.processHistogram(
        table,
        chartType,
        types,
        totalRows,
        selectorFieldNames,
        selectedKeys,
        availableKeys
      );

      const chartSections = this.getChartSections(
        table,
        types,
        histogramBucketsCount,
        chartType
      );

      charts.push({
        tableName: table.tableName,
        chartType,
        startCol,
        endCol,
        endRow,
        tableStartCol,
        tableStartRow,
        startRow: chartStartRow,
        selectedKeys,
        availableKeys,
        keysWithNoDataPoint,
        customSeriesColors,
        selectorFieldNames,
        chartSections,
        showLegend,
        isEmpty,
      });
    }

    return charts;
  }

  /**
   * Get saved values from table selector
   */
  private processChartSelectors(table: ParsedTable): {
    selectorFieldNames: string[];
    selectedKeys: Record<string, string | string[]>;
    availableKeys: Record<string, string[]>;
    keysWithNoDataPoint: Record<string, string[]>;
    customSeriesColors: Record<string, string>;
  } {
    const selectorFieldNames: string[] = [];
    const selectedKeys: Record<string, string | string[]> = {};
    const availableKeys: Record<string, string[]> = {};
    const keysWithNoDataPoint: Record<string, string[]> = {};
    const customSeriesColors: Record<string, string> = {};

    for (const field of table.fields) {
      const fieldName = field.key.fieldName;
      const seriesColor = field.getSeriesColor();

      if (seriesColor) {
        customSeriesColors[fieldName] = seriesColor;
      }

      if (field.isChartSelector()) {
        this.populateSelectorData(
          table.tableName,
          fieldName,
          availableKeys,
          keysWithNoDataPoint
        );
        selectorFieldNames.push(fieldName);

        const selectorValue = field.getChartSelectorValue();
        if (selectorValue !== undefined) {
          selectedKeys[fieldName] =
            typeof selectorValue === 'number'
              ? selectorValue.toString()
              : unescapeValue(selectorValue);
        }
      }
    }

    return {
      selectorFieldNames,
      selectedKeys,
      availableKeys,
      keysWithNoDataPoint,
      customSeriesColors,
    };
  }

  /**
   * Update available/not available keys for a chart
   */
  private populateSelectorData(
    tableName: string,
    fieldName: string,
    availableKeys: Record<string, string[]>,
    keysWithNoDataPoint: Record<string, string[]>
  ): void {
    const virtualKeyTableName = this.chartKeyVirtualTableMapping
      .get(tableName)
      ?.get(fieldName);

    if (!virtualKeyTableName) return;

    const virtualKeyTable = this.virtualTablesData[virtualKeyTableName];
    if (!virtualKeyTable) return;

    this.updateAvailableKeys(availableKeys, virtualKeyTable);
    this.updateKeysWithNoDataPoint(
      keysWithNoDataPoint,
      virtualKeyTable,
      fieldName
    );
  }

  /**
   * Special case for bar/pie charts: add specific selector, available keys
   */
  private addRowNumberSelectors(
    table: ParsedTable,
    chartType: ChartType,
    totalRows: number,
    selectorFieldNames: string[],
    selectedKeys: Record<string, string | string[]>,
    availableKeys: Record<string, string[]>
  ): void {
    const isRowNumberSelector =
      chartType === ChartType.BAR || chartType === ChartType.PIE;

    const isHistogram = chartType === ChartType.HISTOGRAM;
    const tableSelectorValues = table.getChartSelectorValues();

    if (isRowNumberSelector && !isHistogram) {
      selectorFieldNames.push(chartRowNumberSelector);

      if (table.isChartSelector() || isRowNumberSelector) {
        if (tableSelectorValues?.length === 1) {
          selectedKeys[chartRowNumberSelector] =
            tableSelectorValues[0].toString();
        } else if (tableSelectorValues && tableSelectorValues.length > 0) {
          selectedKeys[chartRowNumberSelector] = tableSelectorValues;
        }

        // Special case: empty rowNumber selector, but table has 1 row -> show chart with 1 row
        if (!selectedKeys[chartRowNumberSelector] && totalRows === 1) {
          selectedKeys[chartRowNumberSelector] = '1';
        }
      }

      availableKeys[chartRowNumberSelector] = Array.from(
        { length: totalRows },
        (_, i) => (i + 1).toString()
      );
    }
  }

  /**
   * Special case for histogram chart: add specific selector, available keys and buckets count
   */
  private processHistogram(
    table: ParsedTable,
    chartType: ChartType,
    types: Record<string, ColumnDataType>,
    totalRows: number,
    selectorFieldNames: string[],
    selectedKeys: Record<string, string | string[]>,
    availableKeys: Record<string, string[]>
  ): number | null {
    if (chartType !== ChartType.HISTOGRAM) return null;

    selectorFieldNames.push(histogramChartSeriesSelector);
    const tableSelectorValues = table.getChartSelectorValues();

    if (tableSelectorValues?.length) {
      selectedKeys[histogramChartSeriesSelector] = tableSelectorValues[0];
    }

    const visualizationValues = table.getVisualisationDecoratorValues();
    const histogramBucketsCount = Math.min(
      histogramDefaultBucketCount,
      visualizationValues?.length === 2
        ? parseInt(visualizationValues[1])
        : totalRows
    );

    availableKeys[histogramChartSeriesSelector] = table.fields
      .filter(
        (f) => !f.isChartSelector() && isNumericType(types[f.key.fieldName])
      )
      .map((f) => f.key.fieldName);

    return histogramBucketsCount;
  }

  /**
   * Build chart sections to display chart data by sections
   */
  private getChartSections(
    table: ParsedTable,
    types: Record<string, ColumnDataType>,
    histogramBucketsCount: number | null,
    chartType: ChartType
  ): GridChartSection[] {
    const separatedFields = table.getChartSeparatedSections();

    return separatedFields.map((fields) => ({
      valueFieldNames: fields
        .filter((f) => this.isChartValueField(f, types))
        .map((f) => f.key.fieldName),
      xAxisFieldName:
        fields.find((f) => f.isChartXAxis())?.key.fieldName || null,
      dotSizeFieldName:
        fields.find((f) => f.isChartDotSize())?.key.fieldName || null,
      dotColorFieldName:
        fields.find((f) => f.isChartDotColor())?.key.fieldName || null,
      histogramBucketsCount,
      histogramDataTableName:
        chartType === ChartType.HISTOGRAM
          ? this.chartDataVirtualTableMapping.get(table.tableName) ?? null
          : null,
    }));
  }

  /**
   * Check for chart if the field is used as value field (no specific chart decorators and is numeric type)
   */
  private isChartValueField(
    field: ParsedField,
    types: Record<string, ColumnDataType>
  ): boolean {
    return (
      !field.isChartXAxis() &&
      !field.isChartSelector() &&
      !field.isChartDotSize() &&
      !field.isChartDotColor() &&
      isNumericType(types[field.key.fieldName])
    );
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

    if (this.chartKeyVirtualTableMapping.has(tableName)) {
      const fieldMap = this.chartKeyVirtualTableMapping.get(tableName);

      if (fieldMap) {
        for (const virtualTableName of fieldMap.values()) {
          delete this.virtualTablesData[virtualTableName];
        }
      }
      this.chartKeyVirtualTableMapping.delete(tableName);
    }

    if (this.chartDataVirtualTableMapping.has(tableName)) {
      if (this.virtualTablesData[tableName]) {
        delete this.virtualTablesData[tableName];
      }
      this.chartDataVirtualTableMapping.delete(tableName);
    }
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

      totalRows: 0,

      nestedColumnNames: new Set(),
      isDynamicFieldsRequested: false,

      types: {},
      columnReferenceTableNames: {},

      diff,

      fieldErrors: {},
    };

    if (table.isChart()) {
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
    tableData.isDynamicFieldsRequested = false;
    tableData.diff = diff;

    const isChart = table.isChart();

    // Note: Do not clear totalRows for charts, not to cause toolbar hide and show
    // totalRows will be updated after receiving new column data
    if (!isChart) {
      tableData.totalRows = 0;
    }

    if (isChart && !this.chartsData[tableName]) {
      this.chartsData[tableName] = {};
    }

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

    if (table.isChart()) {
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
   * Save columnData from the virtual table to chartsData.
   * Currently used for histogram chart.
   */
  private saveNewColumnForVirtualDataTable(columnData: ColumnData) {
    const { fieldKey, data } = columnData;
    if (!fieldKey?.table) return;

    const tableName = escapeTableName(fieldKey.table, true);

    const isValidVirtualTable = Array.from(
      this.chartDataVirtualTableMapping.values()
    ).some((t) => t === tableName);

    if (!isValidVirtualTable) return;

    const chartData = this.getChartData(tableName);

    if (!chartData) {
      this.chartsData[tableName] = {};
    }

    this.chartsData[tableName][fieldKey.field] = data;
  }

  /**
   * Save columnData from the virtual table to virtualTablesData.
   * Currently used for getting data for the chart selectors.
   */
  private saveNewColumnDataForFiltersTable({
    fieldKey,
    data,
    endRow,
    startRow,
  }: ColumnData) {
    if (!fieldKey?.table) return;

    const tableName = escapeTableName(fieldKey.table, true);
    const columnName = escapeFieldName(fieldKey.field, true);

    const sourceTableName = Array.from(
      this.filterDataVirtualTableMapping.entries()
    ).find(([_, fieldMap]) =>
      Array.from(fieldMap.values()).includes(tableName)
    )?.[0];
    const rowsCount = data.length;
    const responseEndRow = parseInt(endRow);
    const responseStartRow =
      startRow === undefined || !startRow
        ? responseEndRow - rowsCount
        : parseInt(startRow);

    if (!sourceTableName) return;

    const prevData = this.filtersData[sourceTableName]?.[columnName] ?? [];

    if (!this.filtersData[sourceTableName]) {
      this.filtersData[sourceTableName] = {};
    }

    this.filtersData[sourceTableName][columnName] = prevData
      .slice(0, responseStartRow)
      .concat(data);

    this.triggerFiltersUpdate({
      sourceTableName,
      virtualTableName: tableName,
    });
  }

  /**
   * Save columnData from the virtual table to virtualTablesData.
   * Currently used for getting data for the chart selectors.
   */
  private saveNewColumnDataForVirtualKeyTable({
    fieldKey,
    data,
    endRow,
    startRow,
    totalRows,
  }: ColumnData) {
    if (!fieldKey?.table) return;

    const tableName = escapeTableName(fieldKey.table, true);
    const columnName = escapeFieldName(fieldKey.field, true);

    const hasVirtualTableName = Array.from(
      this.chartKeyVirtualTableMapping.values()
    ).some((fieldMap) => Array.from(fieldMap.values()).includes(tableName));

    if (!hasVirtualTableName) return;

    if (!this.virtualTablesData[tableName]) {
      this.virtualTablesData[tableName] = {
        chunks: {},
        totalRows: +totalRows,
      };
    }

    const { chunks } = this.virtualTablesData[tableName];

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

    this.virtualTablesData[tableName].totalRows = +totalRows;

    this.triggerChartsUpdate({
      chartName: this.getChartTableNameByVirtualKeyTableName(tableName),
      virtualTableName: tableName,
      isKeyUpdate: true,
    });
  }

  /**
   * If it's table column update -> clear fallback cache for this column -> save new column data using chunks algorithm -> trigger data update
   * If it's chart -> save chart data -> trigger chartUpdate
   * If it's update for dynamic field columns -> save new dynamic fields -> trigger dynamic fields and data update
   * @param {ColumnData} columnData
   * @returns
   */
  public saveNewColumnData(columnData: ColumnData): void {
    const {
      fieldKey,
      data,
      endRow,
      startRow,
      totalRows,
      isNested,
      errorMessage,
      type,
      referenceTableName,
      periodSeries,
    } = columnData;

    if (!fieldKey) {
      return;
    }
    const tableName = escapeTableName(fieldKey.table, true);
    const columnName = escapeFieldName(fieldKey.field, true);
    const tableData = this.getTableData(tableName);

    if (!tableData) {
      if (
        Array.from(this.chartDataVirtualTableMapping.values()).some(
          (t) => t === tableName
        )
      ) {
        this.saveNewColumnForVirtualDataTable(columnData);

        return;
      }

      if (
        Array.from(this.filterDataVirtualTableMapping.values()).some(
          (val) => val.get(columnName) === escapeTableName(tableName)
        )
      ) {
        this.saveNewColumnDataForFiltersTable(columnData);

        return;
      }

      this.saveNewColumnDataForVirtualKeyTable(columnData);

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

    if (errorMessage) {
      tableData.fieldErrors[columnName] = errorMessage;
      this.clearRuntimeErrorFieldChunks(tableData, columnName);
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

    // if data comes for specific field, should remove cache for this column
    this.clearOldCachedDataForColumn(tableName, columnName);

    const { chunks, table } = tableData;

    const rowsCount = data.length;

    // Note: calculation request with startRow = 0, endRow = 0 was made only for receiving Chart types etc.
    // No need to update chartsData with empty data.
    const isChartMetadataResponse =
      parseInt(startRow) === 0 && parseInt(endRow) === 0;
    const responseEndRow = parseInt(endRow);
    const responseStartRow =
      startRow === undefined || !startRow
        ? responseEndRow - rowsCount
        : parseInt(startRow);
    const chartType = table.getChartType();
    const isRegularChart = chartType && chartType !== ChartType.PERIOD_SERIES;
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

      if (isRegularChart && !isChartMetadataResponse) {
        const chartData = this.getChartData(tableName);
        const isNumeric = isNumericType(type);
        const tableField = table.fields.find(
          (f) => f.key.fieldName === columnName
        );
        const isDotColor = tableField?.isChartDotColor();
        const isDotSize = tableField?.isChartDotSize();
        const isXAxis = tableField?.isChartXAxis();

        if (chartData && (isNumeric || isDotColor || isDotSize || isXAxis)) {
          chartData[columnName] = chunk[columnName];
        }
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

    tableData.totalRows = +totalRows;

    // trigger data update after at least one column is changed, grid applies data update without latency
    this.triggerDataUpdate();

    if (table.isChart()) {
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
   * @param tablesWithoutSelectors {ChartTableWithoutSelectors[]} List of tables without selectors
   * @returns {Viewport[]} built viewport
   */
  public buildChartViewportRequest(
    selectedKeys: SelectedChartKey[],
    tablesWithoutSelectors: ChartTableWithoutSelectors[]
  ): Viewport[] {
    return this.viewportChartBuilder.buildChartViewportRequest(
      selectedKeys,
      tablesWithoutSelectors
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
  ): GridListFilter[] {
    if (!this.tablesData || !this.tablesData[tableName]) return [];

    const tableData = this.tablesData[tableName];
    const viewportValues = this.filtersData[tableName]?.[columnName] ?? [];
    const viewportFilteredValues =
      this.filtersData[tableName]?.[columnName + '_filtered'] ?? [];

    const selectedFilterValues =
      tableData.table.apply?.getFieldListFilterValues(columnName) || [];

    const listFilter: GridListFilter[] = viewportValues.map((value, index) => {
      const stringifiedValue = value.toString();
      const isPresentedInFiltered = viewportFilteredValues[index] === 'TRUE';

      return {
        value,
        isSelected: selectedFilterValues.includes(stringifiedValue),
        isFiltered: !isPresentedInFiltered,
      };
    });

    const selectedCount = listFilter.filter((item) => item.isSelected).length;

    if (selectedCount === 0) {
      listFilter.forEach((item) => {
        item.isSelected = true;
      });
    }

    return listFilter;
  }

  /**
   * Builds grid data (using specified format) considering current tableData, chartsData
   * @returns {GridData} Grid data which grid takes in
   */
  public toGridData(viewport: ViewportEdges): GridData {
    return this.gridBuilder.toGridData(viewport);
  }

  /**
   * Add virtual table name (using to get keys for chart) for specified chart table
   * @param tableName - chart table name
   * @param fieldName - chart field name
   * @param virtualTableName - virtual table name
   */
  public addChartKeyVirtualTable(
    tableName: string,
    fieldName: string,
    virtualTableName: string
  ) {
    if (!this.chartKeyVirtualTableMapping.has(tableName)) {
      this.chartKeyVirtualTableMapping.set(tableName, new Map());
    }

    this.chartKeyVirtualTableMapping
      .get(tableName)
      ?.set(fieldName, virtualTableName);
  }

  /**
   * Add virtual table name (using to get keys for chart) for specified chart table
   * @param tableName - chart table name
   * @param fieldName - chart field name
   * @param virtualTableName - virtual table name
   */
  public addFilterKeyVirtualTable(
    tableName: string,
    fieldName: string,
    virtualTableName: string
  ) {
    if (!this.filterDataVirtualTableMapping.has(tableName)) {
      this.filterDataVirtualTableMapping.set(tableName, new Map());
    }

    this.filterDataVirtualTableMapping
      .get(tableName)
      ?.set(fieldName, virtualTableName);
  }

  /**
   * Get saved virtual table name for specified chart table and field
   */
  public getVirtualTableName(
    tableName: string,
    fieldName: string
  ): string | undefined {
    if (!this.chartKeyVirtualTableMapping.has(tableName)) {
      return;
    }

    return this.chartKeyVirtualTableMapping.get(tableName)?.get(fieldName);
  }

  /**
   * Get original chart table name by virtual table name
   */
  private getChartTableNameByVirtualKeyTableName(
    tableName: string
  ): string | undefined {
    for (const [
      outerKey,
      fieldMap,
    ] of this.chartKeyVirtualTableMapping.entries()) {
      for (const [, vTableName] of fieldMap.entries()) {
        if (vTableName === tableName) {
          return outerKey;
        }
      }
    }

    return;
  }

  /**
   * Add chart virtual table data for specified virtualTableName
   * @param virtualTableName
   * @param virtualTableData
   */
  public addChartVirtualTableData(
    virtualTableName: string,
    virtualTableData: string
  ) {
    this.chartDataVirtualTableMapping.set(virtualTableName, virtualTableData);
  }

  /**
   * Get virtual table name (using to get data for chart) for specified chart table
   * @param virtualTableName
   */
  public getChartVirtualTableDataName(virtualTableName: string): string | null {
    return this.chartDataVirtualTableMapping.get(virtualTableName) || null;
  }

  /**
   * Get virtual table data rows count for specified virtualTableName
   * @param virtualTableName - virtual table name for chart keys
   */
  public getVirtualChartDataMaxRows(virtualTableName: string): number {
    const escapedTableName = escapeTableName(virtualTableName);
    if (!this.virtualTablesData[escapedTableName]) return 0;

    return this.virtualTablesData[escapedTableName].totalRows || 0;
  }

  /**
   * Update charts keys with latest data
   * @param availableKeys - Record in the Grid Charts with chart keys
   * @param virtualKeyTable - Virtual table with keys data
   * @private
   */
  private updateAvailableKeys(
    availableKeys: Record<string, (string | number)[]>,
    virtualKeyTable: VirtualTableData
  ): void {
    const { chunks } = virtualKeyTable;

    for (const chunkIndex of Object.keys(chunks)) {
      const chunk = chunks[+chunkIndex];

      for (const fieldKey in chunk) {
        if (!(fieldKey in availableKeys)) {
          availableKeys[fieldKey] = [];
        }

        availableKeys[fieldKey].push(...chunk[fieldKey]);
      }
    }
  }

  private updateKeysWithNoDataPoint(
    keysWithNoDataPoint: Record<string, string[]>,
    virtualKeyTable: VirtualTableData,
    fieldName: string
  ): void {
    const { chunks } = virtualKeyTable;

    for (const chunkIndex of Object.keys(chunks)) {
      const chunk = chunks[+chunkIndex];

      for (const fieldKey in chunk) {
        if (fieldKey === hasValuesFieldName) continue;

        if (!(fieldKey in keysWithNoDataPoint)) {
          keysWithNoDataPoint[fieldKey] = [];
        }

        for (let i = 0; i < chunk[hasValuesFieldName].length; i++) {
          if (chunk[hasValuesFieldName][i] === 'FALSE' && chunk[fieldName][i]) {
            keysWithNoDataPoint[fieldKey].push(chunk[fieldName][i]);
          }
        }
      }
    }
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
    this.viewportChartBuilder.clear();
  }

  /**
   * Clear all saved data
   */
  public clear() {
    this.compilationErrors = [];
    this.parsingErrors = [];

    this.tablesData = {};
    this.chartsData = {};
    this.filtersData = {};
    this.tableOrder = [];
    this.chartKeyVirtualTableMapping = new Map();
    this.chartDataVirtualTableMapping = new Map();
    this.filterDataVirtualTableMapping = new Map();
    this.virtualTablesData = {};
    this.clearCachedViewports();
  }
}
