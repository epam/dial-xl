import { useEffect, useState } from 'react';

import Icon from '@ant-design/icons';
import { ArrowNarrowUp } from '@frontend/common';
import { ParsedField, ParsedTable } from '@frontend/parser';

import { FieldNameEdit } from './FieldNameEdit';
import { FieldSizeEdit } from './FieldSizeEdit';
import { FieldSwitchInput } from './FieldSwitchInput';

export function FieldEditSection({
  parsedTable,
  fieldName,
  onReturnBack,
}: {
  parsedTable: ParsedTable;
  fieldName: string;
  onReturnBack: () => void;
}) {
  const [parsedField, setParsedField] = useState<ParsedField | null>(null);

  useEffect(() => {
    if (!fieldName || !parsedTable) return;

    setParsedField(
      parsedTable.fields.find((f) => f.key.fieldName === fieldName) || null
    );
  }, [fieldName, parsedTable]);

  return (
    <div className="flex flex-col items-start px-3">
      <button
        className="flex items-center text-[13px] font-semibold text-text-secondary hover:bg-bg-accent-primary-alpha"
        onClick={onReturnBack}
      >
        <Icon
          className="w-[18px] text-text-secondary -rotate-90 mr-2"
          component={() => <ArrowNarrowUp />}
        />
        <span className="text-[13px] leading-[14px]">Back</span>
      </button>
      {parsedField && (
        <>
          <FieldNameEdit parsedField={parsedField} />
          <FieldSizeEdit parsedField={parsedField} />
          <FieldSwitchInput parsedField={parsedField} />
        </>
      )}
    </div>
  );
}
