import { ParsedSheets, SheetReader } from '@frontend/parser';

import { autoFixFieldNames } from './autoFixFieldNames';
import { autoFixTableNames } from './autoFixTableNames';
import { ExpressionToUpdate } from './autoFunctionsToUppercase';
import { getTableFields, TableFields } from './getTableFields';

export function autoFixSheetTableOrFieldName(
  dsl: string,
  parsedSheets: ParsedSheets
) {
  if (!dsl) return dsl;

  try {
    const parsedSheet = SheetReader.parseSheet(dsl);
    const { tables } = parsedSheet;
    const expressionsToUpdate: ExpressionToUpdate[] = [];
    const tableFields: TableFields = getTableFields(parsedSheets, tables);

    tables.forEach((table) => {
      const { fields } = table;
      fields.forEach((field) => {
        const { expressionMetadata } = field;

        if (expressionMetadata?.text) {
          const { text, start, end } = expressionMetadata;
          let expression = autoFixTableNames(text, tableFields);
          expression = autoFixFieldNames(
            expression,
            table.tableName,
            tableFields
          );

          if (text !== expression) {
            expressionsToUpdate.push({
              expression,
              start,
              end,
            });
          }
        }
      });
    });

    if (expressionsToUpdate.length === 0) return dsl;

    const reversedExpressionsByPlacement = expressionsToUpdate.sort((a, b) => {
      return b.start - a.start;
    });

    let updatedDsl = dsl;

    reversedExpressionsByPlacement.forEach((e) => {
      updatedDsl =
        updatedDsl.substring(0, e.start) +
        e.expression +
        updatedDsl.substring(e.end + 1);
    });

    return updatedDsl;
  } catch (e) {
    return dsl;
  }
}
