import { GridApi } from '@frontend/canvas-spreadsheet';
import { fieldColSizeDecoratorName, Table } from '@frontend/parser';

import { fieldNameSizeLimit, getExpandedTextSize } from '../../../utils';
import { editFieldDecorator } from './editFieldDecorator';

export function autoSizeTableHeader(
  table: Table,
  col: number,
  grid: GridApi | null,
  projectName: string | undefined | null,
  sheetName: string | undefined | null
) {
  const tableHeaderSize = getExpandedTextSize({
    text: table.name,
    col,
    grid,
    projectName,
    sheetName,
    useMaxLimit: true,
  });

  if (tableHeaderSize === undefined) return;

  const fieldSizes: number[] = [];
  let currentTableCols = 0;

  table.fields.forEach((field, idx) => {
    const hasSizeDecorator = field.hasDecorator(fieldColSizeDecoratorName);
    let size = 1;

    if (hasSizeDecorator) {
      const decorator = field.getDecorator(fieldColSizeDecoratorName);
      const match = decorator.arguments.trim().match(/^\(\s*(-?\d+)\s*\)$/);

      if (match) {
        size = Math.max(1, parseInt(match[1], 10));
      }
    }

    fieldSizes[idx] = size;
    currentTableCols += size;
  });

  let extra = tableHeaderSize - currentTableCols;

  if (extra <= 0) return;

  const fieldCount = table.fields.length;

  while (extra > 0) {
    let grew = false;
    for (let i = 0; i < fieldCount && extra > 0; i++) {
      if (fieldSizes[i] < fieldNameSizeLimit) {
        fieldSizes[i]++;
        extra--;
        grew = true;
      }
    }
    if (!grew) break;
  }

  table.fields.forEach((field, idx) => {
    const newSize = fieldSizes[idx];

    if (newSize > 1) {
      editFieldDecorator(field, fieldColSizeDecoratorName, `(${newSize})`);
    }
  });
}
