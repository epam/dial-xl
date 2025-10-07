import { useEffect, useState } from 'react';

import { useGridApi } from '../../hooks';
import { LongCalculation } from './LongCalculation';
import { MoveMode } from './MoveMode';
import { Profile } from './Profile';
import { SheetSelect } from './SheetSelect';
import { Zoom } from './Zoom';

export const BottomSheetBar = () => {
  const api = useGridApi();

  const [fieldSize, setFieldSize] = useState<number | null>(null);

  useEffect(() => {
    const sub = api?.selection$.subscribe((selection) => {
      if (!api) return;

      if (!selection) {
        setFieldSize(null);

        return;
      }

      const startCol = Math.min(selection.startCol, selection.endCol);
      const endCol = Math.max(selection.startCol, selection.endCol);
      const startRow = Math.min(selection.startRow, selection.endRow);
      const endRow = Math.max(selection.startRow, selection.endRow);

      const cells = [];

      for (let col = startCol; col <= endCol; col++) {
        for (let row = startRow; row <= endRow; row++) {
          const cell = api.getCell(col, row);

          if (!cell || cell.startCol !== col) continue;

          cells.push(cell);
        }
      }

      const selectionFields = cells.reduce((acc, curr) => {
        if (!curr.field) return acc;

        if (!acc[curr.field.fieldName]) {
          acc[curr.field.fieldName] = curr.field.dataLength;
        }

        return acc;
      }, {} as Record<string, number>);

      const keys = Object.keys(selectionFields);

      if (keys.length !== 1) {
        setFieldSize(null);

        return;
      }

      Object.values(selectionFields).forEach((dataLength) => {
        setFieldSize(dataLength);
      });
    });

    return () => sub?.unsubscribe();
  }, [api, api?.selection$]);

  return (
    <div className="flex @container/bottom-bar justify-between gap-10 items-center border-t border-stroke-primary text-sm text-text-secondary overflow-x-hidden bg-bg-layer-1">
      <SheetSelect />

      <div className="flex items-center text-text-primary gap-3 shrink overflow-hidden">
        {fieldSize !== null && (
          <div className="flex shrink overflow-hidden" title={`${fieldSize}`}>
            Rows:&nbsp;{fieldSize}
          </div>
        )}

        <span className="flex items-center shrink-0 gap-3">
          <LongCalculation />
          <Profile />
          <MoveMode />
          <Zoom />
        </span>
      </div>
    </div>
  );
};
