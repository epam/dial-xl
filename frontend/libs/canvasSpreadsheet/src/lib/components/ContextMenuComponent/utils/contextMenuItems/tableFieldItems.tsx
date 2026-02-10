import { ItemType } from 'antd/es/menu/interface';

import Icon from '@ant-design/icons';
import {
  CheckboxControlIcon,
  DropdownControlIcon,
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
} from '@frontend/common';

import { GridCell } from '../../../../types';
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
  moveTable,
  noteEditItem,
  noteRemoveItem,
  openDetails,
  orientationItem,
  sortItem,
  switchInput,
  syncImport,
  totalItem,
} from './commonItem';

export const getTableFieldMenuItems = (
  col: number,
  row: number,
  cell: GridCell,
  eventBus: GridEventBus,
  filterList: GridListFilter[]
): ItemType[] => {
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
    isImport,
    hasOverrides: fieldHasOverrides,
    isControl,
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

  const hasAIFunction = field?.isAIFunctions;

  return [
    isShowAIPrompt ? askAIItem(col, row) : null,
    hasAIFunction ? aiRegenerateItem(col, row) : null,
    isShowAIPrompt || hasAIFunction ? getDropdownDivider() : null,
    moveTable(col, row, isChart),
    getDropdownDivider(),
    !isComplexOrDynamic && !isControl ? sortItem(col, row, isNumeric) : null,
    filterType && !isControl && !isComplexOrDynamic
      ? filterItem(col, row, cell, eventBus, filterList)
      : null,
    !isControl ? totalItem(col, row, totalFieldTypes, isComplex) : null,
    !isControl && !isComplexOrDynamic ? getDropdownDivider() : null,
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
    isImport ? syncImport(col, row) : null,
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
    getDropdownItem({
      label: 'Create control',
      key: 'createControl',
      icon: (
        <Icon
          className="text-text-accent-primary w-[18px]"
          component={() => <CheckboxControlIcon />}
        />
      ),
      children: [
        getDropdownItem({
          label: 'Dropdown',
          key: getDropdownMenuKey<ContextMenuKeyData>(
            menuKey.createDropdownControlFromField,
            {
              col,
              row,
            }
          ),
          icon: (
            <Icon
              className="text-text-accent-primary w-[18px]"
              component={() => <DropdownControlIcon />}
            />
          ),
        }),
        getDropdownItem({
          label: 'Checkbox',
          key: getDropdownMenuKey<ContextMenuKeyData>(
            menuKey.createCheckboxControlFromField,
            {
              col,
              row,
            }
          ),
          icon: (
            <Icon
              className="text-text-accent-secondary w-[18px]"
              component={() => <CheckboxControlIcon />}
            />
          ),
        }),
      ],
    }),
    !isControl
      ? fieldTagsItem(
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
        )
      : null,
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
    ...(openDetails(col, row, false) || []),
  ];
};
