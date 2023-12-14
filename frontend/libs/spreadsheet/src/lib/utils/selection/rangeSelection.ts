import { KeyboardCode } from '@frontend/common';

import { defaults } from '../../defaults';
import { GridSelection } from '../../grid';

export function rangeSelection(
  selection: GridSelection,
  direction: string,
  maxRow: number
): GridSelection {
  let { endCol, endRow } = selection;

  switch (direction) {
    case KeyboardCode.ArrowUp:
      endRow = Math.max(1, endRow - 1);
      break;
    case KeyboardCode.ArrowDown:
      endRow = Math.min(endRow + 1, maxRow - 1);
      break;
    case KeyboardCode.ArrowLeft:
      endCol = Math.max(1, endCol - 1);
      break;
    case KeyboardCode.ArrowRight:
      endCol = Math.min(endCol + 1, defaults.viewport.cols - 1);
      break;
  }

  return {
    startRow: selection.startRow,
    startCol: selection.startCol,
    endRow,
    endCol,
  };
}
