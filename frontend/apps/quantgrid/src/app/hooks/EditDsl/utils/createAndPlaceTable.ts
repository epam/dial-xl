import {
  collectTableNames,
  Decorator,
  layoutDecoratorName,
  minTablePlacement,
  ParsedSheets,
  Sheet,
  Table,
  unescapeTableName,
  updateLayoutDecorator,
} from '@frontend/parser';

import { createUniqueName } from '../../../services';

interface CreateAndPlaceTableOptions {
  sheet: Sheet;
  baseName: string;
  parsedSheets: ParsedSheets;
  col?: number;
  row?: number;
  layoutOptions?: {
    showTableHeader?: boolean;
    showFieldHeaders?: boolean;
  };
  additionalDecorators?: Decorator[];
}

export function createAndPlaceTable({
  sheet,
  baseName,
  parsedSheets,
  col = 1,
  row = 1,
  layoutOptions = {},
  additionalDecorators = [],
}: CreateAndPlaceTableOptions) {
  const unescapedName = unescapeTableName(baseName);
  const newTableName = createUniqueName(
    unescapedName,
    collectTableNames(parsedSheets)
  );

  const table = new Table(newTableName, true);
  sheet.addTable(table);

  const layoutArgs = updateLayoutDecorator(undefined, {
    col: Math.max(minTablePlacement, col),
    row: Math.max(minTablePlacement, row),
    showTableHeader: layoutOptions.showTableHeader ?? false,
    showFieldHeaders: layoutOptions.showFieldHeaders ?? false,
    includeDecoratorName: false,
  });
  table.addDecorator(new Decorator(layoutDecoratorName, layoutArgs));

  additionalDecorators.forEach((dec) => {
    table.addDecorator(dec);
  });

  return { table, tableName: newTableName };
}
