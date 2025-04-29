import Icon from '@ant-design/icons';
import {
  EditFilledIcon,
  getDropdownDivider,
  getDropdownItem,
  getDropdownMenuKey,
  GridCell,
  GridListFilter,
  HeaderIcon,
  isComplexType,
  isFeatureFlagEnabled,
  isNumericType,
  isOtherCellsInFieldDataHasOverrides,
  isTextType,
  OverrideIcon,
  Shortcut,
  shortcutApi,
  TableArrowIcon,
  TagIcon,
  TotalOffIcon,
} from '@frontend/common';
import { naExpression } from '@frontend/parser';

import { GridApi, GridCallbacks } from '../../../../types';
import { spreadsheetMenuKeys as menuKey } from '../config';
import { ContextMenuKeyData } from '../types';
import {
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
  orientationItem,
  sortItem,
  totalItem,
} from './commonItem';

export const getTableCellMenuItems = (
  col: number,
  row: number,
  cell: GridCell,
  gridCallbacks: GridCallbacks,
  filterList: GridListFilter[],
  gridApi: GridApi | null
) => {
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
  } = field;

  const isNumeric = isNumericType(type);
  const isText = isTextType(type);
  const filterType = isNumeric ? 'numeric' : isText ? 'text' : null;
  const isComplex = isComplexType(field) || isNested || isDynamic;
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
    ? cell.isOverride ||
      isOtherCellsInFieldDataHasOverrides(cell, gridApi?.getCell)
    : false;

  const filterSortItems = [
    !isComplex ? sortItem(col, row, isNumeric) : null,
    filterType && !isComplex
      ? filterItem(col, row, cell, gridCallbacks, filterList)
      : null,
    totalItem(col, row, totalFieldTypes, isComplex),
  ].filter(Boolean);

  return [
    isShowAIPrompt ? askAIItem(col, row) : null,
    isShowAIPrompt ? getDropdownDivider() : null,
    getDropdownItem({
      label: 'Move table',
      key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.moveTable, {
        col,
        row,
      }),
      icon: (
        <Icon
          className="text-textSecondary w-[18px]"
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
      key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.editFormula, {
        col,
        row,
      }),
      icon: (
        <Icon
          className="text-textSecondary w-[18px]"
          component={() => (
            <EditFilledIcon secondaryAccentCssVar="text-accent-primary" />
          )}
        />
      ),
      shortcut: shortcutApi.getLabel(Shortcut.Rename),
    }),
    fieldTagsItem(
      col,
      row,
      isKey,
      isDynamic,
      isManual,
      isFieldHasOverrides,
      isIndex,
      isDescription,
      isText,
      fieldNames
    ),
    showPromoteRow
      ? getDropdownItem({
          label: 'Set header',
          key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.promoteRow, {
            col,
            row,
          }),
          icon: (
            <Icon
              className="text-textSecondary w-[18px]"
              component={() => <HeaderIcon />}
            />
          ),
        })
      : null,
    isOverrideOutliner
      ? getDropdownItem({
          label: 'Remove Override Cell',
          key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.removeOverride, {
            col,
            row,
          }),
          icon: (
            <Icon
              className="text-textSecondary w-[18px]"
              component={() => (
                <OverrideIcon secondaryAccentCssVar="text-accent-secondary" />
              )}
            />
          ),
          shortcut: shortcutApi.getLabel(Shortcut.Delete),
        })
      : null,
    showCollapseNestedField || showExpandNestedField
      ? dimensionItem(col, row, showCollapseNestedField, isDynamic)
      : null,
    totalIndex && totalExpression
      ? getDropdownItem({
          key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.removeTotal, {
            col,
            row,
          }),
          label: 'Remove total',
          icon: (
            <Icon
              className="text-textAccentTertiary w-[18px]"
              component={() => <TotalOffIcon />}
            />
          ),
          shortcut: shortcutApi.getLabel(Shortcut.Delete),
        })
      : null,
    getDropdownDivider(),
    insertItem(col, row, isTableHorizontal, isManual),
    deleteItem(col, row, table, true),
    fieldItem(col, row, cell, table, isDynamic),
    getDropdownDivider(),
    noteEditItem(col, row, note),
    note ? noteRemoveItem(col, row) : null,
    getDropdownDivider(),
    arrangeTableItems(col, row),
    !isChart ? orientationItem(col, row, isTableHorizontal) : null,
    hideItem(
      col,
      row,
      isTableNameHeaderHidden,
      isTableFieldsHeaderHidden,
      isChart
    ),
    getDropdownDivider(),
    getDropdownItem({
      label: 'Open in Editor',
      key: getDropdownMenuKey<ContextMenuKeyData>(
        isOverride ? menuKey.openOverrideInEditor : menuKey.openFieldInEditor,
        { col, row }
      ),
      icon: (
        <Icon
          className="text-textSecondary w-[18px]"
          component={() => <TagIcon />}
        />
      ),
    }),
  ];
};
