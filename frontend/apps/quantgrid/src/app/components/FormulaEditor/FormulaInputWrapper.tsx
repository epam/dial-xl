import { Button } from 'antd';
import { useContext, useEffect, useState } from 'react';

import { DownOutlined, UpOutlined } from '@ant-design/icons';
import { SelectedCellType } from '@frontend/spreadsheet';

import { ProjectContext } from '../../context';
import { useDSLUtils } from '../../hooks';
import styles from './FormulaEditor.module.scss';
import { FormulaInput } from './FormulaInput';
import { useFormulaInput } from './utils';

type InputField = {
  fieldName: string;
  initialValue: string | null;
};

type Props = {
  expanded: boolean;
  onExpand: () => void;
};

export function FormulaInputWrapper({ onExpand, expanded }: Props) {
  const { selectedCell } = useContext(ProjectContext);
  const [fields, setFields] = useState<InputField[]>([]);
  const [singleInputValue, setSingleInputValue] = useState('');
  const [inputDisabled, setInputDisabled] = useState(true);
  const { findTable } = useDSLUtils();
  const { getSelectedCellValue, isFormulaInputDisabled } = useFormulaInput();

  useEffect(() => {
    const { Cell, Field, Override, Table, EmptyCell } = SelectedCellType;

    if (
      !selectedCell ||
      [Cell, Field, Override, EmptyCell].includes(selectedCell.type)
    ) {
      setFields([]);
      setSingleInputValue(
        getSelectedCellValue(selectedCell, selectedCell?.fieldName) || ''
      );
      setInputDisabled(isFormulaInputDisabled(selectedCell));

      return;
    }

    if (selectedCell.type === Table && selectedCell.value) {
      const table = findTable(selectedCell.value);

      if (!table) {
        setFields([]);
        setSingleInputValue(
          getSelectedCellValue(selectedCell, selectedCell?.fieldName) || ''
        );
        setInputDisabled(isFormulaInputDisabled(selectedCell));

        return;
      }

      const fields: InputField[] = [];

      table.fields.forEach((f) => {
        if (f.isDim) {
          const { fieldName } = f.key;
          const initialValue = getSelectedCellValue(selectedCell, fieldName);

          fields.push({
            fieldName,
            initialValue,
          });
        }
      });

      setFields(fields);

      if (fields.length === 0) {
        setInputDisabled(true);
      }
    }
  }, [findTable, getSelectedCellValue, isFormulaInputDisabled, selectedCell]);

  return (
    <>
      {fields.map(({ fieldName, initialValue }) => (
        <FormulaInput
          disabled={false}
          expanded={expanded}
          fieldName={fieldName}
          initialValue={initialValue}
          key={fieldName}
        />
      ))}

      {fields.length === 0 && (
        <FormulaInput
          disabled={inputDisabled}
          expanded={expanded}
          initialValue={singleInputValue}
        />
      )}

      <div className={styles.ExpandButton}>
        <Button
          icon={expanded ? <UpOutlined /> : <DownOutlined />}
          onClick={onExpand}
        />
      </div>
    </>
  );
}
