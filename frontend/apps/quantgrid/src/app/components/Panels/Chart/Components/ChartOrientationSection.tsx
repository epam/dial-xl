import { Radio, RadioChangeEvent } from 'antd';
import {
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { ParsedTable } from '@frontend/parser';

import {
  AppSpreadsheetInteractionContext,
  ProjectContext,
} from '../../../../context';
import { useChartEditDsl } from '../../../../hooks';

export type ChartOrientationValues = 'horizontal' | 'vertical';

export function ChartOrientationSection({
  parsedTable,
}: {
  parsedTable: ParsedTable;
}) {
  const { openTable } = useContext(AppSpreadsheetInteractionContext);
  const { updateChartOrientation } = useChartEditDsl();
  const { sheetName } = useContext(ProjectContext);
  const [value, setValue] = useState<ChartOrientationValues>('vertical');

  const onChange = useCallback(
    (e: RadioChangeEvent) => {
      const newValue = e.target.value as ChartOrientationValues;
      setValue(newValue);

      if (!sheetName) return;
      const { tableName } = parsedTable;

      startTransition(() => {
        updateChartOrientation(tableName, newValue);
        openTable(sheetName, tableName);
      });
    },
    [updateChartOrientation, openTable, parsedTable, sheetName]
  );

  useEffect(() => {
    if (!parsedTable) return;

    const chartOrientation = parsedTable.getChartOrientation();

    setValue(chartOrientation);
  }, [parsedTable]);

  return (
    <div className="flex justify-between items-center px-3">
      <Radio.Group
        options={[
          { value: 'horizontal', label: 'Columns' },
          { value: 'vertical', label: 'Rows' },
        ]}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
