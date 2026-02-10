import { useCallback, useContext, useMemo } from 'react';

import {
  InputsContext,
  LayoutContext,
  ProjectContext,
  UndoRedoContext,
} from '../../context';
import {
  useChartEditDsl,
  useControlEditDsl,
  useCreateTableAction,
  useCreateTableDsl,
  useDeleteEntityDsl,
  useDownloadTable,
  useFieldEditDsl,
  useFilterEditDsl,
  useNoteEditDsl,
  useOpenInDetailsPanel,
  useOpenInEditor,
  useOverridesEditDsl,
  usePasteCells,
  usePointClickSelectValue,
  usePromoteRow,
  useRequestDimTable,
  useSortEditDsl,
  useSubmitCellEditor,
  useTableEditDsl,
  useTotalEditDsl,
} from '../../hooks';
import { useAddTableRow } from '../../hooks/EditDsl/useAddTableRow';
import useEventBus from '../../hooks/useEventBus';
import { EventBusMessages } from '../../services';
import { useEditorStore, usePivotStore, useViewStore } from '../../store';
import { useApplySuggestions } from '../ChatWrapper/useApplySuggestion';
import { GridServices } from './types';

interface ChartFunctions {
  getMoreChartKeys: GridServices['getMoreChartKeys'];
  selectChartKey: GridServices['selectChartKey'];
}

interface FilterFunctions {
  onUpdateFieldFilterList: GridServices['onUpdateFieldFilterList'];
}

interface ControlsFunctions {
  onUpdateControlValues: GridServices['onUpdateControlValues'];
  onCloseControl: GridServices['onCloseControl'];
}

