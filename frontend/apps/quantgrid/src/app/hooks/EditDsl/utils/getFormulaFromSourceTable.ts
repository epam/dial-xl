import { escapeFieldName, ParsedTable } from '@frontend/parser';

export function getFormulaFromSourceTable(parsedTable: ParsedTable): {
  formula: string;
  shouldAddDim: boolean;
} {
  const { tableName, fields } = parsedTable;
  const finalParsedFields = fields.filter((f) => !f.isDynamic);
  const shouldAddDim = finalParsedFields.some((f) => f.isDim);
  const fieldsSelector =
    finalParsedFields.length > 1
      ? finalParsedFields
          .map(({ key }) => `[${escapeFieldName(key.fieldName)}]`)
          .join(',')
      : escapeFieldName(finalParsedFields[0].key.fieldName);

  return { formula: `${tableName}[${fieldsSelector}]`, shouldAddDim };
}
