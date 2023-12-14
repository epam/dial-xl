import {
  COLUMN_INDICATOR,
  COLUMN_MENU_ITEM,
  COLUMNS_AUTOSIZE,
  COMMON_COMPONENT,
  CONTEXT_MENU_ITEM,
  DATA_SCROLLER,
  SUMMARY_ROW,
  TOTAL_ROW,
} from '@deltix/grid-it';
import { PluginComponent } from '@deltix/grid-it-core';

export const COMPONENT_MAPPING: Record<PluginComponent, symbol> = {
  [PluginComponent.columnMenu]: COLUMN_MENU_ITEM,
  [PluginComponent.dataScroller]: DATA_SCROLLER,
  [PluginComponent.columnIndicator]: COLUMN_INDICATOR,
  [PluginComponent.common]: COMMON_COMPONENT,
  [PluginComponent.contextMenuItem]: CONTEXT_MENU_ITEM,
  [PluginComponent.summary]: SUMMARY_ROW,
  [PluginComponent.totals]: TOTAL_ROW,
  [PluginComponent.columnsAutosize]: COLUMNS_AUTOSIZE,
};

export const COMPONENT_TYPES = new Set<string>(Object.values(PluginComponent));

export const SELECTION_SERVICE = Symbol.for('SelectionService');
export const CELL_EDITOR_SERVICE = Symbol.for('CellEditorService');
export const ROW_NUMBER_SERVICE = Symbol.for('PinnedRowNumberService');
