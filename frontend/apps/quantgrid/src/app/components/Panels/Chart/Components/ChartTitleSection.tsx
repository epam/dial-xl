import { Input } from 'antd';
import cx from 'classnames';
import {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { inputClasses, KeyboardCode } from '@frontend/common';
import { escapeTableName, unescapeTableName } from '@frontend/parser';

import {
  AppSpreadsheetInteractionContext,
  ProjectContext,
} from '../../../../context';
import { useTableEditDsl } from '../../../../hooks';

export function ChartTitleSection({ tableName }: { tableName: string }) {
  const { openTable } = useContext(AppSpreadsheetInteractionContext);
  const { sheetName } = useContext(ProjectContext);
  const { renameTable } = useTableEditDsl();
  const [inputTableName, setInputTableName] = useState<string>('');

  const onTableNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setInputTableName(event.target.value);
    },
    []
  );

  const handleRenameTable = useCallback(() => {
    const isSameTable = escapeTableName(inputTableName) === tableName;
    const isNumbers = /^[0-9]+$/.test(inputTableName);

    if (!sheetName || !inputTableName || isSameTable || isNumbers) return;

    const updatedTableName = renameTable(tableName, inputTableName);

    if (!updatedTableName) return;

    openTable(sheetName, updatedTableName);
  }, [inputTableName, openTable, renameTable, sheetName, tableName]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== KeyboardCode.Escape) return;

      setInputTableName(unescapeTableName(tableName));
    },
    [tableName]
  );

  useEffect(() => {
    setInputTableName(unescapeTableName(tableName));
  }, [tableName]);

  return (
    <Input
      className={cx('h-7 text-[13px]', inputClasses)}
      id="chartTitle"
      placeholder="Chart title"
      value={inputTableName}
      onBlur={handleRenameTable}
      onChange={onTableNameChange}
      onKeyDown={handleKeyDown}
      onPressEnter={handleRenameTable}
    />
  );
}
