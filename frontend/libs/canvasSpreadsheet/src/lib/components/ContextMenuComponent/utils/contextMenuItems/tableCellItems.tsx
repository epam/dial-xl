import { ItemType } from 'antd/es/menu/interface';

import Icon from '@ant-design/icons';
import {
  EditFilledIcon,
  getDropdownDivider,
  getDropdownItem,
  getDropdownMenuKey,
  GridListFilter,
  HeaderIcon,
  isComplexType,
  isFeatureFlagEnabled,
  isNumericType,
  isTextType,
  OverrideIcon,
  Shortcut,
  shortcutApi,
  TableArrowIcon,
  TotalOffIcon,
} from '@frontend/common';
import { naExpression } from '@frontend/parser';

import { GridCell, SheetControl } from '../../../../types';
import { GridEventBus } from '../../../../utils';
import { spreadsheetMenuKeys as menuKey } from '../config';
import { ContextMenuKeyData } from '../types';
import {
  aiRegenerateItem,
  arrangeTableItems,
  askAIItem,
  deleteItem,
  dimensionItem,
  fieldItem,
  fieldTagsItem,
  filterItem,
  hideItem,
  insertItem,
  noteEditItem,
  noteRemoveItem,
  openDetails,
  orientationItem,
  sortItem,
  switchInput,
  syncImport,
  totalItem,
} from './commonItem';

const tableCellMenuPath = ['TableCellMenu'];

