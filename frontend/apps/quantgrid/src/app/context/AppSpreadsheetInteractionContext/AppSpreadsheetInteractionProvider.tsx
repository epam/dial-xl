import {
  JSX,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  focusSpreadsheet,
  GridCellEditorEventType,
  GridTable,
} from '@frontend/canvas-spreadsheet';

import { useGridApi, useTableModifyDsl } from '../../hooks';
import { ProjectContext } from '../ProjectContext';
import { ViewportContext } from '../ViewportContext';
import {
  AppSpreadsheetInteractionContext,
  CellEditorOpenOptions,
  OpenFieldSideEffect,
  OpenTableSideEffect,
} from './AppSpreadsheetInteractionContext';

const spreadsheetRenderWait = 500;

export function AppSpreadsheetInteractionContextProvider({
  children,
}: PropsWithChildren<Record<string, unknown>>): JSX.Element {
  const { sheetName, projectName, parsedSheet, openSheet } =
    useContext(ProjectContext);
  const { viewGridData } = useContext(ViewportContext);

  const gridApi = useGridApi();
  const { autoCleanUpTableDSL } = useTableModifyDsl();

  const [tableToOpen, setTableToOpen] = useState<string | null>(null);
  const [fieldToOpen, setFieldToOpen] = useState<string | null>(null);
  const [sheetToOpen, setSheetToOpen] = useState<string | null>(null);
  const [cellEditorOptionsToOpen, setCellEditorOptionsToOpen] =
    useState<CellEditorOpenOptions | null>(null);
  const [openTableSideEffect, setOpenTableSideEffect] =
    useState<OpenTableSideEffect | null>(null);
  const [openFieldSideEffect, setOpenFieldSideEffect] =
    useState<OpenFieldSideEffect | null>(null);
  const [tableToCleanUp, setTableToCleanUp] = useState<string | null>(null);

  const autoCleanUpTable = useCallback((tableName: string) => {
    setTableToCleanUp(tableName);
  }, []);

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

  const openCellEditor = useCallback((options: CellEditorOpenOptions) => {
    setCellEditorOptionsToOpen(options);
  }, []);

  useEffect(() => {
    if (!tableToOpen || !parsedSheet || !gridApi || !sheetName) return;

    if (sheetToOpen && sheetName !== sheetToOpen) return;

    const table = parsedSheet.tables.find((t) => t.tableName === tableToOpen);

    if (!table) return;

    const [row, col] = table.getPlacement();
    const isTableHorizontal = table.getIsTableDirectionHorizontal();
    let structure: GridTable[];
    let tableStructure: GridTable | undefined;

    focusSpreadsheet();

    if (openTableSideEffect) {
      switch (openTableSideEffect) {
        case 'move':
          setTimeout(() => {
            gridApi.moveViewportToCell(col, row, true);

            setTimeout(() => {
              structure = viewGridData.getGridTableStructure();
              tableStructure = structure.find(
                (t) => t.tableName === tableToOpen
              );

              gridApi.updateSelection(
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

          break;
      }
    }

    if (fieldToOpen) {
      const fieldHeaderPlacement = table.getFieldHeaderPlacement(fieldToOpen);

      if (!fieldHeaderPlacement) return;

      const { startCol, startRow, endCol, endRow } = fieldHeaderPlacement;
      structure = viewGridData.getGridTableStructure();
      tableStructure = structure.find((t) => t.tableName === tableToOpen);
      const fieldDataEndRow = tableStructure
        ? isTableHorizontal
          ? endRow
          : tableStructure.endRow
        : endRow;
      const fieldDataEndCol = tableStructure
        ? isTableHorizontal
          ? tableStructure.endCol
          : endCol
        : endCol;

      gridApi.updateSelection({
        startCol,
        startRow,
        endCol: fieldDataEndCol,
        endRow: fieldDataEndRow,
      });

      gridApi.moveViewportToCell(startCol, startRow, true);

      if (openFieldSideEffect) {
        switch (openFieldSideEffect) {
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
      setTimeout(() => {
        structure = viewGridData.getGridTableStructure();
        tableStructure = structure.find((t) => t.tableName === tableToOpen);

        gridApi.moveViewportToCell(col, row, true);

        setTimeout(() => {
          gridApi.updateSelection({
            startCol: col,
            startRow: row,
            endCol: tableStructure ? tableStructure.endCol : col,
            endRow: tableStructure ? tableStructure.endRow : row,
          });
        }, spreadsheetRenderWait);
      }, spreadsheetRenderWait);
    }

    setTableToOpen(null);
    setSheetToOpen(null);
    setOpenTableSideEffect(null);
    setOpenFieldSideEffect(null);
  }, [
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

  useEffect(() => {
    if (!cellEditorOptionsToOpen || !parsedSheet || !gridApi || !sheetName)
      return;

    const { tableName, fieldName, value } = cellEditorOptionsToOpen;

    const table = parsedSheet.tables.find((t) => t.tableName === tableName);

    if (!table) return;

    const field = table.fields.find((f) => f.key.fieldName === fieldName);

    if (!field) return;

    focusSpreadsheet();

    const fieldHeaderPlacement = table.getFieldHeaderPlacement(fieldName);

    if (!fieldHeaderPlacement) return;

    const { startCol, startRow } = fieldHeaderPlacement;

    setTimeout(() => {
      gridApi.moveViewportToCell(startCol, startRow, true);

      gridApi.updateSelection(fieldHeaderPlacement);

      setTimeout(() => {
        gridApi?.showCellEditor(startCol, startRow, value, {
          withFocus: true,
          targetTableName: tableName,
          targetFieldName: fieldName,
        });
      }, spreadsheetRenderWait);
    }, spreadsheetRenderWait);

    setCellEditorOptionsToOpen(null);
  }, [
    cellEditorOptionsToOpen,
    fieldToOpen,
    gridApi,
    parsedSheet,
    sheetName,
    viewGridData,
  ]);

  useEffect(() => {
    if (!tableToCleanUp || !parsedSheet || !gridApi || !sheetName) return;

    autoCleanUpTableDSL(tableToCleanUp);

    setTableToCleanUp(null);
  }, [
    tableToCleanUp,
    parsedSheet,
    sheetName,
    viewGridData,
    gridApi,
    autoCleanUpTable,
    autoCleanUpTableDSL,
  ]);

  const value = useMemo(
    () => ({
      openField,
      openTable,
      openCellEditor,
      autoCleanUpTable,
    }),
    [openField, openTable, openCellEditor, autoCleanUpTable]
  );

  return (
    <AppSpreadsheetInteractionContext.Provider value={value}>
      {children}
    </AppSpreadsheetInteractionContext.Provider>
  );
}
