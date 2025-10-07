import { Button } from 'antd';
import cx from 'classnames';
import { useContext, useMemo } from 'react';

import { primaryButtonClasses } from '@frontend/common';
import { ParsedField } from '@frontend/parser';

import { InputsContext } from '../../../../context';
import { isInputFormula } from '../../../../hooks';

export function FieldSwitchInput({
  parsedField,
}: {
  parsedField: ParsedField;
}) {
  const { onSwitchInput } = useContext(InputsContext);

  const isInput = useMemo(() => {
    return isInputFormula(parsedField?.expressionMetadata?.text || '');
  }, [parsedField]);

  if (!isInput) return null;

  return (
    <Button
      className={cx('h-[28px] my-4 px-4 text-[13px]', primaryButtonClasses)}
      onClick={() =>
        onSwitchInput(parsedField.key.tableName, parsedField.key.fieldName)
      }
    >
      Switch Input
    </Button>
  );
}
