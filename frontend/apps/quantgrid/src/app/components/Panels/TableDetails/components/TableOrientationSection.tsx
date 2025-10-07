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
import { useTableEditDsl } from '../../../../hooks';

type OrientationValues = 'horizontal' | 'vertical';

export function TableOrientationSection({
  parsedTable,
}: {
  parsedTable: ParsedTable;
}) {
  const { openTable } = useContext(AppSpreadsheetInteractionContext);
  const { flipTable } = useTableEditDsl();
  const { sheetName } = useContext(ProjectContext);
  const [value, setValue] = useState<OrientationValues>('vertical');

  const onChange = useCallback(
    (e: RadioChangeEvent) => {
      const newValue = e.target.value as OrientationValues;
      setValue(newValue);

      if (!sheetName) return;
      const { tableName } = parsedTable;

      startTransition(() => {
        flipTable(tableName);
        openTable(sheetName, tableName);
      });
    },
    [flipTable, openTable, parsedTable, sheetName]
  );

  useEffect(() => {
    if (!parsedTable) return;

    const isHorizontal = parsedTable.getIsTableDirectionHorizontal();

    setValue(isHorizontal ? 'horizontal' : 'vertical');
  }, [parsedTable]);

  return (
    <div className="flex justify-between items-center px-3">
      <Radio.Group
        options={[
          { value: 'horizontal', label: 'Horizontal' },
          { value: 'vertical', label: 'Vertical' },
        ]}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
