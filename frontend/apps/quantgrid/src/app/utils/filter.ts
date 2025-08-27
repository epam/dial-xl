import {
  Apply,
  ApplyFilter,
  ApplySort,
  escapeTableName,
  newLine,
  Sheet,
  SheetReader,
  Table,
  unescapeTableName,
} from '@frontend/parser';
import { escapeValue, ParsedField, ParsedTable } from '@frontend/parser';

interface VirtualTableConfig {
  editableSheet: Sheet;
  parsedTable: ParsedTable;
  parsedField: ParsedField;
  virtualTableName: string;
  searchValue: string;
  sort: 1 | -1;
}

/**
 * Generates a DSL string representation for 3 virtual tables that helps receive unique filter values for a table field.
 * @return {string} The generated DSL string.
 */
export function createVirtualTableUniqueFieldValuesDSL(
  config: VirtualTableConfig
): string {
  try {
    const cloneWithoutFullApplyName = escapeTableName(
      `${config.virtualTableName}_clone_source_table_without_full_apply`
    );
    const cloneWithoutOtherApplyName = escapeTableName(
      `${config.virtualTableName}_clone_source_table_with_other_apply`
    );

    const withoutFullApplyDSL = createCloneWithoutFullApply(
      config,
      cloneWithoutFullApplyName
    );

    const withoutOtherApplyDSL = createCloneWithoutOtherApply(
      config,
      cloneWithoutOtherApplyName
    );

    const uniqueFieldTableDSL = createUniqueFieldTable(
      config,
      cloneWithoutFullApplyName,
      cloneWithoutOtherApplyName
    );

    return [
      withoutFullApplyDSL,
      withoutOtherApplyDSL,
      uniqueFieldTableDSL,
    ].join(newLine + newLine);
  } catch (e) {
    return '';
  }
}

function createCloneWithoutFullApply(
  { editableSheet, parsedTable }: VirtualTableConfig,
  cloneWithoutFullApplyName: string
): string {
  const sourceTable = editableSheet.getTable(
    unescapeTableName(parsedTable.tableName)
  );

  const parsedSheet = SheetReader.parseSheet(sourceTable.toDSL());
  const newSheet = parsedSheet.editableSheet;

  if (!newSheet) return '';

  const unescapedSourceTableName = unescapeTableName(sourceTable.name);
  const clonedTable = newSheet.getTable(unescapedSourceTableName);
  clonedTable.name = cloneWithoutFullApplyName;

  if (clonedTable.apply) {
    if (clonedTable.apply.filter) {
      clonedTable.apply.filter = null;
    }
    clonedTable.apply = null;
  }

  return newSheet.toDSL().trim();
}

function createCloneWithoutOtherApply(
  { editableSheet, parsedTable, parsedField }: VirtualTableConfig,
  cloneWithoutOtherApplyName: string
): string {
  const sourceTable = editableSheet.getTable(
    unescapeTableName(parsedTable.tableName)
  );
  const parsedSheet = SheetReader.parseSheet(sourceTable.toDSL());
  const newSheet = parsedSheet.editableSheet;

  if (!newSheet) return '';

  const unescapedSourceTableName = unescapeTableName(sourceTable.name);
  const clonedTable = newSheet.getTable(unescapedSourceTableName);
  clonedTable.name = cloneWithoutOtherApplyName;

  if (clonedTable.apply?.filter) {
    const filterExpressions = parsedTable.apply?.filter
      ? parsedTable.apply.filter.getFilterExpressionsWithModify({
          excludeFieldName: parsedField.key.fieldName,
        })
      : [];

    if (filterExpressions.length > 0) {
      const fieldFilterExpression = filterExpressions.join(' AND ');
      clonedTable.apply = new Apply();
      clonedTable.apply.filter = new ApplyFilter(fieldFilterExpression);
    } else {
      clonedTable.apply.filter = null;
      clonedTable.apply = null;
    }
  }

  return newSheet.toDSL().trim();
}

function createUniqueFieldTable(
  { virtualTableName, searchValue, sort, parsedField }: VirtualTableConfig,
  cloneWithoutFullApplyName: string,
  cloneWithoutOtherApplyName: string
): string {
  const table = new Table(virtualTableName, true);
  const { fullFieldName, fieldName } = parsedField.key;

  // Add unique field
  const virtualKeyFieldExpression = `${cloneWithoutFullApplyName}${fullFieldName}.UNIQUE()`;
  table.addField({
    name: fieldName,
    formula: virtualKeyFieldExpression,
    isDim: true,
  });

  // Add filtered field
  const fieldNameFiltered = `${fieldName}_filtered`;
  const virtualKeyFilteredExpression = `IN(${fullFieldName}, ${cloneWithoutOtherApplyName}${fullFieldName})`;
  table.addField({
    name: fieldNameFiltered,
    formula: virtualKeyFilteredExpression,
  });

  // Add apply section with filter and sort
  const apply = new Apply();

  // Add filter if search value exists
  const filterValue = searchValue
    ? `CONTAINS([${fieldName}].LOWER(),${escapeValue(searchValue)})`
    : '';

  if (filterValue) {
    apply.filter = new ApplyFilter(filterValue);
  }

  // Add sort
  const sortValue = `${sort === -1 ? '-' : ''}[${fieldName}]`;
  const applySort = new ApplySort();
  applySort.append(sortValue);
  apply.sort = applySort;
  table.apply = apply;

  return table.toDSL().trim();
}
