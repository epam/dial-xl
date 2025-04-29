import {
  chartRowNumberSelector,
  histogramChartSeriesSelector,
  isNumericType,
  SelectedChartKey,
  Viewport,
} from '@frontend/common';
import {
  applyKeyword,
  collectTableNames,
  dimKeyword,
  escapeTableName,
  filterKeyword,
  newLine,
  ParsedField,
  ParsedSheets,
  ParsedTable,
  sortKeyword,
  tableKeyword,
  unescapeTableName,
} from '@frontend/parser';

import { ViewGridData } from '../context';
import { createUniqueName, uniqueId } from '../services';

export const hasValuesFieldName = 'has_values';
export const hasValuesFullFieldName = `[${hasValuesFieldName}]`;
export const histogramDefaultBucketCount = 10;
const bucketNumberFieldName = 'BucketNumber';
const lowerBoundFieldName = 'LowerBound';
const upperBoundFieldName = 'UpperBound';
const rowCountFieldName = 'RowCount';

/**
 * Create a virtual table to get chart data specifically for histogram chart
 */
export function createVirtualHistogramChartTableDSL(
  table: ParsedTable,
  virtualTableName: string,
  fieldName: string,
  bucketCount: number
): string {
  const { tableName } = table;
  const tableDSL = `${newLine}${newLine}${tableKeyword} ${escapeTableName(
    virtualTableName
  )}`;
  const dimFieldDSL = `${dimKeyword} [${bucketNumberFieldName}] = RANGE(${bucketCount})`;
  const lowerBoundFieldDSL = `[${lowerBoundFieldName}] = ${tableName}[${fieldName}].MIN() + ([${bucketNumberFieldName}] - 1) * (${tableName}[${fieldName}].MAX() - ${tableName}[${fieldName}].MIN()) / ${bucketCount}`;
  const upperBoundFieldDSL = `[${upperBoundFieldName}] = ${tableName}[${fieldName}].MIN() + [${bucketNumberFieldName}] * (${tableName}[${fieldName}].MAX() - ${tableName}[${fieldName}].MIN()) / ${bucketCount}`;
  const rowCountFieldDSL = `[${rowCountFieldName}] = ${tableName}.FILTER( $[${fieldName}] >= [${lowerBoundFieldName}] AND ([${bucketNumberFieldName}] = ${bucketCount} OR $[${fieldName}] < [${upperBoundFieldName}])).COUNT()`;

  return `${tableDSL}${newLine}${dimFieldDSL}${newLine}${lowerBoundFieldDSL}${newLine}${upperBoundFieldDSL}${newLine}${rowCountFieldDSL}${newLine}`;
}

/**
 * Create a virtual table to get data for one chart selector
 */
export function createVirtualChartTableDSL(
  table: ParsedTable,
  field: ParsedField,
  virtualTableName: string
): string {
  const { tableName, fullFieldName } = field.key;
  const tableDSL = `${newLine}${newLine}${tableKeyword} ${escapeTableName(
    virtualTableName
  )}`;
  const virtualKeyFieldDSL = `${dimKeyword} ${fullFieldName} = ${tableName}${fullFieldName}.UNIQUE()`;
  const otherFilters = getHasValuesFieldFilters(table, field.key.fieldName);
  const virtualHasValuesFieldDSL = `${hasValuesFullFieldName} = ${tableName}.FILTER(${otherFilters}${fullFieldName} = $${fullFieldName}).COUNT() > 0`;
  const sortSection = `${applyKeyword}${newLine}${sortKeyword} -${hasValuesFullFieldName},${fullFieldName}`;

  return `${tableDSL}${newLine}${virtualKeyFieldDSL}${newLine}${virtualHasValuesFieldDSL}${newLine}${sortSection}${newLine}`;
}

/**
 * Helper function to get field selectors from a single table and build a filter expression from them
 */
function getHasValuesFieldFilters(
  table: ParsedTable,
  currentFieldName: string
): string {
  const selectors = table.fields
    .filter(
      (f: ParsedField) =>
        f.key.fieldName !== currentFieldName &&
        f.isChartSelector() &&
        f.getChartSelectorValue() !== undefined
    )
    .map(
      (f: ParsedField) =>
        `$${f.key.fullFieldName} = "${f.getChartSelectorValue()}"`
    )
    .join(' AND ');

  return selectors ? `${selectors} AND ` : '';
}

/**
 * Check if the field is a custom chart selector, like row number or histogram series
 * Needed to filter out these fields when applying chart selectors etc.
 */
export function isCustomChartSelector(fieldName: string): boolean {
  return [chartRowNumberSelector, histogramChartSeriesSelector].includes(
    fieldName
  );
}

/**
 * To get chart data correctly, we need to apply chart selectors to the existing chart table
 */
