import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  focusSpreadsheet as focusCanvasSpreadsheet,
  GridApi,
} from '@frontend/canvas-spreadsheet';
import {
  focusSpreadsheet,
  Grid,
  GridCellEditorEventType,
  GridSelectionShortcutType,
} from '@frontend/spreadsheet';

import { useGridApi } from '../hooks';
import { AppContext } from './AppContext';
import { ProjectContext } from './ProjectContext';
import { ViewportContext } from './ViewportContext';

export type OpenTableSideEffect = 'move';
export type OpenFieldSideEffect = 'editFormula';
const spreadsheetRenderWait = 500;

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
};

export const AppSpreadsheetInteractionContext =
  createContext<AppSpreadsheetInteractionContextActions>(
    {} as AppSpreadsheetInteractionContextActions
  );

export function AppSpreadsheetInteractionContextProvider({
  children,
}: PropsWithChildren<Record<string, unknown>>): JSX.Element {
  const { sheetName, projectName, parsedSheet, openSheet } =
    useContext(ProjectContext);
  const { viewGridData } = useContext(ViewportContext);

  const gridApi = useGridApi();
  const { canvasSpreadsheetMode } = useContext(AppContext);

  const [tableToOpen, setTableToOpen] = useState<string | null>(null);
  const [fieldToOpen, setFieldToOpen] = useState<string | null>(null);
  const [sheetToOpen, setSheetToOpen] = useState<string | null>(null);
  const [openTableSideEffect, setOpenTableSideEffect] =
    useState<OpenTableSideEffect | null>(null);
  const [openFieldSideEffect, setOpenFieldSideEffect] =
    useState<OpenFieldSideEffect | null>(null);

  const openTable = useCallback(
    (
      openSheetName: string,
      tableName: string,
      sideEffect?: OpenTableSideEffect
    ) => {
      if (!projectName) return;

      if (sheetName !== openSheetName) {
        setSheetToOpen(openSheetName);
        openSheet({ sheetName: openSheetName });
      }

      setTableToOpen(tableName);

      if (sideEffect) {
        setOpenTableSideEffect(sideEffect);
      }
    },
    [openSheet, projectName, sheetName]
  );

  const openField = useCallback(
    (
      openSheetName: string,
      tableName: string,
      fieldName: string,
      sideEffect?: OpenFieldSideEffect
    ) => {
      if (!projectName) return;

      if (sheetName !== openSheetName) {
        setSheetToOpen(openSheetName);
        openSheet({ sheetName: openSheetName });
      }

      setFieldToOpen(fieldName);
      setTableToOpen(tableName);

      if (sideEffect) {
        setOpenFieldSideEffect(sideEffect);
      }
    },
    [openSheet, projectName, sheetName]
  );

  // TODO: remove old grid effects when move to canvas
  useEffect(() => {
    if (!tableToOpen || !parsedSheet || !gridApi || !sheetName) return;

    if (sheetToOpen && sheetName !== sheetToOpen) return;

    const table = parsedSheet.tables.find((t) => t.tableName === tableToOpen);

    if (!table) return;

    const [row, col] = table.getPlacement();
    let structure;
    let tableStructure;

    if (canvasSpreadsheetMode) {
      focusCanvasSpreadsheet();
    } else {
      focusSpreadsheet();
    }

    if (openTableSideEffect) {
      switch (openTableSideEffect) {
        case 'move':
          if (canvasSpreadsheetMode) {
            setTimeout(() => {
              (gridApi as GridApi).moveViewportToCell(col, row);

              setTimeout(() => {
                structure = viewGridData.getGridTableStructure();
                tableStructure = structure.find(
                  (t) => t.tableName === tableToOpen
                );

                (gridApi as GridApi).updateSelection(
                  {
                    startCol: col,
                    startRow: row,
                    endCol: tableStructure ? tableStructure.endCol : col,
                    endRow: tableStructure ? tableStructure.endRow : row,
                  },
                  { selectedTable: tableToOpen }
                );
              }, spreadsheetRenderWait);
            }, spreadsheetRenderWait);
          } else {
            setTimeout(() => {
              gridApi.updateSelection({
                startCol: col,
                startRow: row,
                endCol: col,
                endRow: row,
              });
              (gridApi as Grid).sendSelectionEvent({
                type: GridSelectionShortcutType.SelectAll,
              });
            }, spreadsheetRenderWait);
          }
          break;
      }
    }

    if (fieldToOpen) {
      const fieldIndex = table.fields.findIndex(
        (f) => f.key.fieldName === fieldToOpen
      );

      if (fieldIndex === -1) return;
      const startCol = col + fieldIndex;
      const startRow = row + table.getTableNameHeaderHeight();
      const fieldSize = table.fields[fieldIndex].getSize();

      gridApi.updateSelection({
        startCol,
        startRow,
        endCol: startCol + fieldSize - 1,
        endRow: startRow,
      });

      if (openFieldSideEffect) {
        switch (openFieldSideEffect) {
          case 'editFormula':
            setTimeout(() => {
              if (canvasSpreadsheetMode) {
                (gridApi as GridApi).moveViewportToCell(col, row);
              }

              setTimeout(() => {
                gridApi.cellEditorEvent$.next({
                  type: GridCellEditorEventType.Edit,
                  col: startCol,
                  row: startRow,
                });
              }, spreadsheetRenderWait);
            }, spreadsheetRenderWait);
            break;
        }
      }

      setFieldToOpen(null);
      setTableToOpen(null);
      setSheetToOpen(null);
      setOpenTableSideEffect(null);
      setOpenFieldSideEffect(null);

      return;
    }

    if (!openTableSideEffect) {
      structure = viewGridData.getGridTableStructure();
      tableStructure = structure.find((t) => t.tableName === tableToOpen);

      if (canvasSpreadsheetMode) {
        (gridApi as GridApi).moveViewportToCell(col, row);
      }

      gridApi.updateSelection({
        startCol: col,
        startRow: row,
        endCol: tableStructure ? tableStructure.endCol : col,
        endRow: row,
      });
    }

    setTableToOpen(null);
    setSheetToOpen(null);
    setOpenTableSideEffect(null);
    setOpenFieldSideEffect(null);
  }, [
    canvasSpreadsheetMode,
    fieldToOpen,
    gridApi,
    openFieldSideEffect,
    openTableSideEffect,
    parsedSheet,
    sheetName,
    sheetToOpen,
    tableToOpen,
    viewGridData,
  ]);

  const value = useMemo(
    () => ({
      openField,
      openTable,
    }),
    [openField, openTable]
  );

  return (
    <AppSpreadsheetInteractionContext.Provider value={value}>
      {children}
    </AppSpreadsheetInteractionContext.Provider>
  );
}
