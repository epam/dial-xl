import { Shortcut, shortcutApi } from '@frontend/common';

import { getDropdownDivider, getDropdownItem } from './getDropdownItem';

export const spreadsheetMenuKeys = {
  addOverride: 'AddOverride',
  removeOverride: 'RemoveOverride',
  editOverride: 'EditOverride',
  createDerivedTable: 'CreateDerivedTable',
  deleteField: 'DeleteField',
  deleteTable: 'DeleteTable',
  editFormula: 'EditFormula',
  moveTable: 'MoveTable',
  renameField: 'RenameField',
  renameTable: 'RenameTable',
  swapLeft: 'SwapLeft',
  swapRight: 'SwapRight',
  addKey: 'AddKey',
  removeKey: 'RemoveKey',
  addDimension: 'AddDimension',
  removeDimension: 'RemoveDimension',
  convertToChart: 'ConvertToChart',
  convertToTable: 'ConvertToTable',
  addChart: 'AddChart',
};

const getContextMenuKey = (action: string, col: number, row: number) =>
  JSON.stringify({
    action,
    col,
    row,
  });

export const getTableHeaderMenuItems = (
  col: number,
  row: number,
  isChart: boolean
) => {
  return [
    getDropdownItem({
      label: 'Rename table',
      key: getContextMenuKey(spreadsheetMenuKeys.renameTable, col, row),
      shortcut: shortcutApi.getLabel(Shortcut.Rename),
    }),
    getDropdownItem({
      label: 'Delete table',
      key: getContextMenuKey(spreadsheetMenuKeys.deleteTable, col, row),
      shortcut: shortcutApi.getLabel(Shortcut.Delete),
    }),
    getDropdownItem({
      label: 'Move table',
      key: getContextMenuKey(spreadsheetMenuKeys.moveTable, col, row),
    }),
    getDropdownItem({
      label: 'Create derived table',
      key: getContextMenuKey(spreadsheetMenuKeys.createDerivedTable, col, row),
    }),
    getDropdownDivider(),
    getDropdownItem({
      label: isChart ? 'Convert to table' : 'Convert to chart',
      key: getContextMenuKey(
        isChart
          ? spreadsheetMenuKeys.convertToTable
          : spreadsheetMenuKeys.convertToChart,
        col,
        row
      ),
    }),
    !isChart
      ? getDropdownItem({
          label: 'Add chart',
          key: getContextMenuKey(spreadsheetMenuKeys.addChart, col, row),
        })
      : null,
  ];
};

export const getTableFieldMenuItems = (
  col: number,
  row: number,
  isKey: boolean,
  isDim: boolean,
  isDynamic: boolean,
  isManual?: boolean
) => {
  return [
    getDropdownItem({
      label: 'Swap left',
      key: getContextMenuKey(spreadsheetMenuKeys.swapLeft, col, row),
      shortcut: shortcutApi.getLabel(Shortcut.SwapFieldsLeft),
    }),
    getDropdownItem({
      label: 'Swap right',
      key: getContextMenuKey(spreadsheetMenuKeys.swapRight, col, row),
      shortcut: shortcutApi.getLabel(Shortcut.SwapFieldsRight),
    }),
    getDropdownItem({
      label: 'Rename field',
      key: getContextMenuKey(spreadsheetMenuKeys.renameField, col, row),
      shortcut: shortcutApi.getLabel(Shortcut.Rename),
      disabled: isDynamic,
    }),
    getDropdownItem({
      label: 'Delete field',
      key: getContextMenuKey(spreadsheetMenuKeys.deleteField, col, row),
      shortcut: shortcutApi.getLabel(Shortcut.Delete),
    }),
    getDropdownItem({
      label: 'Edit formula',
      key: getContextMenuKey(spreadsheetMenuKeys.editFormula, col, row),
      shortcut: shortcutApi.getLabel(Shortcut.EditExpression),
    }),
    getDropdownDivider(),
    getDropdownItem({
      label: isKey ? 'Remove key' : 'Add key',
      key: getContextMenuKey(
        isKey ? spreadsheetMenuKeys.removeKey : spreadsheetMenuKeys.addKey,
        col,
        row
      ),
      disabled: isDynamic,
    }),
    !isManual
      ? getDropdownItem({
          label: isDim ? 'Remove dimension' : 'Add dimension',
          key: getContextMenuKey(
            isDim
              ? spreadsheetMenuKeys.removeDimension
              : spreadsheetMenuKeys.addDimension,
            col,
            row
          ),
          disabled: isDynamic,
        })
      : null,
  ];
};

export const getTableCellMenuItems = (
  col: number,
  row: number,
  isOverride: boolean
) => {
  return [
    getDropdownItem({
      label: isOverride ? 'Edit override' : 'Add override',
      key: getContextMenuKey(
        isOverride
          ? spreadsheetMenuKeys.editOverride
          : spreadsheetMenuKeys.addOverride,
        col,
        row
      ),
    }),
    getDropdownItem({
      label: 'Remove override',
      key: getContextMenuKey(spreadsheetMenuKeys.removeOverride, col, row),
      disabled: !isOverride,
    }),
  ];
};
