import { SelectedCellType } from '@frontend/spreadsheet';

type Prop = {
  fieldName?: string;
  type?: SelectedCellType;
};

export function FormulaInputTitle({ fieldName, type }: Prop) {
  return (
    <span className="text-sm px-2 leading-none select-none text-ellipsis inline-block overflow-hidden w-full whitespace-nowrap">
      {type === SelectedCellType.Table && fieldName ? fieldName : 'Formula'}:
    </span>
  );
}
