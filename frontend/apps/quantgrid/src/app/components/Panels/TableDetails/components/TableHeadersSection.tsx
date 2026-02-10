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

export function TableHeadersSection({
  parsedTable,
}: {
  parsedTable: ParsedTable;
}) {
  const { openTable } = useContext(AppSpreadsheetInteractionContext);
  const { toggleTableTitleOrHeaderVisibility } = useTableEditDsl();
  const { sheetName } = useContext(ProjectContext);

  const [tableHeaderChecked, setTableHeaderChecked] = useState(false);
  const [fieldHeaderChecked, setFieldHeaderChecked] = useState(false);

  const handleChange = useCallback(
    (toggleTableHeader: boolean) => {
      if (!sheetName) return;

      const { tableName } = parsedTable;

      if (toggleTableHeader) {
        setTableHeaderChecked(!tableHeaderChecked);
      } else {
        setFieldHeaderChecked(!fieldHeaderChecked);
      }

      startTransition(() => {
        toggleTableTitleOrHeaderVisibility(tableName, toggleTableHeader);
        openTable(sheetName, tableName);
      });
    },
    [
      sheetName,
      parsedTable,
      tableHeaderChecked,
      fieldHeaderChecked,
      toggleTableTitleOrHeaderVisibility,
      openTable,
    ]
  );

  useEffect(() => {
    if (!parsedTable) return;

    const tableHeaderHidden = parsedTable.getIsTableHeaderHidden();
    const fieldsHidden = parsedTable.getIsTableFieldsHidden();

    setTableHeaderChecked(!tableHeaderHidden);
    setFieldHeaderChecked(!fieldsHidden);
  }, [parsedTable]);

  return (
    <div className="flex flex-col items-start px-3">
      <div className="flex items-center mb-2">
        <span className="min-w-[120px] text-[13px] text-text-primary">
          Table header
        </span>
        <Switch
          checked={tableHeaderChecked}
          checkedChildren="ON"
          unCheckedChildren="OFF"
          onChange={() => handleChange(true)}
        />
      </div>
      <div className="flex items-center mb-2">
        <span className="min-w-[120px] text-[13px] text-text-primary">
          Field headers
        </span>
        <Switch
          checked={fieldHeaderChecked}
          checkedChildren="ON"
          unCheckedChildren="OFF"
          onChange={() => handleChange(false)}
        />
      </div>
    </div>
  );
}
