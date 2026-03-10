import { useContext, useEffect, useState } from 'react';
import { distinctUntilChanged, map, merge } from 'rxjs';

import { GridCell, SelectionEdges } from '@frontend/canvas-spreadsheet';

import { ViewportContext } from '../../context';
import { useGridApi } from '../../hooks';
import { LongCalculation } from './LongCalculation';
import { MoveMode } from './MoveMode';
import { Profile } from './Profile';
import { SheetSelect } from './SheetSelect';
import { Zoom } from './Zoom';

export const BottomSheetBar = () => {
  const { viewGridData } = useContext(ViewportContext);
  const api = useGridApi();

  const [fieldSize, setFieldSize] = useState<number | null>(null);

  useEffect(() => {
    if (!api) {
      setFieldSize(null);

      return;
    }

    const getCellsFromSelection = (
      selection: SelectionEdges | null,
    ): GridCell[] => {
      if (!selection) return [];

      const startCol = Math.min(selection.startCol, selection.endCol);
      const endCol = Math.max(selection.startCol, selection.endCol);
      const startRow = Math.min(selection.startRow, selection.endRow);
      const endRow = Math.max(selection.startRow, selection.endRow);

      const cells: GridCell[] = [];

      for (let col = startCol; col <= endCol; col++) {
        for (let row = startRow; row <= endRow; row++) {
          const cell = api.getCell(col, row);
          if (!cell || cell.startCol !== col) continue;
          cells.push(cell);
        }
      }

      return cells;
    };

    const selection$ = api.selection$;

    const selectionOrDataChange$ = merge(
      selection$,
      viewGridData.shouldUpdate$.pipe(map(() => api.selection$.value)),
    );

    const sub = selectionOrDataChange$
      .pipe(
        map((selection) => {
          if (!selection) return null;

          const cells = getCellsFromSelection(selection);

          const selectionFieldsByTable = cells.reduce(
            (acc, curr) => {
              if (!curr.field || !curr.table) return acc;
              const tableName = curr.table.tableName;
              const fieldName = curr.field.fieldName;
              const fieldsForTable = acc[tableName] ?? [];
              if (!fieldsForTable.includes(fieldName)) {
                acc[tableName] = [...fieldsForTable, fieldName];
              }

              return acc;
            },
            {} as Record<string, string[]>,
          );

          const tableNames = Object.keys(selectionFieldsByTable);
          if (tableNames.length !== 1) return null;

          const tableData = viewGridData.getTableData(tableNames[0]);

          return tableData && tableData.isTotalRowsUpdated
            ? tableData.totalRows
            : null;
        }),
        distinctUntilChanged(),
      )
      .subscribe((size) =>
        setFieldSize((prev) => (prev === size ? prev : size)),
      );

    return () => sub.unsubscribe();
  }, [api, viewGridData]);

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
