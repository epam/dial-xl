import { CompilationError, ParsingError, TableData } from '@frontend/common';
import { ParsedTable } from '@frontend/parser';
import { GridData } from '@frontend/spreadsheet';

export function shouldSkipSpreadsheetUpdate(
  tables: ParsedTable[],
  tableData: TableData,
  data: GridData,
  compilationErrors: CompilationError[] | null,
  sheetErrors: ParsingError[] | null
) {
  const fieldCount = tables.reduce((acc, t) => acc + t.fields.length, 0);
  const tableNames = tables.map((t) => t.tableName);
  const sheetCompilationErrors =
    compilationErrors?.filter((e) => tableNames.includes(e.tableName)) || null;
  const errorFieldCount = getErrorFieldCount(
    sheetCompilationErrors,
    sheetErrors
  );

  return (
    Object.keys(tableData).length === 0 &&
    tables.length > 0 &&
    Object.keys(data).length !== 0 &&
    fieldCount !== errorFieldCount
  );
}

function getErrorFieldCount(
  compilationErrors: CompilationError[] | null,
  sheetErrors: ParsingError[] | null
) {
  const errorsSet = new Set();

  compilationErrors?.forEach((error) => {
    if (error.fieldName && error.tableName) {
      errorsSet.add(`${error.tableName}[${error.fieldName}]`);
    }
  });

  sheetErrors?.forEach((error) => {
    if (error.fieldName && error.tableName) {
      errorsSet.add(`${error.tableName}[${error.fieldName}]`);
    }
  });

  return errorsSet.size;
}
