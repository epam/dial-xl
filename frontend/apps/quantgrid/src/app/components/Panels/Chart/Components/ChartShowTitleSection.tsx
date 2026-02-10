import { Switch } from 'antd';
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

export function ChartShowTitleSection({
  parsedTable,
}: {
  parsedTable: ParsedTable;
}) {
  const { openTable } = useContext(AppSpreadsheetInteractionContext);
  const { toggleTableTitleOrHeaderVisibility } = useTableEditDsl();
  const { sheetName } = useContext(ProjectContext);

  const [checked, setChecked] = useState(false);

  const handleChange = useCallback(() => {
    if (!sheetName) return;

    const { tableName } = parsedTable;

    setChecked(!checked);

    startTransition(() => {
      toggleTableTitleOrHeaderVisibility(tableName, true);
      openTable(sheetName, tableName);
    });
  }, [
    checked,
    toggleTableTitleOrHeaderVisibility,
    openTable,
    parsedTable,
    sheetName,
  ]);

  useEffect(() => {
    if (!parsedTable) return;

    const titleHidden = parsedTable.getIsTableHeaderHidden();

    setChecked(!titleHidden);
  }, [parsedTable]);

  return (
    <div className="flex justify-between items-center px-3 py-4">
      <span className="text-[13px] text-text-primary font-semibold">Title</span>
      <Switch
        checked={checked}
        checkedChildren="ON"
        unCheckedChildren="OFF"
        onChange={handleChange}
      />
    </div>
  );
}
