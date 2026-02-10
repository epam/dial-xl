import { createContext } from 'react';

export type CellEditorOpenOptions = {
  tableName: string;
  fieldName: string;
  value: string;
};

export type OpenTableSideEffect = 'move';
export type OpenFieldSideEffect = 'editFormula';

type AppSpreadsheetInteractionContextActions = {
  openTable: (
    sheetName: string,
    tableName: string,
    sideEffect?: OpenTableSideEffect
  ) => void;
  openField: (
    sheetName: string,
    tableName: string,
    fieldName: string,
    sideEffect?: OpenFieldSideEffect
  ) => void;
  openCellEditor: (options: CellEditorOpenOptions) => void;
  autoCleanUpTable: (tableName: string) => void;
};

export const AppSpreadsheetInteractionContext =
  createContext<AppSpreadsheetInteractionContextActions>(
    {} as AppSpreadsheetInteractionContextActions
  );
