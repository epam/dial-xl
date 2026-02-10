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
import {
  escapeFieldName,
  ParsedField,
  unescapeFieldName,
} from '@frontend/parser';

import {
  AppSpreadsheetInteractionContext,
  ProjectContext,
} from '../../../../context';
import { useRenameFieldDsl } from '../../../../hooks';

export function FieldNameEdit({ parsedField }: { parsedField: ParsedField }) {
  const { openTable } = useContext(AppSpreadsheetInteractionContext);
  const { sheetName } = useContext(ProjectContext);
  const { renameField } = useRenameFieldDsl();
  const [inputFieldName, setInputFieldName] = useState<string>('');

  const onFieldNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setInputFieldName(event.target.value);
    },
    []
  );

  const handleRenameField = useCallback(() => {
    const { tableName, fieldName } = parsedField.key;
    const isSameField = escapeFieldName(inputFieldName) === fieldName;

    if (!sheetName || !inputFieldName || isSameField) return;

    renameField(tableName, fieldName, inputFieldName);

    openTable(sheetName, tableName);
  }, [inputFieldName, openTable, parsedField, renameField, sheetName]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== KeyboardCode.Escape) return;

      setInputFieldName(unescapeFieldName(parsedField.key.fieldName));
    },
    [parsedField]
  );

  useEffect(() => {
    setInputFieldName(unescapeFieldName(parsedField.key.fieldName));
  }, [parsedField]);

  return (
    <div className="flex items-center mt-4">
      <span className="min-w-[70px] text-[13px] text-text-primary">Name</span>
      <Input
        className={cx('h-7 text-[13px]', inputClasses)}
        id="fieldNameInput"
        placeholder="Column name"
        value={inputFieldName}
        onBlur={handleRenameField}
        onChange={onFieldNameChange}
        onKeyDown={handleKeyDown}
        onPressEnter={handleRenameField}
      />
    </div>
  );
}
