import { InputNumber } from 'antd';
import cx from 'classnames';
import {
  KeyboardEvent,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { inputClasses, KeyboardCode } from '@frontend/common';
import { ParsedTable } from '@frontend/parser';

import { ProjectContext } from '../../../../context';
import { useGridApi, useTableEditDsl } from '../../../../hooks';

const minPlacement = 1;

export function TablePlacementSection({
  parsedTable,
}: {
  parsedTable: ParsedTable;
}) {
  const { sheetName } = useContext(ProjectContext);
  const { moveTableTo } = useTableEditDsl();
  const gridApi = useGridApi();

  const [startRow, setStartRow] = useState<number | null>();
  const [startCol, setStartCol] = useState<number | null>();

  const handleMoveTable = useCallback(() => {
    if (!startRow || !startCol || !sheetName) return;
    if (startRow < minPlacement || startCol < minPlacement) return;

    moveTableTo(parsedTable.tableName, startRow, startCol);

    // TODO: workaround to select table after moving. openTable rely to viewGridData which is not updated yet
    setTimeout(() => {
      if (!gridApi) return;

      gridApi.moveViewportToCell(startCol, startRow, true);
      gridApi.updateSelection({
        startCol,
        startRow,
        endCol: startCol,
        endRow: startRow,
      });
    }, 100);
  }, [
    gridApi,
    moveTableTo,
    parsedTable.tableName,
    sheetName,
    startCol,
    startRow,
  ]);

  const initFieldValues = useCallback(() => {
    const [row, col] = parsedTable.getPlacement();
    setStartRow(row);
    setStartCol(col);
  }, [parsedTable]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      const { key, ctrlKey, altKey, metaKey } = event;

      if (ctrlKey || altKey || metaKey) return;

      if (key.length === 1 && !/^\d$/.test(key)) {
        event.preventDefault();
      }

      if (key === KeyboardCode.Escape) {
        initFieldValues();
      }

      return;
    },
    [initFieldValues]
  );

  useEffect(() => {
    if (!parsedTable) return;

    initFieldValues();
  }, [initFieldValues, parsedTable]);

  return (
    <div className="flex flex-col px-3">
      <div className="flex items-center mb-2">
        <span className="min-w-[120px] text-[13px] text-text-primary">
          Start row
        </span>
        <InputNumber
          className={cx('h-7 w-max-[350px] text-[13px]', inputClasses)}
          id="startRow"
          min={minPlacement}
          placeholder="Start row"
          value={startRow}
          onBlur={handleMoveTable}
          onChange={(v) => setStartRow(v)}
          onKeyDown={handleKeyDown}
          onPressEnter={handleMoveTable}
        />
      </div>
      <div className="flex items-center mb-2">
        <span className="min-w-[120px] text-[13px] text-text-primary">
          Start column
        </span>
        <InputNumber
          className={cx('h-7 w-max-[350px] text-[13px]', inputClasses)}
          id="startColumn"
          min={minPlacement}
          placeholder="Start column"
          value={startCol}
          onBlur={handleMoveTable}
          onChange={(v) => setStartCol(v)}
          onKeyDown={handleKeyDown}
          onPressEnter={handleMoveTable}
        />
      </div>
    </div>
  );
}
