import { escapeFieldName, escapeTableName } from '@frontend/parser';
import {
  applyKeyword,
  dimKeyword,
  escapeValue,
  filterKeyword,
  newLine,
  ParsedField,
  ParsedTable,
  sortKeyword,
  tableKeyword,
} from '@frontend/parser';

export function createVirtualTableUniqueFieldValuesDSL({
  sheetContent,
  table,
  field,
  virtualTableName,
  searchValue,
  sort,
}: {
  sheetContent: string;
  table: ParsedTable;
  field: ParsedField;
  virtualTableName: string;
  searchValue: string;
  sort: 1 | -1;
}): string {
  const cloneTableNameWithoutFullApply = escapeTableName(
    virtualTableName + '_clone_source_table_without_full_apply'
  );
  const cloneTableNameWithoutOtherApply = escapeTableName(
    virtualTableName + '_clone_source_table_with_other_apply'
  );
  const clonedTableWithoutApplyFilterDSL =
    sheetContent.substring(
      table.dslPlacement!.startOffset,
      table.dslTableNamePlacement!.start
    ) +
    cloneTableNameWithoutFullApply +
    (table.apply?.filter?.dslPlacement
      ? sheetContent.substring(
          table.dslTableNamePlacement!.end,
          table.apply!.filter!.dslPlacement!.start
        ) +
        sheetContent.substring(
          table.apply!.filter!.dslPlacement!.end,
          table.dslPlacement?.stopOffset
        )
      : sheetContent.substring(
          table.dslTableNamePlacement!.end,
          table.dslPlacement?.stopOffset
        ));

  const filterExpressions = table.apply?.filter
    ? table.apply.filter.getFilterExpressionsWithModify({
        excludeFieldName: field.key.fieldName,
      })
    : [];
  const filter = table.apply?.filter?.filterExpressionDSLPlacement
    ? filterExpressions.length > 0
      ? sheetContent.substring(
          table.dslTableNamePlacement!.end,
          table.apply.filter.filterExpressionDSLPlacement.start
        ) +
        filterExpressions +
        sheetContent.substring(
          table.apply.filter.filterExpressionDSLPlacement.end + 1,
          table.dslPlacement?.stopOffset
        )
      : // ignore filter section
        sheetContent.substring(
          table.dslTableNamePlacement!.end,
          table.apply.filter.dslPlacement?.start
        ) +
        sheetContent.substring(
          table.apply.filter.filterExpressionDSLPlacement.end + 1,
          table.dslPlacement?.stopOffset
        )
    : sheetContent.substring(
        table.dslTableNamePlacement!.end,
        table.dslPlacement?.stopOffset
      );
  const clonedTableWithoutOtherApplyFilterDSL =
    sheetContent.substring(
      table.dslPlacement!.startOffset,
      table.dslTableNamePlacement!.start
    ) +
    cloneTableNameWithoutOtherApply +
    filter;

  const { fullFieldName, fieldName } = field.key;
  const tableDSL = `${newLine}${newLine}${tableKeyword} ${escapeTableName(
    virtualTableName
  )}`;
  const virtualKeyFieldWithoutFullApplyDSL = `${dimKeyword} ${fullFieldName} = ${cloneTableNameWithoutFullApply}${fullFieldName}.UNIQUE()`;

  const fieldNameFiltered = escapeFieldName(`${fieldName}_filtered`);
  const virtualKeyFieldWithoutOtherApplyDSL = `[${fieldNameFiltered}] = IN(${fullFieldName}, ${cloneTableNameWithoutOtherApply}${fullFieldName})`;

  const preprocessedWithDataVirtualTables = `${clonedTableWithoutApplyFilterDSL}${newLine}${newLine}${clonedTableWithoutOtherApplyFilterDSL}${newLine}${newLine}`;

  const filterValue = searchValue
    ? `${filterKeyword} CONTAINS([${fieldName}].LOWER(),${escapeValue(
        searchValue
      )})${newLine}`
    : '';
  const sortValue = `${sortKeyword} ${
    sort === -1 ? '-' : ''
  }[${fieldName}]${newLine}`;
  const applyBlock = `${applyKeyword}${newLine}${filterValue}${sortValue}`;
  const finalVirtualDataTable = `${tableDSL}${newLine}${virtualKeyFieldWithoutFullApplyDSL}${newLine}${virtualKeyFieldWithoutOtherApplyDSL}${newLine}${applyBlock}${newLine}`;

  return `${preprocessedWithDataVirtualTables}${finalVirtualDataTable}${newLine}`;
}