export function useGridServices(
  onScroll: GridServices['onScroll'],
  chartFunctions: ChartFunctions,
  filterFunctions: FilterFunctions,
  controlFunctions: ControlsFunctions
) {
  const { onSwitchInput, syncSingleImportField } = useContext(InputsContext);
  const { undo } = useContext(UndoRedoContext);
  const { openPanel, closeAllPanels } = useContext(LayoutContext);
  const { openSheet } = useContext(ProjectContext);

  const changePivotTableWizardMode = usePivotStore(
    (s) => s.changePivotTableWizardMode
  );
  const { switchPointClickMode, setEditMode } = useEditorStore();
  const { updateSelectedCell } = useViewStore();

  const { publish } = useEventBus<EventBusMessages>();
  const { expandDimTable, showRowReference } = useRequestDimTable();
  const { submitCellEditor } = useSubmitCellEditor();
  const { handlePointClickSelectValue } = usePointClickSelectValue();
  const { promoteRow } = usePromoteRow();
  const { changeFieldSort } = useSortEditDsl();
  const { applySuggestion } = useApplySuggestions();
  const { applyListFilter, applyConditionFilter } = useFilterEditDsl();
  const { deleteField, deleteSelectedFieldOrTable } = useDeleteEntityDsl();
  const { createAllTableTotals, createDerivedTable, createManualTable } =
    useCreateTableDsl();
  const { addTableRow, addTableRowToEnd } = useAddTableRow();
  const { pasteCells } = usePasteCells();
  const { getMoreChartKeys, selectChartKey } = chartFunctions;
  const { onUpdateFieldFilterList } = filterFunctions;
  const { onUpdateControlValues, onCloseControl } = controlFunctions;
  const { openInEditor } = useOpenInEditor();
  const { openInDetailsPanel } = useOpenInDetailsPanel();
  const { onCreateTableAction } = useCreateTableAction();
  const {
    addField,
    changeFieldKey,
    changeFieldIndex,
    changeFieldDescription,
    changeFieldDimension,
    onIncreaseFieldColumnSize,
    onDecreaseFieldColumnSize,
    onChangeFieldColumnSize,
    autoFitTableFields,
    removeFieldSizes,
    regenerateAIFunctions,
  } = useFieldEditDsl();
  const {
    arrangeTable,
    cloneTable,
    renameTable,
    convertToTable,
    deleteTable,
    flipTable,
    moveTable,
    moveTableTo,
    swapFieldsByDirection,
    toggleTableTitleOrHeaderVisibility,
  } = useTableEditDsl();
  const {
    removeOverride,
    removeTableOrOverrideRow,
    regenerateOverrideAIFunctions: regenerateOverride,
  } = useOverridesEditDsl();
  const { removeNote, updateNote } = useNoteEditDsl();
  const { addAllFieldTotals, removeTotalByIndex, toggleTotalByType } =
    useTotalEditDsl();
  const { addChart, chartResize, setChartType } = useChartEditDsl();
  const { downloadTable } = useDownloadTable();
  const { updateSelectedControlValue, createControlFromField } =
    useControlEditDsl();

  const onCellEditorUpdateValue = useCallback(
    (value: string, cancelEdit: boolean, dimFieldName?: string) => {
      publish({
        topic: 'CellEditorUpdateValue',
        payload: { value, cancelEdit, dimFieldName },
      });
    },
    [publish]
  );

  const selectionServices = useMemo(
    () => ({
      updateSelectedCell,
      switchPointClickMode,
      handlePointClickSelectValue,
      deleteSelectedFieldOrTable,
    }),
    [
      updateSelectedCell,
      switchPointClickMode,
      handlePointClickSelectValue,
      deleteSelectedFieldOrTable,
    ]
  );

  const viewportServices = useMemo(
    () => ({
      onScroll,
      closeAllPanels,
    }),
    [onScroll, closeAllPanels]
  );

  const editorServices = useMemo(
    () => ({
      setEditMode,
      submitCellEditor,
      onCellEditorUpdateValue,
    }),
    [setEditMode, submitCellEditor, onCellEditorUpdateValue]
  );

  const chartsServices = useMemo(
    () => ({
      changePivotTableWizardMode,
      openPanel,
      addChart,
      chartResize,
      selectChartKey,
      getMoreChartKeys,
      setChartType,
    }),
    [
      changePivotTableWizardMode,
      openPanel,
      addChart,
      chartResize,
      selectChartKey,
      getMoreChartKeys,
      setChartType,
    ]
  );

  const clipboardServices = useMemo(() => ({ pasteCells }), [pasteCells]);

  const tablesServices = useMemo(
    () => ({
      deleteTable,
      moveTable,
      renameTable,
      cloneTable,
      flipTable,
      moveTableTo,
      toggleTableTitleOrHeaderVisibility,
      addTableRow,
      addTableRowToEnd,
      promoteRow,
      arrangeTable,
      downloadTable,
      onSwitchInput,
      syncSingleImportField,
      onCreateTableAction,
      changeFieldDescription,
      createDerivedTable,
      createManualTable,
      expandDimTable,
      showRowReference,
      convertToTable,
    }),
    [
      deleteTable,
      moveTable,
      renameTable,
      cloneTable,
      flipTable,
      moveTableTo,
      toggleTableTitleOrHeaderVisibility,
      addTableRow,
      addTableRowToEnd,
      promoteRow,
      arrangeTable,
      downloadTable,
      onSwitchInput,
      syncSingleImportField,
      onCreateTableAction,
      changeFieldDescription,
      createDerivedTable,
      createManualTable,
      expandDimTable,
      showRowReference,
      convertToTable,
    ]
  );

  const fieldsServices = useMemo(
    () => ({
      deleteField,
      addField,
      swapFieldsByDirection,
      autoFitTableFields,
      removeFieldSizes,
      onIncreaseFieldColumnSize,
      onDecreaseFieldColumnSize,
      onChangeFieldColumnSize,
      changeFieldDimension,
      changeFieldKey,
      changeFieldIndex,
      createControlFromField,
      regenerateAIFunctions,
    }),
    [
      deleteField,
      addField,
      swapFieldsByDirection,
      autoFitTableFields,
      removeFieldSizes,
      onIncreaseFieldColumnSize,
      onDecreaseFieldColumnSize,
      onChangeFieldColumnSize,
      changeFieldDimension,
      changeFieldKey,
      changeFieldIndex,
      createControlFromField,
      regenerateAIFunctions,
    ]
  );

  const totalsServices = useMemo(
    () => ({
      removeTotalByIndex,
      toggleTotalByType,
      addAllFieldTotals,
      createAllTableTotals,
    }),
    [
      removeTotalByIndex,
      toggleTotalByType,
      addAllFieldTotals,
      createAllTableTotals,
    ]
  );

  const controlsServices = useMemo(
    () => ({
      onUpdateControlValues,
      updateSelectedControlValue,
      onCloseControl,
    }),
    [onUpdateControlValues, updateSelectedControlValue, onCloseControl]
  );

  const filtersServices = useMemo(
    () => ({
      applyListFilter,
      applyConditionFilter,
      onUpdateFieldFilterList,
    }),
    [applyListFilter, applyConditionFilter, onUpdateFieldFilterList]
  );

  const overridesServices = useMemo(
    () => ({
      removeOverride,
      removeTableOrOverrideRow,
      regenerateOverride,
    }),
    [regenerateOverride, removeOverride, removeTableOrOverrideRow]
  );

  const notesServices = useMemo(
    () => ({
      updateNote,
      removeNote,
    }),
    [updateNote, removeNote]
  );

  const sortServices = useMemo(() => ({ changeFieldSort }), [changeFieldSort]);

  const systemServices = useMemo(
    () => ({
      undo,
      openSheet,
      openInEditor,
      openInDetailsPanel,
      applySuggestion,
    }),
    [undo, openSheet, openInEditor, openInDetailsPanel, applySuggestion]
  );

  return useMemo(
    () =>
      Object.assign(
        {},
        selectionServices,
        viewportServices,
        editorServices,
        chartsServices,
        clipboardServices,
        tablesServices,
        fieldsServices,
        totalsServices,
        filtersServices,
        controlsServices,
        overridesServices,
        notesServices,
        sortServices,
        systemServices
      ) as Omit<GridServices, 'data'>,
    [
      selectionServices,
      viewportServices,
      editorServices,
      chartsServices,
      clipboardServices,
      tablesServices,
      fieldsServices,
      totalsServices,
      filtersServices,
      controlsServices,
      overridesServices,
      notesServices,
      sortServices,
      systemServices,
    ]
  );
}
