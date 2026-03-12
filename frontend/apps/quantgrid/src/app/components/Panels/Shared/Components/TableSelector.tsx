import Select, { GroupBase, SingleValue } from 'react-select';

import { SelectClasses, SelectOption, selectStyles } from '@frontend/common';

interface Props {
  inputName: string;
  selectedTableName: SelectOption | undefined;
  tableNameOptions: { value: string; label: string }[];
  onTableChange: (option: SingleValue<SelectOption>) => void;
}

export const TableSelector = ({
  inputName,
  selectedTableName,
  tableNameOptions,
  onTableChange,
}: Props) => {
  return (
    <Select<SelectOption, false, GroupBase<SelectOption>>
      classNames={SelectClasses}
      components={{
        IndicatorSeparator: null,
      }}
      isSearchable={false}
      menuPortalTarget={document.body}
      menuPosition="fixed"
      name={inputName}
      options={tableNameOptions}
      placeholder="Select source table..."
      styles={selectStyles}
      value={selectedTableName}
      onChange={onTableChange}
    />
  );
};
