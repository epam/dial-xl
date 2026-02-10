import { Switch } from 'antd';
import {
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { ParsedTable, showVisualMapDecoratorName } from '@frontend/parser';

import {
  AppSpreadsheetInteractionContext,
  ProjectContext,
} from '../../../../context';
import { useTableEditDsl } from '../../../../hooks';

export function ChartVisualMapSection({
  parsedTable,
}: {
  parsedTable: ParsedTable;
}) {
  const { openTable } = useContext(AppSpreadsheetInteractionContext);
  const { updateTableDecoratorValue } = useTableEditDsl();
  const { sheetName } = useContext(ProjectContext);

  const [checked, setChecked] = useState(false);

  const handleChange = useCallback(() => {
    if (!sheetName) return;

    const { tableName } = parsedTable;

    setChecked(!checked);

    startTransition(() => {
      const message = `${
        checked ? 'Hide' : 'Show'
      } visual map for the chart ${tableName}`;
      updateTableDecoratorValue(
        tableName,
        '',
        showVisualMapDecoratorName,
        message,
        checked
      );
      openTable(sheetName, tableName);
    });
  }, [checked, updateTableDecoratorValue, openTable, parsedTable, sheetName]);

  useEffect(() => {
    if (!parsedTable) return;

    const visualMapVisible = parsedTable.isChartVisualMapVisible();

    setChecked(visualMapVisible);
  }, [parsedTable]);

  return (
    <div className="flex justify-between items-center px-3 pb-4">
      <span className="text-[13px] text-text-primary font-semibold">
        Visual Map
      </span>
      <Switch
        checked={checked}
        checkedChildren="ON"
        unCheckedChildren="OFF"
        onChange={handleChange}
      />
    </div>
  );
}
