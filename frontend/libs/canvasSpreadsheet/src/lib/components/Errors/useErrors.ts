import { useCallback, useContext, useEffect, useState } from 'react';

import { GridStateContext, GridViewportContext } from '../../context';
import { CellError, createErrorCell, shouldShowFieldError } from './utils';

export function useErrors() {
  const { getCell } = useContext(GridStateContext);
  const {
    viewportEdges,
    viewportRowCount,
    viewportColCount,
    gridViewportSubscriber,
  } = useContext(GridViewportContext);

  const [errors, setErrors] = useState<CellError[]>([]);

  const updateErrorCells = useCallback(() => {
    if (!viewportEdges.current || !viewportRowCount || !viewportColCount)
      return;

    const { startRow, endRow, startCol, endCol } = viewportEdges.current;
    const updatedErrors: CellError[] = [];
    const cellKeys = new Set<string>();

    const addErrorCell = (errorCell: CellError | null) => {
      if (!errorCell) return;

      if (!cellKeys.has(errorCell.key)) {
        cellKeys.add(errorCell.key);
        updatedErrors.push(errorCell);
      }
    };

    for (let row = startRow; row <= endRow; ++row) {
      for (let col = startCol; col <= endCol; ++col) {
        const cell = getCell(col, row);

        if (!cell?.table || !cell.field) continue;

        const {
          field,
          isFieldHeader,
          isTableHeader,
          hasError: cellHasError,
          errorMessage: cellErrorMessage,
        } = cell;
        const { hasError: fieldHasError, errorMessage: fieldErrorMessage } =
          field;
        const isFieldError = fieldHasError && fieldErrorMessage;
        const isCellError = cellHasError && cellErrorMessage;
        const isCell = !isFieldHeader && !isTableHeader;

        if (!isFieldError && !isCellError) continue;

        if (isFieldError && shouldShowFieldError(cell, row)) {
          addErrorCell(createErrorCell(cell, fieldErrorMessage, true));
        }

        if (isCell && isCellError) {
          addErrorCell(createErrorCell(cell, cellErrorMessage, false));
        }

        if (isCell && isFieldError) {
          addErrorCell(createErrorCell(cell, fieldErrorMessage, true, true));
        }
      }
    }

    setErrors(updatedErrors);
  }, [getCell, viewportEdges, viewportRowCount, viewportColCount]);

  useEffect(() => {
    updateErrorCells();

    return gridViewportSubscriber.current.subscribe(() => {
      updateErrorCells();
    });
  }, [gridViewportSubscriber, updateErrorCells]);

  return {
    errors,
  };
}