export const getTableCellMenuItems = ({
  col,
  row,
  cell,
  eventBus,
  filterList,
  sheetControls,
  onClose,
}: {
  col: number;
  row: number;
  cell: GridCell;
  eventBus: GridEventBus;
  filterList: GridListFilter[];
  sheetControls: SheetControl[];
  onClose: () => void;
}): ItemType[] => {
  const { field, table, totalIndex, totalExpression } = cell;

  if (!table || !field) return [];

  const {
    isTableNameHeaderHidden,
    isTableFieldsHeaderHidden,
    isTableHorizontal,
    chartType,
    isManual,
    fieldNames,
  } = table;
  const {
    isKey,
    isDim,
    isDynamic,
    isNested,
    isPeriodSeries,
    note,
    type,
    totalFieldTypes,
    isIndex,
    isDescription,
    isInput,
    isImport,
    hasOverrides: fieldHasOverrides,
    isControl,
  } = field;

  const isNumeric = isNumericType(type);
  const isText = isTextType(type);
  const filterType = isNumeric ? 'numeric' : isText ? 'text' : null;
  const isComplex = isComplexType(field) || isNested;
  const isComplexOrDynamic = isComplex || isDynamic;
  const showCollapseNestedField = !isManual && isDim;
  const showExpandNestedField =
    !isManual && !isDim && (isNested || isPeriodSeries);
  const isOverride = cell.isOverride;
  const isOverrideOutliner =
    cell.isOverride && cell.field?.expression !== naExpression;
  const showPromoteRow =
    isManual && isTableFieldsHeaderHidden && isTableNameHeaderHidden;
  const isChart = !!chartType;
  const isShowAIPrompt = isFeatureFlagEnabled('askAI');

  const isFieldHasOverrides = cell
    ? cell.isOverride || fieldHasOverrides
    : false;

  const filterSortItems: ItemType[] = [
    !isComplexOrDynamic && !isControl
      ? sortItem(col, row, tableCellMenuPath, isNumeric)
      : null,
    filterType && !isComplexOrDynamic && !isControl
      ? filterItem({
          col,
          row,
          parentPath: tableCellMenuPath,
          cell,
          eventBus,
          filterList,
          sheetControls,
          onClose,
        })
      : null,
    !isControl
      ? totalItem(col, row, tableCellMenuPath, totalFieldTypes, isComplex)
      : null,
  ].filter(Boolean);

  const hasAIFunction = cell.overrideAIFunctions || field?.isAIFunctions;

  return [
    isShowAIPrompt ? askAIItem(col, row, tableCellMenuPath) : null,
    hasAIFunction ? aiRegenerateItem(col, row, tableCellMenuPath) : null,
    isShowAIPrompt || hasAIFunction ? getDropdownDivider() : null,
    getDropdownItem({
      label: 'Move table',
      fullPath: [...tableCellMenuPath, 'MoveTable'],
      key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.moveTable, {
        col,
        row,
      }),
      shortcut: shortcutApi.getLabel(Shortcut.SelectAll),
      icon: (
        <Icon
          className="text-text-secondary w-[18px]"
          component={() => (
            <TableArrowIcon secondaryAccentCssVar="text-accent-secondary" />
          )}
        />
      ),
    }),
    getDropdownDivider(),
    ...filterSortItems,
    filterSortItems.length > 0 ? getDropdownDivider() : null,
    getDropdownItem({
      label: 'Edit Cell',
      fullPath: [...tableCellMenuPath, 'EditCell'],
      key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.editFormula, {
        col,
        row,
      }),
      icon: (
        <Icon
          className="text-text-secondary w-[18px]"
          component={() => (
            <EditFilledIcon secondaryAccentCssVar="text-accent-primary" />
          )}
        />
      ),
      shortcut: shortcutApi.getLabel(Shortcut.Rename),
    }),
    isInput ? switchInput(col, row, tableCellMenuPath) : null,
    isImport ? syncImport(col, row, tableCellMenuPath) : null,
    !isControl
      ? fieldTagsItem(
          col,
          row,
          tableCellMenuPath,
          isKey,
          isDynamic,
          isManual,
          isFieldHasOverrides,
          isIndex,
          isDescription,
          isText,
          fieldNames,
        )
      : null,
    showPromoteRow
      ? getDropdownItem({
          label: 'Set header',
          fullPath: [...tableCellMenuPath, 'SetHeader'],
          key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.promoteRow, {
            col,
            row,
          }),
          icon: (
            <Icon
              className="text-text-secondary w-[18px]"
              component={() => <HeaderIcon />}
            />
          ),
        })
      : null,
    isOverrideOutliner
      ? getDropdownItem({
          label: 'Remove Override Cell',
          fullPath: [...tableCellMenuPath, 'RemoveOverrideCell'],
          key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.removeOverride, {
            col,
            row,
          }),
          icon: (
            <Icon
              className="text-text-secondary w-[18px]"
              component={() => (
                <OverrideIcon secondaryAccentCssVar="text-accent-secondary" />
              )}
            />
          ),
          shortcut: shortcutApi.getLabel(Shortcut.Delete),
        })
      : null,
    showCollapseNestedField || showExpandNestedField
      ? dimensionItem(
          col,
          row,
          tableCellMenuPath,
          showCollapseNestedField,
          isDynamic,
        )
      : null,
    totalIndex && totalExpression
      ? getDropdownItem({
          key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.removeTotal, {
            col,
            row,
          }),
          fullPath: [...tableCellMenuPath, 'RemoveTotal'],
          label: 'Remove total',
          icon: (
            <Icon
              className="text-text-accent-tertiary w-[18px]"
              component={() => <TotalOffIcon />}
            />
          ),
          shortcut: shortcutApi.getLabel(Shortcut.Delete),
        })
      : null,
    getDropdownDivider(),
    insertItem(col, row, tableCellMenuPath, isTableHorizontal, isManual),
    deleteItem(col, row, tableCellMenuPath, table, true),
    fieldItem(col, row, tableCellMenuPath, cell, table, isDynamic),
    getDropdownDivider(),
    noteEditItem(col, row, tableCellMenuPath, note),
    note ? noteRemoveItem(col, row, tableCellMenuPath) : null,
    getDropdownDivider(),
    arrangeTableItems(col, row, tableCellMenuPath),
    !isChart
      ? orientationItem(col, row, tableCellMenuPath, isTableHorizontal)
      : null,
    hideItem(
      col,
      row,
      tableCellMenuPath,
      isTableNameHeaderHidden,
      isTableFieldsHeaderHidden,
      isChart,
    ),
    getDropdownDivider(),
    ...(openDetails(col, row, tableCellMenuPath, false, isOverride) || []),
  ];
};
