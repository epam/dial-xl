import { InputNumber } from 'antd';
import cx from 'classnames';
import {
  KeyboardEvent,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import {
  defaultChartCols,
  defaultChartRows,
  inputClasses,
  KeyboardCode,
} from '@frontend/common';
import { ParsedTable } from '@frontend/parser';

import {
  AppSpreadsheetInteractionContext,
  ProjectContext,
} from '../../../../context';
import {
  useChartEditDsl,
  useGridApi,
  useTableEditDsl,
} from '../../../../hooks';

const maxSize = 100;
const minSize = 5;
const minPlacement = 1;

export function ChartPlacementSection({
  parsedTable,
}: {
  parsedTable: ParsedTable;
}) {
  const { openTable } = useContext(AppSpreadsheetInteractionContext);
  const { sheetName } = useContext(ProjectContext);
  const { chartResize } = useChartEditDsl();
  const { moveTableTo } = useTableEditDsl();
  const gridApi = useGridApi();

  const [rows, setRows] = useState<number | null>();
  const [cols, setCols] = useState<number | null>();
  const [startRow, setStartRow] = useState<number | null>();
  const [startCol, setStartCol] = useState<number | null>();

  const handleMoveTable = useCallback(() => {
    if (!startRow || !startCol || !sheetName) return;
    if (startRow < minPlacement || startCol < minPlacement) return;

    moveTableTo(parsedTable.tableName, startRow, startCol);

    // TODO: workaround to select table after moving. openTable rely to viewGridData which is not updated yet
    setTimeout(() => {
      if (!gridApi) return;

      const width = cols ? Math.max(cols - 1, 0) : 1;
      gridApi.moveViewportToCell(startCol, startRow, true);
      gridApi.updateSelection({
        startCol,
        startRow,
        endCol: startCol + width,
        endRow: startRow,
      });
    }, 100);
  }, [
    cols,
    gridApi,
    moveTableTo,
    parsedTable.tableName,
    sheetName,
    startCol,
    startRow,
  ]);

  const handleResizeTable = useCallback(() => {
    if (!cols || !rows || !sheetName) return;
    if (cols < minSize || rows < minSize) return;
    if (cols > maxSize || rows > maxSize) return;

    chartResize(parsedTable.tableName, cols, rows);
    openTable(sheetName, parsedTable.tableName);
  }, [chartResize, cols, openTable, parsedTable.tableName, rows, sheetName]);

  const initFieldValues = useCallback(() => {
    const chartSize = parsedTable.getChartSize();
    const chartRows = chartSize[0] || defaultChartRows;
    const chartCols = chartSize[1] || defaultChartCols;
    const [row, col] = parsedTable.getPlacement();
    setStartRow(row);
    setStartCol(col);
    setRows(chartRows);
    setCols(chartCols);
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
    <div className="flex flex-col">
      <div className="flex items-center mb-2">
        <span className="min-w-[120px] text-[13px] text-text-primary">
          Rows and columns
        </span>
        <InputNumber
          className={cx('h-7 w-full text-[13px]', inputClasses)}
          id="rows"
          max={maxSize}
          min={minSize}
          placeholder="Row"
          value={rows}
          onBlur={handleResizeTable}
          onChange={(v) => setRows(v)}
          onKeyDown={handleKeyDown}
          onPressEnter={handleResizeTable}
        />
        <span className="mx-2 text-text-secondary text-[16px] font-semibold">
          X
        </span>
        <InputNumber
          className={cx('h-7 w-full text-[13px]', inputClasses)}
          id="columns"
          max={maxSize}
          min={minSize}
          placeholder="Column"
          value={cols}
          onBlur={handleResizeTable}
          onChange={(v) => setCols(v)}
          onKeyDown={handleKeyDown}
          onPressEnter={handleResizeTable}
        />
      </div>
      <div className="flex items-center mb-2">
        <span className="min-w-[120px] text-[13px] text-text-primary">
          Start row
        </span>
        <InputNumber
          className={cx('h-7 w-full text-[13px]', inputClasses)}
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
          className={cx('h-7 w-full text-[13px]', inputClasses)}
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
