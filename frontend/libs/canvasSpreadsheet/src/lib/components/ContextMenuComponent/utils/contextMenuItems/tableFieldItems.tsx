import Icon from '@ant-design/icons';
import {
  FormulaIcon,
  getDropdownDivider,
  getDropdownItem,
  getDropdownMenuKey,
  GridListFilter,
  Header2Icon,
  isComplexType,
  isFeatureFlagEnabled,
  isNumericType,
  isTextType,
  Shortcut,
  shortcutApi,
  TableArrowIcon,
  TagIcon,
} from '@frontend/common';

import { GridCallbacks, GridCell } from '../../../../types';
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
  switchInput,
  totalItem,
} from './commonItem';

export const getTableFieldMenuItems = (
  col: number,
  row: number,
  cell: GridCell,
  gridCallbacks: GridCallbacks,
  filterList: GridListFilter[]
) => {
  const { field, table } = cell;

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
    hasOverrides: fieldHasOverrides,
  } = field;

  const isNumeric = isNumericType(type);
  const isText = isTextType(type);
  const isComplex = isComplexType(field) || isNested;
  const isComplexOrDynamic = isComplex || isDynamic;
  const filterType = isNumeric ? 'numeric' : isText ? 'text' : null;
  const showCollapseNestedField = !isManual && isDim;
  const showExpandNestedField =
    !isManual && !isDim && (isNested || isPeriodSeries);
  const isChart = !!chartType;
  const isShowAIPrompt = isFeatureFlagEnabled('askAI');

  const isFieldHasOverrides = cell
    ? cell.isOverride || fieldHasOverrides
    : false;

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
          className="text-text-secondary w-[18px]"
          component={() => (
            <TableArrowIcon secondaryAccentCssVar="text-accent-secondary" />
          )}
        />
      ),
    }),
    getDropdownDivider(),
    !isComplexOrDynamic ? sortItem(col, row, isNumeric) : null,
    filterType && !isComplexOrDynamic
      ? filterItem(col, row, cell, gridCallbacks, filterList)
      : null,
    totalItem(col, row, totalFieldTypes, isComplex),
    !isComplexOrDynamic ? getDropdownDivider() : null,
    getDropdownItem({
      label: 'Edit formula',
      key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.editFormula, {
        col,
        row,
      }),
      icon: (
        <Icon
          className="text-text-accent-primary w-[18px]"
          component={() => <FormulaIcon />}
        />
      ),
      shortcut: shortcutApi.getLabel(Shortcut.EditExpression),
    }),
    isInput ? switchInput(col, row) : null,
    getDropdownItem({
      label: 'Rename column',
      key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.renameField, {
        col,
        row,
      }),
      icon: (
        <Icon
          className="text-text-secondary w-[18px]"
          component={() => <Header2Icon />}
        />
      ),
      shortcut: shortcutApi.getLabel(Shortcut.Rename),
      disabled: isDynamic,
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
    showCollapseNestedField || showExpandNestedField
      ? dimensionItem(col, row, showCollapseNestedField, isDynamic)
      : null,
    getDropdownDivider(),
    insertItem(col, row, isTableHorizontal, isManual),
    deleteItem(col, row, table, false),
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
      icon: (
        <Icon
          className="text-text-secondary w-[18px]"
          component={() => <TagIcon />}
        />
      ),
      key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.openFieldInEditor, {
        col,
        row,
      }),
    }),
  ];
};
