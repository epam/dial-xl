import { useCallback } from 'react';

import { GridBusEvent } from '@frontend/canvas-spreadsheet';

import { PanelName } from '../../common';
import { useStatusModalStore } from '../../store';
import { getSelectedCell } from '../../utils';
import { GridServices } from './types';

export function useGridEvents() {
  const handleSelectionEvent = useCallback(
    (ev: GridBusEvent, s: GridServices) => {
      switch (ev.type) {
        case 'selection/changed': {
          s.updateSelectedCell(getSelectedCell(ev.payload, s.data));
          break;
        }
        case 'selection/point-click-started': {
          s.switchPointClickMode(true, 'cell-editor');
          break;
        }
        case 'selection/point-click-stopped': {
          s.switchPointClickMode(false);
          break;
        }
        case 'selection/point-click-value-picked': {
          s.handlePointClickSelectValue(null, ev.payload);
          break;
        }
        case 'selection/delete': {
          s.deleteSelectedFieldOrTable();
          break;
        }
        default: {
          // eslint-disable-next-line no-console
          console.warn('Unknown event:', ev.type);
          break;
        }
      }
    },
    []
  );

  const handleViewportEvent = useCallback(
    (ev: GridBusEvent, s: GridServices) => {
      switch (ev.type) {
        case 'viewport/scrolled': {
          const { startCol, endCol, startRow, endRow } = ev.payload;
          s.onScroll({
            startCol,
            endCol,
            startRow,
            endRow,
            withCompilation: true,
          });
          break;
        }
        case 'viewport/expand': {
          s.closeAllPanels();
          break;
        }
        default: {
          // eslint-disable-next-line no-console
          console.warn('Unknown event:', ev.type);
          break;
        }
      }
    },
    []
  );

  const handleEditorEvent = useCallback((ev: GridBusEvent, s: GridServices) => {
    switch (ev.type) {
      case 'editor/value-updated': {
        s.onCellEditorUpdateValue(
          ev.payload.value,
          ev.payload.cancelEdit,
          ev.payload.dimFieldName
        );
        break;
      }
      case 'editor/mode-changed': {
        s.setEditMode(ev.payload);
        break;
      }
      case 'editor/submit': {
        const shouldHide = s.submitCellEditor(ev.payload);
        ev.reply(shouldHide);
        break;
      }
      default: {
        // eslint-disable-next-line no-console
        console.warn('Unknown event:', ev.type);
        break;
      }
    }
  }, []);

  const handleChartsEvent = useCallback((ev: GridBusEvent, s: GridServices) => {
    switch (ev.type) {
      case 'charts/dblclick': {
        s.changePivotTableWizardMode(null);
        s.openPanel(PanelName.Details);
        break;
      }
      case 'charts/add': {
        s.addChart(ev.payload.tableName, ev.payload.chartType);
        break;
      }
      case 'charts/resize': {
        s.chartResize(ev.payload.tableName, ev.payload.cols, ev.payload.rows);
        break;
      }
      case 'charts/select-key': {
        s.selectChartKey(
          ev.payload.tableName,
          ev.payload.fieldName,
          ev.payload.key,
          ev.payload.isNoDataKey
        );
        break;
      }
      case 'charts/get-keys': {
        s.getMoreChartKeys(ev.payload.tableName, ev.payload.fieldName);
        break;
      }
      case 'charts/insert': {
        s.addChart(
          ev.payload.tableName,
          ev.payload.chartType,
          ev.payload.col,
          ev.payload.row
        );
        break;
      }
      default: {
        // eslint-disable-next-line no-console
        console.warn('Unknown event:', ev.type);
        break;
      }
    }
  }, []);

  const handleClipboardEvent = useCallback(
    (ev: GridBusEvent, s: GridServices) => {
      switch (ev.type) {
        case 'clipboard/paste': {
          s.pasteCells(ev.payload.cells);
          break;
        }
        default: {
          // eslint-disable-next-line no-console
          console.warn('Unknown event:', ev.type);
          break;
        }
      }
    },
    []
  );
  const handleTablesEvent = useCallback((ev: GridBusEvent, s: GridServices) => {
    switch (ev.type) {
      case 'tables/delete': {
        s.deleteTable(ev.payload.tableName);
        break;
      }
      case 'tables/move': {
        s.moveTable(
          ev.payload.tableName,
          ev.payload.rowDelta,
          ev.payload.colDelta
        );
        break;
      }
      case 'tables/rename': {
        s.renameTable(ev.payload.oldName, ev.payload.newName);
        break;
      }
      case 'tables/clone': {
        s.cloneTable(ev.payload.tableName);
        break;
      }
      case 'tables/flip': {
        s.flipTable(ev.payload.tableName);
        break;
      }
      case 'tables/dnd': {
        s.moveTableTo(ev.payload.tableName, ev.payload.row, ev.payload.col);
        break;
      }
      case 'tables/toggle-title-or-header-visibility': {
        s.toggleTableTitleOrHeaderVisibility(
          ev.payload.tableName,
          ev.payload.toggleTableHeader
        );
        break;
      }
      case 'tables/add-row': {
        s.addTableRow(
          ev.payload.col,
          ev.payload.row,
          ev.payload.tableName,
          ev.payload.value
        );
        break;
      }
      case 'tables/add-row-to-end': {
        s.addTableRowToEnd(ev.payload.tableName, ev.payload.value);
        break;
      }
      case 'tables/promote-row': {
        s.promoteRow(ev.payload.tableName, ev.payload.dataIndex);
        break;
      }
      case 'tables/arrange': {
        s.arrangeTable(ev.payload.tableName, ev.payload.arrangeType);
        break;
      }
      case 'tables/download': {
        s.downloadTable(ev.payload.tableName);
        break;
      }
      case 'tables/switch-input': {
        s.onSwitchInput(ev.payload.tableName, ev.payload.fieldName);
        break;
      }
      case 'tables/sync-single-import-field': {
        s.syncSingleImportField(ev.payload.tableName, ev.payload.fieldName);
        break;
      }
      case 'tables/create-action': {
        s.onCreateTableAction(
          ev.payload.action,
          ev.payload.type,
          ev.payload.insertFormula,
          ev.payload.tableName
        );
        break;
      }
      case 'tables/change-description': {
        s.changeFieldDescription(
          ev.payload.tableName,
          ev.payload.fieldName,
          ev.payload.descriptionFieldName,
          ev.payload.isRemove
        );
        break;
      }
      case 'tables/create-derived': {
        s.createDerivedTable(ev.payload.tableName);
        break;
      }
      case 'tables/create-manual': {
        s.createManualTable(
          ev.payload.col,
          ev.payload.row,
          ev.payload.cells,
          ev.payload.hideTableHeader,
          ev.payload.hideFieldHeader,
          ev.payload.customTableName
        );
        break;
      }
      case 'tables/expand-dim': {
        s.expandDimTable(
          ev.payload.tableName,
          ev.payload.fieldName,
          ev.payload.col,
          ev.payload.row
        );
        break;
      }
      case 'tables/show-row-ref': {
        s.showRowReference(
          ev.payload.tableName,
          ev.payload.fieldName,
          ev.payload.col,
          ev.payload.row
        );
        break;
      }
      case 'tables/convert-to-table': {
        s.convertToTable(ev.payload.tableName);
        break;
      }
      case 'tables/convert-to-chart': {
        s.setChartType(ev.payload.tableName, ev.payload.chartType);
        break;
      }
      default: {
        // eslint-disable-next-line no-console
        console.warn('Unknown event:', ev.type);
        break;
      }
    }
  }, []);

  const handleFieldsEvent = useCallback((ev: GridBusEvent, s: GridServices) => {
    switch (ev.type) {
      case 'fields/delete': {
        s.deleteField(ev.payload.tableName, ev.payload.fieldName);
        break;
      }
      case 'fields/add': {
        s.addField(
          ev.payload.tableName,
          ev.payload.fieldText,
          ev.payload.insertOptions
        );
        break;
      }
      case 'fields/swap': {
        s.swapFieldsByDirection(
          ev.payload.tableName,
          ev.payload.fieldName,
          ev.payload.direction
        );
        break;
      }
      case 'fields/auto-fit': {
        s.autoFitTableFields(ev.payload.tableName);
        break;
      }
      case 'fields/remove-sizes': {
        s.removeFieldSizes(ev.payload.tableName);
        break;
      }
      case 'fields/increase-size': {
        s.onIncreaseFieldColumnSize(ev.payload.tableName, ev.payload.fieldName);
        break;
      }
      case 'fields/decrease-size': {
        s.onDecreaseFieldColumnSize(ev.payload.tableName, ev.payload.fieldName);
        break;
      }
      case 'fields/change-size': {
        s.onChangeFieldColumnSize(
          ev.payload.tableName,
          ev.payload.fieldName,
          ev.payload.valueAdd
        );
        break;
      }
      case 'fields/change-dimension': {
        s.changeFieldDimension(
          ev.payload.tableName,
          ev.payload.fieldName,
          ev.payload.isRemove
        );
        break;
      }
      case 'fields/change-key': {
        s.changeFieldKey(
          ev.payload.tableName,
          ev.payload.fieldName,
          ev.payload.isRemove
        );
        break;
      }
      case 'fields/change-index': {
        s.changeFieldIndex(
          ev.payload.tableName,
          ev.payload.fieldName,
          ev.payload.isRemove
        );
        break;
      }
      case 'fields/create-control-from-field': {
        s.createControlFromField(
          ev.payload.tableName,
          ev.payload.fieldName,
          ev.payload.type
        );
        break;
      }
      case 'fields/ai-regenerate': {
        s.regenerateAIFunctions(ev.payload.tableName, ev.payload.fieldName);
        break;
      }
      default: {
        // eslint-disable-next-line no-console
        console.warn('Unknown event:', ev.type);
        break;
      }
    }
  }, []);

  const handleTotalsEvent = useCallback((ev: GridBusEvent, s: GridServices) => {
    switch (ev.type) {
      case 'totals/remove-by-index': {
        s.removeTotalByIndex(
          ev.payload.tableName,
          ev.payload.fieldName,
          ev.payload.index
        );
        break;
      }
      case 'totals/toggle-by-type': {
        s.toggleTotalByType(
          ev.payload.tableName,
          ev.payload.fieldName,
          ev.payload.type
        );
        break;
      }
      case 'totals/add-all-field-totals': {
        s.addAllFieldTotals(ev.payload.tableName, ev.payload.fieldName);
        break;
      }
      case 'totals/add-all-table-totals': {
        s.createAllTableTotals(ev.payload.tableName);
        break;
      }
      default: {
        // eslint-disable-next-line no-console
        console.warn('Unknown event:', ev.type);
        break;
      }
    }
  }, []);
  const handleFiltersEvent = useCallback(
    (ev: GridBusEvent, s: GridServices) => {
      switch (ev.type) {
        case 'filters/list-applied': {
          s.applyListFilter(
            ev.payload.tableName,
            ev.payload.fieldName,
            ev.payload.values,
            ev.payload.isNumeric
          );
          break;
        }
        case 'filters/condition-applied': {
          s.applyConditionFilter(
            ev.payload.tableName,
            ev.payload.fieldName,
            ev.payload.operator,
            ev.payload.value,
            ev.payload.filterType
          );
          break;
        }
        case 'filters/update-list': {
          s.onUpdateFieldFilterList(ev.payload);
          break;
        }
        default: {
          // eslint-disable-next-line no-console
          console.warn('Unknown event:', ev.type);
          break;
        }
      }
    },
    []
  );
  const handleControlEvent = useCallback(
    (ev: GridBusEvent, s: GridServices) => {
      switch (ev.type) {
        case 'control/get-values': {
          s.onUpdateControlValues(ev.payload);
          break;
        }
        case 'control/apply': {
          s.updateSelectedControlValue(
            ev.payload.tableName,
            ev.payload.fieldName,
            ev.payload.values
          );
          break;
        }
        case 'control/close': {
          s.onCloseControl();
          break;
        }
        default: {
          // eslint-disable-next-line no-console
          console.warn('Unknown event:', ev.type);
          break;
        }
      }
    },
    []
  );
  const handleNotesEvent = useCallback((ev: GridBusEvent, s: GridServices) => {
    switch (ev.type) {
      case 'notes/update': {
        s.updateNote(ev.payload);
        break;
      }
      case 'notes/remove': {
        s.removeNote(ev.payload.tableName, ev.payload.fieldName);
        break;
      }
      default: {
        // eslint-disable-next-line no-console
        console.warn('Unknown event:', ev.type);
        break;
      }
    }
  }, []);
  const handleOverridesEvent = useCallback(
    (ev: GridBusEvent, s: GridServices) => {
      switch (ev.type) {
        case 'overrides/remove': {
          s.removeOverride(
            ev.payload.tableName,
            ev.payload.fieldName,
            ev.payload.overrideIndex,
            ev.payload.value
          );
          break;
        }
        case 'overrides/remove-row': {
          s.removeTableOrOverrideRow(
            ev.payload.tableName,
            ev.payload.overrideIndex
          );
          break;
        }
        case 'overrides/ai-regenerate': {
          s.regenerateOverride(
            ev.payload.tableName,
            ev.payload.fieldName,
            ev.payload.overrideIndex
          );
          break;
        }
        default: {
          // eslint-disable-next-line no-console
          console.warn('Unknown event:', ev.type);
          break;
        }
      }
    },
    []
  );
  const handleSortEvent = useCallback((ev: GridBusEvent, s: GridServices) => {
    switch (ev.type) {
      case 'sort/change': {
        s.changeFieldSort(
          ev.payload.tableName,
          ev.payload.fieldName,
          ev.payload.order
        );
        break;
      }
      default: {
        // eslint-disable-next-line no-console
        console.warn('Unknown event:', ev.type);
        break;
      }
    }
  }, []);
  const handleSystemEvent = useCallback((ev: GridBusEvent, s: GridServices) => {
    switch (ev.type) {
      case 'system/message': {
        useStatusModalStore.getState().open(ev.payload);
        break;
      }
      case 'system/undo': {
        s.undo();
        break;
      }
      case 'system/open-sheet': {
        s.openSheet(ev.payload.args);
        break;
      }
      case 'system/open-details-panel': {
        s.openInDetailsPanel(ev.payload.tableName);
        break;
      }
      case 'system/open-in-editor': {
        s.openInEditor(
          ev.payload.tableName,
          ev.payload.fieldName,
          ev.payload.openOverride
        );
        break;
      }
      case 'system/apply-suggestion': {
        s.applySuggestion(ev.payload.GPTSuggestions, ev.payload.GPTFocusColumn);
        break;
      }
      default: {
        // eslint-disable-next-line no-console
        console.warn('Unknown event:', ev.type);
        break;
      }
    }
  }, []);

  return useCallback(
    (ev: GridBusEvent, s?: GridServices) => {
      if (!s) return;

      if (ev.type.startsWith('selection/')) return handleSelectionEvent(ev, s);
      if (ev.type.startsWith('viewport/')) return handleViewportEvent(ev, s);
      if (ev.type.startsWith('editor/')) return handleEditorEvent(ev, s);
      if (ev.type.startsWith('charts/')) return handleChartsEvent(ev, s);
      if (ev.type.startsWith('clipboard/')) return handleClipboardEvent(ev, s);
      if (ev.type.startsWith('tables/')) return handleTablesEvent(ev, s);
      if (ev.type.startsWith('fields/')) return handleFieldsEvent(ev, s);
      if (ev.type.startsWith('totals/')) return handleTotalsEvent(ev, s);
      if (ev.type.startsWith('filters/')) return handleFiltersEvent(ev, s);
      if (ev.type.startsWith('control/')) return handleControlEvent(ev, s);
      if (ev.type.startsWith('notes/')) return handleNotesEvent(ev, s);
      if (ev.type.startsWith('overrides/')) return handleOverridesEvent(ev, s);
      if (ev.type.startsWith('sort/')) return handleSortEvent(ev, s);
      if (ev.type.startsWith('system/')) return handleSystemEvent(ev, s);
    },
    [
      handleChartsEvent,
      handleClipboardEvent,
      handleEditorEvent,
      handleFieldsEvent,
      handleFiltersEvent,
      handleNotesEvent,
      handleOverridesEvent,
      handleSelectionEvent,
      handleSortEvent,
      handleSystemEvent,
      handleTablesEvent,
      handleTotalsEvent,
      handleViewportEvent,
      handleControlEvent,
    ]
  );
}
