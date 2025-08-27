import {
  chartRowNumberSelector,
  histogramChartSeriesSelector,
  isNumericType,
  SelectedChartKey,
  Viewport,
} from '@frontend/common';
import {
  Apply,
  ApplyFilter,
  ApplySort,
  collectTableNames,
  escapeTableName,
  ParsedField,
  ParsedSheets,
  ParsedTable,
  Sheet,
  Table,
  unescapeTableName,
} from '@frontend/parser';

import { ViewGridData } from '../context';
import { createUniqueName, uniqueId } from '../services';

export const hasValuesFieldName = 'has_values';
export const histogramDefaultBucketCount = 10;
const bucketNumberFieldName = 'BucketNumber';
const lowerBoundFieldName = 'LowerBound';
const upperBoundFieldName = 'UpperBound';
const rowCountFieldName = 'RowCount';

/**
 * Create a virtual table to get chart data specifically for the histogram chart
 */
export function createVirtualHistogramChartTableDSL(
  table: ParsedTable,
  virtualTableName: string,
  fieldName: string,
  bucketCount: number
): string {
  const { tableName } = table;
  try {
    const table = new Table(virtualTableName);

    const bucketNumberFormula = `RANGE(${bucketCount})`;
    const lowerBoundFormula = `${tableName}[${fieldName}].MIN() + ([${bucketNumberFieldName}] - 1) * (${tableName}[${fieldName}].MAX() - ${tableName}[${fieldName}].MIN()) / ${bucketCount}`;
    const upperBoundFormula = `${tableName}[${fieldName}].MIN() + [${bucketNumberFieldName}] * (${tableName}[${fieldName}].MAX() - ${tableName}[${fieldName}].MIN()) / ${bucketCount}`;
    const rowCountFormula = `${tableName}.FILTER( $[${fieldName}] >= [${lowerBoundFieldName}] AND ([${bucketNumberFieldName}] = ${bucketCount} OR $[${fieldName}] < [${upperBoundFieldName}])).COUNT()`;

    table.addField({
      name: bucketNumberFieldName,
      formula: bucketNumberFormula,
      isDim: true,
    });
    table.addField({ name: lowerBoundFieldName, formula: lowerBoundFormula });
    table.addField({ name: upperBoundFieldName, formula: upperBoundFormula });
    table.addField({ name: rowCountFieldName, formula: rowCountFormula });

    return table.toDSL();
  } catch (e) {
    return '';
  }
}

/**
 * Create a virtual table to get data for one chart selector
 */
export function createVirtualChartTableDSL(
  parsedTable: ParsedTable,
  parsedField: ParsedField,
  virtualTableName: string
): string {
  const { tableName, fullFieldName, fieldName } = parsedField.key;

  try {
    const table = new Table(virtualTableName);

    const keyFieldFormula = `${tableName}${fullFieldName}.UNIQUE()`;
    const otherFilters = getFilterFormulaFromOtherSelectors(
      parsedTable,
      fieldName
    );
    const hasValuesFieldFormula = `${tableName}.FILTER(${otherFilters}${fullFieldName} = $${fullFieldName}).COUNT() > 0`;
    const sortFormula = `-[${hasValuesFieldName}],${fullFieldName}`;

    table.addField({
      name: fieldName,
      formula: keyFieldFormula,
      isDim: true,
    });

    table.addField({
      name: hasValuesFieldName,
      formula: hasValuesFieldFormula,
    });

    const apply = new Apply();
    const sort = new ApplySort();
    sort.append(sortFormula);
    apply.sort = sort;
    table.apply = apply;

    return table.toDSL();
  } catch (e) {
    return '';
  }
}

/**
 * Helper function to get field selectors from a single table and build a filter expression from them
 */
function getFilterFormulaFromOtherSelectors(
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
  editableSheet: Sheet | null,
  sheetContent: string,
  table: ParsedTable,
  tableSelectedKeys: SelectedChartKey[],
  viewGridData: ViewGridData
): string {
  const { tableName, apply } = table;

  const keysFilterFormula = buildKeysFilterFormula(
    tableName,
    tableSelectedKeys,
    viewGridData
  );

  if (!keysFilterFormula || !editableSheet) return sheetContent;

  try {
    const table = editableSheet.getTable(unescapeTableName(tableName));

    // Case 1: No apply section yet
    if (!apply) {
      const apply = new Apply();
      apply.filter = new ApplyFilter(keysFilterFormula);
      table.apply = apply;

      return editableSheet.toDSL();
    }

    const { filter } = apply;

    // Case 2: Apply exists, but no filter
    if (table.apply && apply && !filter) {
      table.apply.filter = new ApplyFilter(keysFilterFormula);

      return editableSheet.toDSL();
    }

    // Case 3: Apply exists with a filter
    if (filter && table.apply?.filter) {
      const existingFilter = table.apply.filter.formula;
      const updatedFilter = `(${existingFilter}) AND ${keysFilterFormula}`;
      table.apply.filter.formula = updatedFilter;

      return editableSheet.toDSL();
    }
  } catch (e) {
    return sheetContent;
  }

  return sheetContent;
}

/**
 * Builds a DSL filter expression from selected chart keys
 */
function buildKeysFilterFormula(
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
      is_raw: true,
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
