import { useCallback, useContext, useEffect, useState } from 'react';

import { GridStateContext, GridViewportContext } from '../../context';
import { Edges } from '../../types';

export type NoteCell = Edges & {
  key: string;
};

export function useNotes() {
  const { getCell } = useContext(GridStateContext);
  const {
    viewportEdges,
    viewportRowCount,
    viewportColCount,
    gridViewportSubscriber,
  } = useContext(GridViewportContext);

  const [notes, setNotes] = useState<NoteCell[]>([]);

  const updateNoteCells = useCallback(() => {
    if (!viewportEdges.current || !viewportRowCount || !viewportColCount)
      return;

    const { startRow, endRow, startCol, endCol } = viewportEdges.current;
    const updatedNotes: NoteCell[] = [];
    const cellKeys = new Set<string>();

    const addNoteCell = (noteCell: NoteCell | null) => {
      if (!noteCell) return;

      if (!cellKeys.has(noteCell.key)) {
        cellKeys.add(noteCell.key);
        updatedNotes.push(noteCell);
      }
    };

    for (let row = startRow; row <= endRow; ++row) {
      for (let col = startCol; col <= endCol; ++col) {
        const cell = getCell(col, row);

        if (!cell?.isFieldHeader || !cell?.field?.note) continue;

        const { startCol, endCol } = cell;

        addNoteCell({
          key: `${startCol}-${endCol}-${row}`,
          startCol,
          endCol,
          startRow: row,
          endRow: row,
        });
      }
    }

    setNotes(updatedNotes);
  }, [getCell, viewportEdges, viewportRowCount, viewportColCount]);

  useEffect(() => {
    updateNoteCells();

    return gridViewportSubscriber.current.subscribe(() => {
      updateNoteCells();
    });
  }, [gridViewportSubscriber, updateNoteCells]);

  return {
    notes,
  };
}
