import {
  Decorator,
  layoutDecoratorName,
  LayoutDecoratorParams,
  lineBreak,
  ParsedTable,
  Table,
  updateLayoutDecorator,
} from '@frontend/parser';

export type EditLayoutDecoratorProps = {
  showTableHeader?: boolean;
  showFieldHeaders?: boolean;
  isHorizontal?: boolean;
  rowOffset?: number;
  targetCol?: number;
  targetRow?: number;
};

export function editLayoutDecorator(
  table: Table,
  parsedTable: ParsedTable,
  props: EditLayoutDecoratorProps
): boolean {
  const {
    rowOffset = 0,
    targetCol,
    targetRow,
    showTableHeader,
    showFieldHeaders,
    isHorizontal,
  } = props;
  const params: Partial<LayoutDecoratorParams> = {
    includeDecoratorName: false,
  };

  if (showTableHeader !== undefined) {
    params.showTableHeader = showTableHeader;
  }

  if (showFieldHeaders !== undefined) {
    params.showFieldHeaders = showFieldHeaders;
  }

  if (targetRow !== undefined && targetCol !== undefined) {
    params.row = targetRow;
    params.col = targetCol;
  }

  if (isHorizontal !== undefined) {
    params.isHorizontal = isHorizontal;
  }

  try {
    const decorator = table.getDecorator(layoutDecoratorName);
    const layoutDecorator = parsedTable.getLayoutDecorator();

    if (!layoutDecorator) return false;

    const [placementStartRow, placementStartCol] = layoutDecorator
      .params[0] as [number, number];

    if (rowOffset !== 0) {
      params.row = Math.max(1, placementStartRow + rowOffset);
      params.col = placementStartCol;
    }

    decorator.arguments =
      updateLayoutDecorator(layoutDecorator, params) + lineBreak;

    return true;
  } catch (e) {
    try {
      const args = updateLayoutDecorator(undefined, params);
      table.addDecorator(new Decorator(layoutDecoratorName, args));

      return true;
    } catch (e) {
      return false;
    }
  }
}
