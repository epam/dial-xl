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
  focusSpreadsheet,
  Grid,
  GridCellEditorEventType,
  GridSelectionShortcutType,
  GridService,
} from '@frontend/spreadsheet';

import { useOpenWorksheet } from '../hooks';
import { ProjectContext } from './ProjectContext';

export type OpenTableSideEffect = 'rename' | 'move';
export type OpenFieldSideEffect = 'rename' | 'editFormula';
const spreadsheetRenderWait = 300;

type SpreadsheetContextActions = {
  onSpreadsheetMount: (gridApi: Grid, gridService: GridService) => void;
  gridService: GridService | null;
  gridApi: Grid | null;

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

export const SpreadsheetContext = createContext<SpreadsheetContextActions>(
  {} as SpreadsheetContextActions
);

export function SpreadsheetContextProvider({
  children,
}: PropsWithChildren<Record<string, unknown>>): JSX.Element {
  const [gridService, setGridService] = useState<GridService | null>(null);

  const { sheetName, projectName, parsedSheet } = useContext(ProjectContext);
  const openWorksheet = useOpenWorksheet();

  const [gridApi, setGridApi] = useState<Grid | null>(null);

  const [tableToOpen, setTableToOpen] = useState<string | null>(null);
  const [fieldToOpen, setFieldToOpen] = useState<string | null>(null);
  const [sheetToOpen, setSheetToOpen] = useState<string | null>(null);
  const [openTableSideEffect, setOpenTableSideEffect] =
    useState<OpenTableSideEffect | null>(null);
  const [openFieldSideEffect, setOpenFieldSideEffect] =
    useState<OpenFieldSideEffect | null>(null);

  const onSpreadsheetMount = useCallback(
    (gridApi: Grid, gridService: GridService | null) => {
      setGridService(gridService);
      setGridApi(gridApi);
    },
    []
  );

  const openTable = useCallback(
    (
      openSheetName: string,
      tableName: string,
      sideEffect?: OpenTableSideEffect
    ) => {
      if (!projectName) return;

      if (sheetName !== openSheetName) {
        setSheetToOpen(openSheetName);
        openWorksheet(projectName, openSheetName);
      }

      setTableToOpen(tableName);

      if (sideEffect) {
        setOpenTableSideEffect(sideEffect);
      }
    },
    [openWorksheet, projectName, sheetName]
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
        openWorksheet(projectName, openSheetName);
      }

      setFieldToOpen(fieldName);
      setTableToOpen(tableName);

      if (sideEffect) {
        setOpenFieldSideEffect(sideEffect);
      }
    },
    [openWorksheet, projectName, sheetName]
  );

  const value = useMemo(
    () => ({
      onSpreadsheetMount,
      gridService,
      gridApi,
      openField,
      openTable,
    }),
    [onSpreadsheetMount, gridService, gridApi, openField, openTable]
  );

  useEffect(() => {
    if (!tableToOpen || !parsedSheet || !gridApi || !sheetName) return;

    if (sheetToOpen && sheetName !== sheetToOpen) return;

    const table = parsedSheet.tables.find((t) => t.tableName === tableToOpen);

    if (!table) return;

    const [row, col] = table.getPlacement();

    focusSpreadsheet();

    if (openTableSideEffect) {
      switch (openTableSideEffect) {
        case 'rename':
          setTimeout(() => {
            gridApi.cellEditorEvent$.next({
              type: GridCellEditorEventType.Rename,
              col,
              row,
            });
          }, spreadsheetRenderWait);
          break;

        case 'move':
          setTimeout(() => {
            gridApi.updateSelection({
              startCol: col,
              startRow: row,
              endCol: col,
              endRow: row,
            });
            gridApi.sendSelectionEvent({
              type: GridSelectionShortcutType.SelectAll,
            });
          }, spreadsheetRenderWait);
          break;
      }
    }

    if (fieldToOpen) {
      const fieldIndex = table.fields.findIndex(
        (f) => f.key.fieldName === fieldToOpen
      );

      if (fieldIndex === -1) return;
      const startCol = col + fieldIndex;
      const startRow = row + 1;

      gridApi.updateSelection({
        startCol,
        startRow,
        endCol: startCol,
        endRow: startRow,
      });

      if (openFieldSideEffect) {
        switch (openFieldSideEffect) {
          case 'rename':
            setTimeout(() => {
              gridApi.cellEditorEvent$.next({
                type: GridCellEditorEventType.Rename,
                col: startCol,
                row: startRow,
              });
            }, spreadsheetRenderWait);
            break;
          case 'editFormula':
            setTimeout(() => {
              gridApi.cellEditorEvent$.next({
                type: GridCellEditorEventType.Edit,
                col: startCol,
                row: startRow,
              });
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
      gridApi.updateSelection({
        startCol: col,
        startRow: row,
        endCol: col,
        endRow: row,
      });
    }

    setTableToOpen(null);
    setSheetToOpen(null);
    setOpenTableSideEffect(null);
    setOpenFieldSideEffect(null);
  }, [
    fieldToOpen,
    gridApi,
    gridService,
    openFieldSideEffect,
    openTableSideEffect,
    parsedSheet,
    sheetName,
    sheetToOpen,
    tableToOpen,
  ]);

  return (
    <SpreadsheetContext.Provider value={value}>
      {children}
    </SpreadsheetContext.Provider>
  );
}
