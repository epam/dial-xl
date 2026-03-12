import { SelectOption } from '@frontend/common';
import { ControlType } from '@frontend/parser';

export type TableOption = {
  value: string;
  label: string;
  fields: SelectOption[];
};

export enum ControlWizardCollapseSection {
  TableName = 'tableName',
  Location = 'location',
  Controls = 'controls',
}

export type ControlRow = {
  type: ControlType | null;
  name: string;
  dependency?: string | null;
  valueTable: string | null;
  valueField: string | null;
};
export type ControlWizardForm = {
  controlName: string;
  startRow?: number;
  startColumn?: number;
  controls?: ControlRow[];
};

export type ControlWizardSaveProps = {
  index: number;
  data: ControlRow;
  changedKeys: (keyof ControlRow)[];
  isNew: boolean;
};
