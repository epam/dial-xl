import classNames from 'classnames';
import { useCallback, useEffect, useState } from 'react';

import Icon from '@ant-design/icons';
import { EditIcon } from '@frontend/common';
import { ParsedField, ParsedTable } from '@frontend/parser';

import { FieldEditSection } from './FieldEditSection';

export function TableFieldsSection({
  parsedTable,
}: {
  parsedTable: ParsedTable;
}) {
  const [fields, setFields] = useState<ParsedField[]>([]);
  const [selectedField, setSelectedField] = useState<string | null>(null);

  const onFieldClick = useCallback((field: ParsedField) => {
    setSelectedField(field.key.fieldName);
  }, []);

  const handleReturnBack = useCallback(() => {
    setSelectedField(null);
  }, []);

  useEffect(() => {
    setFields(parsedTable.getFieldsWithoutDynamicVirtual());
  }, [parsedTable]);

  useEffect(() => {
    if (
      selectedField &&
      !parsedTable.fields.find(({ key }) => key.fieldName === selectedField)
    ) {
      setSelectedField(null);
    }
  }, [parsedTable, selectedField]);

  return (
    <div className="flex flex-col items-start px-3">
      {selectedField && (
        <FieldEditSection
          fieldName={selectedField}
          parsedTable={parsedTable}
          onReturnBack={handleReturnBack}
        />
      )}
      {!selectedField && (
        <div
          className={classNames(
            'h-full w-full flex flex-col gap-2 bg-bg-layer-2 border rounded-[3px] p-2'
          )}
        >
          {fields.map((field) => (
            <div
              className={classNames(
                'px-2 py-1 rounded-[3px] text-[13px] flex items-center bg-bg-layer-4 cursor-pointer hover:opacity-80 group'
              )}
              key={field.key.fieldName}
              onClick={() => onFieldClick(field)}
            >
              <span className="truncate text-[13px] font-medium min-w-0 flex-1">
                {field.key.fieldName}
              </span>

              <Icon
                className="w-[18px] text-text-secondary shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                component={() => <EditIcon />}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
