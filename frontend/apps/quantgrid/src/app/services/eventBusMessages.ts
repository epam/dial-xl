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

export interface AppendToHistoryMessage {
  historyTitle: string;
  changes: {
    sheetName: string;
    content: string | undefined;
  }[];
}

export interface EventBusMessages {
  CellEditorUpdateValue: CellEditorUpdateValueMessage;
  PointClickSetValue: PointClickSetValue;
  FormulaBarFormulasMenuItemApply: FormulaBarFormulasMenuItemApplyMessage;
  AppendToHistory: AppendToHistoryMessage;
}
