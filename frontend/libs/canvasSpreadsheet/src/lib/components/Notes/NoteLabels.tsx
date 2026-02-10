import { Graphics } from 'pixi.js';
import { useCallback, useContext, useRef } from 'react';

import { GridStateContext } from '../../context';
import { useCellUtils, useDraw } from '../../hooks';
import { isCellEditorOpen } from '../../utils';
import { GridEvent } from '../GridApiWrapper';
import { NoteCell, useNotes } from './useNotes';

type Props = {
  zIndex: number;
};

export function NoteLabels({ zIndex }: Props) {
  const { theme, gridSizes, gridApi } = useContext(GridStateContext);
  const { calculateCellDimensions } = useCellUtils();
  const { notes } = useNotes();
  const graphicsRefs = useRef<Map<string, Graphics>>(new Map());

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
    [gridApi],
  );

  const draw = useCallback(() => {
    notes.forEach((cell) => {
      const graphics = graphicsRefs.current.get(cell.key);
      if (!graphics) return;

      const { bgColor } = theme.noteLabel;
      const { size } = gridSizes.noteLabel;
      const { borderWidth } = gridSizes.cell;

      graphics.clear();

      const { x, y, width } = calculateCellDimensions(cell);

      const points = [
        x + width - borderWidth,
        y + borderWidth,
        x + width - borderWidth,
        y + size + borderWidth,
        x + width - size - borderWidth,
        y + borderWidth,
      ];

      graphics
        .poly(points)
        .fill({ color: bgColor })
        .stroke({ width: 1, color: bgColor });
    });
  }, [notes, theme, gridSizes, calculateCellDimensions]);

  useDraw(draw);

  return (
    <pixiContainer label="NoteLabels" zIndex={zIndex}>
      {notes.map((cell) => (
        <pixiGraphics
          cursor="pointer"
          draw={() => {}}
          eventMode="static"
          key={cell.key}
          label={`NoteLabelGraphics_${cell.key}`}
          ref={(ref: Graphics | null) => {
            if (ref) {
              graphicsRefs.current.set(cell.key, ref);
            } else {
              graphicsRefs.current.delete(cell.key);
            }
          }}
          onMouseOver={() => onMouseOver(cell)}
        />
      ))}
    </pixiContainer>
  );
}
