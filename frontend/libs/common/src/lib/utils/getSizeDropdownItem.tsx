import { SizeDropdownItem } from '../components';
import { MenuItem } from '../types';

export const getTableBySizeDropdownItem = ({
  key,
  onCreateTable,
}: {
  key: string;
  onCreateTable: (cols: number, rows: number) => void;
}): MenuItem => {
  return {
    key,
    label: <SizeDropdownItem onCreateTable={onCreateTable} />,
  };
};
