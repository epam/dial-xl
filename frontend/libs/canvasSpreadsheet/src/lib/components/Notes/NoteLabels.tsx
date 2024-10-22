import * as PIXI from 'pixi.js';
import { useCallback, useContext } from 'react';

import { Container, Graphics } from '@pixi/react';

import { ComponentLayer } from '../../constants';
import { GridStateContext } from '../../context';
import { useCellUtils } from '../../hooks';
import { isCellEditorOpen } from '../../utils';
import { GridEvent } from '../GridApiWrapper';
import { NoteCell, useNotes } from './useNotes';

export function NoteLabels() {
  const { theme, gridSizes, gridApi } = useContext(GridStateContext);
  const { calculateCellDimensions } = useCellUtils();
  const { notes } = useNotes();

  const onMouseOver = useCallback(
    (cell: NoteCell) => {
      if (isCellEditorOpen()) return;

      const { startCol, startRow } = cell;

      gridApi.event.emit({
        type: GridEvent.openNote,
        col: startCol,
        row: startRow,
      });
    },
    [gridApi]
  );

  const draw = useCallback(
    (graphics: PIXI.Graphics, cell: NoteCell) => {
      const { bgColor } = theme.noteLabel;
      const { size } = gridSizes.noteLabel;
      const { borderWidth } = gridSizes.cell;

      graphics.clear();

      const { x, y, width } = calculateCellDimensions(cell);

      graphics
        .lineStyle(1, bgColor)
        .beginFill(bgColor)
        .drawPolygon([
          { x: x + width - borderWidth, y: y + borderWidth },
          { x: x + width - borderWidth, y: y + size + borderWidth },
          { x: x + width - size - borderWidth, y: y + borderWidth },
        ])
        .endFill();
    },
    [theme, gridSizes, calculateCellDimensions]
  );

  return (
    <Container zIndex={ComponentLayer.NoteLabel}>
      {notes.map((cell) => (
        <Graphics
          cursor="pointer"
          draw={(g: PIXI.Graphics) => draw(g, cell)}
          eventMode="static"
          key={cell.key}
          onmouseover={() => onMouseOver(cell)}
        />
      ))}
    </Container>
  );
}