export function applySelectorFiltersToChartTables(
  sheetContent: string,
  table: ParsedTable,
  tableSelectedKeys: SelectedChartKey[],
  viewGridData: ViewGridData
): string {
  const { dslPlacement, tableName, apply, dslOverridePlacement } = table;

  if (!dslPlacement) return sheetContent;

  const keysFilterDSL = buildKeysFilterDSL(
    tableName,
    tableSelectedKeys,
    viewGridData
  );

  if (!keysFilterDSL) return sheetContent;

  // Case 1: No apply section yet
  if (!apply) {
    const insertPosition = dslOverridePlacement
      ? dslOverridePlacement.startOffset
      : dslPlacement.stopOffset;

    return insertApplyAndFilter(sheetContent, insertPosition, keysFilterDSL);
  }

  const { dslPlacement: applyPlacement, filter } = apply;

  // Case 2: Apply exists but no filter
  if (apply && applyPlacement && !filter) {
    return appendFilterToApply(
      sheetContent,
      applyPlacement.stopOffset,
      keysFilterDSL
    );
  }

  // Case 3: Apply exists with a filter
  if (filter && filter.filterExpressionDSLPlacement) {
    const { start, end } = filter.filterExpressionDSLPlacement;

    return extendExistingFilter(sheetContent, start, end, keysFilterDSL);
  }

  return sheetContent;
}

/**
 * Builds a DSL filter expression from selected chart keys
 */
function buildKeysFilterDSL(
  tableName: string,
  tableSelectedKeys: SelectedChartKey[],
  viewGridData: ViewGridData
): string {
  const filteredKeys = tableSelectedKeys.filter(
    (item) => !isCustomChartSelector(item.fieldName)
  );

  if (filteredKeys.length === 0) {
    return '';
  }

  return filteredKeys
    .map((item) => {
      const tableData = viewGridData.getTableData(tableName);
      const columnType = tableData.types[item.fieldName];
      const formattedKey = isNumericType(columnType)
        ? item.key
        : `"${item.key}"`;

      return `[${item.fieldName}] = ${formattedKey}`;
    })
    .join(' AND ');
}

/**
 * Inserts a new apply and filter section at the specified start index in the sheet content.
 */
function insertApplyAndFilter(
  sheetContent: string,
  startIndex: number,
  keysFilterDSL: string
): string {
  return (
    sheetContent.slice(0, startIndex) +
    `${newLine}${applyKeyword}${newLine}${filterKeyword} ${keysFilterDSL}${newLine}` +
    sheetContent.slice(startIndex)
  );
}

/**
 * Appends a filter to an existing apply section that has no filter.
 */
function appendFilterToApply(
  sheetContent: string,
  endIndex: number,
  keysFilterDSL: string
): string {
  return (
    sheetContent.slice(0, endIndex) +
    `${newLine}${filterKeyword} ${keysFilterDSL}${newLine}` +
    sheetContent.slice(endIndex)
  );
}

/**
 * Adds the filter to an existing filter expression by wrapping the old one and adding AND condition.
 */
function extendExistingFilter(
  sheetContent: string,
  start: number,
  end: number,
  keysFilterDSL: string
): string {
  const existingFilters = sheetContent.slice(start, end);

  return (
    sheetContent.slice(0, start) +
    ` (${existingFilters}) AND ${keysFilterDSL}${newLine}` +
    sheetContent.slice(end)
  );
}

/**
 * Build a request for histogram chart data
 * Histogram chart requires a virtual table to calculate the histogram buckets
 */
export function buildHistogramChartRequest(
  chartViewportRequest: Viewport[],
  table: ParsedTable,
  viewGridData: ViewGridData,
  parsedSheets: ParsedSheets
): string {
  const { tableName } = table;
  const tableSelectorValues = table.getChartSelectorValues();

  if (!tableSelectorValues || !tableSelectorValues[0]) return '';

  const unescapedTableName = unescapeTableName(tableName);
  const virtualTableName = getOrCreateVirtualTableName(
    tableName,
    unescapedTableName
  );

  viewGridData.addChartVirtualTableData(
    tableName,
    escapeTableName(virtualTableName)
  );

  const visualisationValues = table.getVisualisationDecoratorValues();

  const histogramBucketsCount = Math.min(
    histogramDefaultBucketCount,
    visualisationValues?.length === 2
      ? parseInt(visualisationValues[1])
      : histogramDefaultBucketCount
  );

  const virtualTableDSL = createVirtualHistogramChartTableDSL(
    table,
    virtualTableName,
    tableSelectorValues[0],
    histogramBucketsCount
  );

  for (const fieldName of [
    bucketNumberFieldName,
    lowerBoundFieldName,
    upperBoundFieldName,
    rowCountFieldName,
  ]) {
    chartViewportRequest.push({
      start_row: 0,
      end_row: histogramBucketsCount,
      fieldKey: {
        field: fieldName,
        table: virtualTableName,
      },
    });
  }

  function getOrCreateVirtualTableName(
    tableName: string,
    unescapedTableName: string
  ): string {
    const virtualTableName =
      viewGridData.getChartVirtualTableDataName(tableName);

    if (virtualTableName) return unescapeTableName(virtualTableName);

    return createUniqueName(
      `${unescapedTableName}_histogram_data_${uniqueId()}`,
      collectTableNames(parsedSheets)
    );
  }

  return virtualTableDSL;
}
