import { DimensionalSchemaResponse } from '@frontend/common';

export interface ApiResponseMessage {
  data: MessageEvent<string>['data'];
}

export interface CellEditorUpdateValueMessage {
  value: string;
  cancelEdit: boolean;
  dimFieldName?: string;
}

export interface PointClickSetValue {
  value: string;
}

export interface FormulaBarFormulasMenuItemApplyMessage {
  formulaName: string;
}

export interface EventBusMessages {
  CellEditorUpdateValue: CellEditorUpdateValueMessage;
  DimensionalSchemaResponse: DimensionalSchemaResponse;
  PointClickSetValue: PointClickSetValue;
  FormulaBarFormulasMenuItemApply: FormulaBarFormulasMenuItemApplyMessage;
}
