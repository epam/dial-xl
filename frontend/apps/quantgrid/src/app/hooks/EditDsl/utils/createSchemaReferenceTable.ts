import { GridApi } from '@frontend/canvas-spreadsheet';
import {
  Decorator,
  escapeFieldName,
  Field,
  fieldColSizeDecoratorName,
  ParsedSheets,
  Sheet,
  sourceFieldName,
} from '@frontend/parser';

import { createUniqueName } from '../../../services';
import { getExpandedTextSize } from '../../../utils';
import { autoSizeTableHeader } from './autoSizeTableHeader';
import { createAndPlaceTable } from './createAndPlaceTable';

export function createSchemaReferenceTable(options: {
  sheet: Sheet;
  parsedSheets: ParsedSheets;
  baseTableName: string;
  col?: number;
  row?: number;
  formula: string;
  schema: string[];
  keys: string[];
  grid: GridApi | null;
  sheetName: string | null;
  projectName: string | null;
  isSourceDim?: boolean;
  skipSourceFieldInSchema?: boolean;
}) {
  const {
    sheet,
    parsedSheets,
    baseTableName,
    col = 1,
    row = 1,
    formula,
    schema,
    keys,
    isSourceDim = false,
    skipSourceFieldInSchema = false,
    grid,
    projectName,
    sheetName,
  } = options;

  const { table, tableName } = createAndPlaceTable({
    sheet,
    baseName: baseTableName,
    parsedSheets,
    col,
    row,
    layoutOptions: {
      showFieldHeaders: true,
      showTableHeader: true,
    },
  });

  const source = new Field(sourceFieldName, formula);
  if (isSourceDim) {
    source.dim = true;
  }
  table.addField(source);

  const tableFields = [sourceFieldName];

  const finalSchema = skipSourceFieldInSchema
    ? schema.filter((f) => f !== sourceFieldName)
    : schema;

  finalSchema.forEach((f, index) => {
    const escapedName = escapeFieldName(f);
    const uniqueFieldName = createUniqueName(f, tableFields);
    tableFields.push(uniqueFieldName);

    const fieldExpr = `[${sourceFieldName}][${escapedName}]`;
    const field = new Field(uniqueFieldName, fieldExpr);
    const fieldSize = getExpandedTextSize({
      text: field.name,
      col: col + index,
      grid: options.grid,
      projectName: options.projectName,
      sheetName: options.sheetName,
    });
    if (fieldSize && fieldSize > 1) {
      field.addDecorator(
        new Decorator(fieldColSizeDecoratorName, `(${fieldSize})`)
      );
    }
    field.key = keys.includes(f);
    table.addField(field);
  });

  autoSizeTableHeader(table, col, grid, projectName, sheetName);

  return { table, tableName };
}
