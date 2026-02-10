import Select, { SingleValue } from 'react-select';

import { SelectClasses, selectStyles } from '@frontend/common';
import { DefaultOptionType } from '@rc-component/select/lib/Select';

interface Props {
  selectedTableName: DefaultOptionType | undefined;
  tableNameOptions: { value: string; label: string }[];
  onTableChange: (option: SingleValue<DefaultOptionType>) => void;
}

export const TableSelector = ({
  selectedTableName,
  tableNameOptions,
  onTableChange,
}: Props) => {
  return (
    <Select
      classNames={SelectClasses}
      components={{
        IndicatorSeparator: null,
      }}
      isSearchable={false}
      menuPortalTarget={document.body}
      menuPosition="fixed"
      name="pivotTableNameSelect"
      options={tableNameOptions}
      placeholder="Select source table..."
      styles={selectStyles}
      value={selectedTableName}
      onChange={onTableChange}
    />
  );
};
