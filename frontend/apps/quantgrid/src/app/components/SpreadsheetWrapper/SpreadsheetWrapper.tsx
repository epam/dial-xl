import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import isEqual from 'react-fast-compare';

import { dynamicFieldName } from '@frontend/parser';
import {
  Grid,
  GridChart,
  GridData,
  GridService,
  GridTable,
  SelectedCell,
  Spreadsheet,
} from '@frontend/spreadsheet';

import { CachedViewport } from '../../common';
import {
  ApiContext,
  AppContext,
  DynamicFieldsByTable,
  ProjectContext,
  SpreadsheetContext,
  ViewportContext,
} from '../../context';
import {
  useApi,
  useCharts,
  useColumnSizes,
  useManualEditDSL,
  useOverridesManualEditDSL,
  useRequestDimTable,
  useSubmitCellEditor,
} from '../../hooks';
import useEventBus from '../../hooks/useEventBus';
import {
  chunkSize,
  createViewportRequest,
  EventBusMessages,
} from '../../services';
import { buildCharts } from './buildCharts';
import { buildData, removeTables, updateChartsData } from './buildData';
import { createTableStructure } from './createTableStructure';
import { shouldSkipSpreadsheetUpdate } from './shouldSkipSpreadsheetUpdate';

export function SpreadsheetWrapper() {
  const {
    tableData,
    chartData,
    cachedViewport,
    chartKeys,
    updateCachedViewport,
    dynamicFields,
  } = useContext(ViewportContext);
  const { onSpreadsheetMount, gridApi } = useContext(SpreadsheetContext);
  const { zoom } = useContext(AppContext);
  const { projectVersionRef } = useContext(ApiContext);
  const {
    functions,
    projectName,
    sheetName,
    parsedSheet,
    parsedSheets,
    updateSelectedCell,
    sheetErrors,
    compilationErrors,
    openStatusModal,
  } = useContext(ProjectContext);

  const [tableStructure, setTableStructure] = useState<GridTable[]>([]);
  const data = useRef<GridData>({});
  const tablesInData = useRef<Record<string, number>>({});
  const charts = useRef<GridChart[]>([]);
  const viewportRef = useRef<CachedViewport>({
    startRow: 1,
    endRow: 1,
  });
  const lastRequestedViewportOptions = useRef({
    project: '',
    sheet: '',
    version: 0,
    dynamicFields: {},
  });

  const { publish } = useEventBus<EventBusMessages>();
  const { expandDimTable } = useRequestDimTable();
  const { submitCellEditor } = useSubmitCellEditor();
  const { getViewport } = useApi();
  const { columnSizes } = useColumnSizes(viewportRef.current);
  const { addOverride, editOverride, removeOverride } =
    useOverridesManualEditDSL();
  const {
    addChart,
    addDimension,
    addKey,
    chartResize,
    convertToChart,
    convertToTable,
    createDerivedTable,
    deleteField,
    deleteTable,
    editExpression,
    moveTable,
    removeDimension,
    moveTableTo,
    removeKey,
    renameField,
    renameTable,
    swapFields,
  } = useManualEditDSL();
  const { getMoreChartKeys, selectChartKey } = useCharts();

  const onEditExpression = useCallback(
    (tableName: string, fieldName: string, expression: string) => {
      const editTry = editExpression(tableName, fieldName, expression);

      if (!editTry) {
        openStatusModal('Invalid expression.');

        if (gridApi?.isCellEditorOpen()) {
          gridApi?.focusCellEditor();
        }

        return;
      }

      gridApi?.hideCellEditor();
    },
    [editExpression, gridApi, openStatusModal]
  );

  const onCloseTable = useCallback(
    (tableName: string) => {
      deleteTable(tableName);
    },
    [deleteTable]
  );

  const onRenameField = useCallback(
    (tableName: string, oldName: string, newName: string) => {
      renameField(tableName, oldName, newName);

      gridApi?.hideCellEditor();
    },
    [gridApi, renameField]
  );

  const onRenameTable = useCallback(
    (oldName: string, newName: string) => {
      renameTable(oldName, newName);

      gridApi?.hideCellEditor();
    },
    [gridApi, renameTable]
  );

  const onCellEditorUpdateValue = useCallback(
    (value: string, cancelEdit: boolean) => {
      publish({
        topic: 'CellEditorUpdateValue',
        payload: { value, cancelEdit },
      });
    },
    [publish]
  );

  const onCellEditorMessage = useCallback(
    (message: string) => {
      openStatusModal(message);
    },
    [openStatusModal]
  );

  const onSelectionChange = useCallback(
    (selection: SelectedCell | null) => {
      updateSelectedCell(selection);
    },
    [updateSelectedCell]
  );

  const onMount = useCallback(
    (gridApi: Grid, gridService: GridService) => {
      onSpreadsheetMount(gridApi, gridService);
    },
    [onSpreadsheetMount]
  );

  const onScroll = useCallback(
    (
      startCol: number,
      endCol: number,
      startRow: number,
      endRow: number,
      dynamicFields?: DynamicFieldsByTable
    ) => {
      if (!projectName || !parsedSheet?.tables) return;

      viewportRef.current = { startRow, endRow };

      const { viewportRequest, updatedCachedViewport } = createViewportRequest(
        parsedSheet?.tables,
        tableData,
        startCol,
        endCol,
        startRow,
        endRow,
        cachedViewport,
        dynamicFields
      );

      if (Object.keys(viewportRequest).length === 0) return;

      updateCachedViewport({
        ...cachedViewport,
        ...updatedCachedViewport,
      });

      getViewport(projectName, viewportRequest);
    },
    [
      cachedViewport,
      getViewport,
      tableData,
      updateCachedViewport,
      projectName,
      parsedSheet,
    ]
  );

  useEffect(() => {
    if (!sheetName || !projectName) return;
    gridApi?.clearSelection();
  }, [sheetName, projectName, gridApi]);

  useEffect(() => {
    if (!projectName || !sheetName || !parsedSheet) {
      data.current = {};
      charts.current = [];
      setTableStructure([]);

      return;
    }

    const tables = parsedSheet.tables;
    const { sheet } = lastRequestedViewportOptions.current;
    charts.current = buildCharts(tables, projectName);
    data.current = updateChartsData(data.current, tables);

    let shouldSkipUpdateDynamicTable = true;

    tables.forEach((t) => {
      if (
        t.fields.findIndex((f) => f.key.fieldName === dynamicFieldName) !== -1
      ) {
        if (tablesInData.current[t.tableName] !== t.fields.length) {
          shouldSkipUpdateDynamicTable = false;
        }
      }
    });

    if (
      sheetName === sheet &&
      shouldSkipUpdateDynamicTable &&
      shouldSkipSpreadsheetUpdate(
        tables,
        tableData,
        data.current,
        compilationErrors,
        sheetErrors
      )
    ) {
      const currentTables = tables.map((t) => t.tableName).sort();
      const renderedTables = Object.keys(data.current).sort();
      const tableDataIsEmpty = Object.keys(tableData).length === 0;

      if (tableDataIsEmpty && !isEqual(renderedTables, currentTables)) {
        const tablesToRemove = renderedTables.filter(
          (t) => !currentTables.includes(t)
        );
        data.current = removeTables(data.current, tablesToRemove);

        tablesInData.current = {};
        tables.forEach((t) => {
          tablesInData.current[t.tableName] = t.fields.length;
        });
      }

      return;
    }

    tablesInData.current = {};
    tables.forEach((t) => {
      tablesInData.current[t.tableName] = t.fields.length;
    });
    data.current = buildData(tables, tableData, sheetErrors, compilationErrors);
    setTableStructure(createTableStructure(tables, tableData));
  }, [
    parsedSheet,
    compilationErrors,
    sheetErrors,
    tableData,
    projectName,
    sheetName,
    dynamicFields,
  ]);

  useEffect(() => {
    if (!projectName || !sheetName || !parsedSheet?.tables || !gridApi) return;

    const { project, sheet, version } = lastRequestedViewportOptions.current;

    if (
      project === projectName &&
      sheet === sheetName &&
      version === projectVersionRef.current
    )
      return;

    const [startRow, endRow] = gridApi.rowEdges;
    const [startCol, endCol] = gridApi.colEdges;
    const normalizedEndRow =
      endRow && endRow < 10 ? chunkSize : endRow || chunkSize;
    const normalizedEndCol = endCol < 10 ? 100 : endCol;
    onScroll(startCol, normalizedEndCol, startRow, normalizedEndRow);
    lastRequestedViewportOptions.current = {
      project: projectName,
      sheet: sheetName,
      version: projectVersionRef.current || 0,
      dynamicFields: {},
    };
  }, [
    onScroll,
    projectName,
    sheetName,
    parsedSheet,
    projectVersionRef,
    gridApi,
  ]);

  useEffect(() => {
    if (!projectName || !sheetName || !parsedSheet?.tables || !gridApi) return;

    const { dynamicFields: loadedDynamicFields } =
      lastRequestedViewportOptions.current;

    if (isEqual(loadedDynamicFields, dynamicFields)) return;

    const [startRow, endRow] = gridApi.rowEdges;
    const [startCol, endCol] = gridApi.colEdges;
    onScroll(startCol, endCol, startRow, endRow, dynamicFields);
    lastRequestedViewportOptions.current.dynamicFields = dynamicFields;
  }, [
    projectName,
    sheetName,
    gridApi,
    dynamicFields,
    parsedSheet,
    tableData,
    cachedViewport,
    getViewport,
    onScroll,
  ]);

  return (
    <Spreadsheet
      chartData={chartData}
      chartKeys={chartKeys}
      charts={charts.current}
      columnSizes={columnSizes}
      data={data.current}
      functions={functions}
      parsedSheets={parsedSheets}
      tableStructure={tableStructure}
      zoom={zoom}
      onAddChart={addChart}
      onAddDimension={addDimension}
      onAddKey={addKey}
      onAddOverride={addOverride}
      onCellEditorMessage={onCellEditorMessage}
      onCellEditorSubmit={submitCellEditor}
      onCellEditorUpdateValue={onCellEditorUpdateValue}
      onChartResize={chartResize}
      onCloseTable={onCloseTable}
      onConvertToChart={convertToChart}
      onConvertToTable={convertToTable}
      onCreateDerivedTable={createDerivedTable}
      onDeleteField={deleteField}
      onDeleteTable={deleteTable}
      onDNDTable={moveTableTo}
      onEditExpression={onEditExpression}
      onEditOverride={editOverride}
      onExpandDimTable={expandDimTable}
      onGetMoreChartKeys={getMoreChartKeys}
      onMount={onMount}
      onMoveTable={moveTable}
      onRemoveDimension={removeDimension}
      onRemoveKey={removeKey}
      onRemoveOverride={removeOverride}
      onRenameField={onRenameField}
      onRenameTable={onRenameTable}
      onScroll={onScroll}
      onSelectChartKey={selectChartKey}
      onSelectionChange={onSelectionChange}
      onSwapFields={swapFields}
    />
  );
}
