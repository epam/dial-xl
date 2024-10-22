import Icon from '@ant-design/icons';
import {
  getCheckboxDropdownSubmenuItem,
  getDropdownDivider,
  getDropdownItem,
  getDropdownMenuKey,
  GridCell,
  isComplexType,
  isNumericType,
  Shortcut,
  shortcutApi,
  SparklesIcon,
} from '@frontend/common';

import { GridCallbacks } from '../../../../types';
import { ListFilter, NumericFilter } from '../../components';
import { spreadsheetMenuKeys as menuKey, totalItems } from '../config';
import { ContextMenuKeyData } from '../types';
import { arrangeTableItems } from './commonItem';

export const getTableFieldMenuItems = (
  col: number,
  row: number,
  cell: GridCell,
  gridCallbacks: GridCallbacks
) => {
  const { field, table, endCol, startCol } = cell;

  if (!table || !field) return [];

  const { isManual } = table;

  const {
    isTableNameHeaderHidden,
    isTableFieldsHeaderHidden,
    tableName,
    isTableHorizontal,
  } = table;
  const {
    isKey,
    isDim,
    isDynamic,
    isNested,
    isPeriodSeries,
    note,
    fieldName,
    type,
    totalFieldTypes,
  } = field;

  const colSize = endCol - startCol + 1;
  const isNumeric = isNumericType(type);
  const isComplex = isComplexType(field) || isNested || isDynamic;
  const showCollapseNestedField = !isManual && isDim;
  const showExpandNestedField =
    !isManual && !isDim && (isNested || isPeriodSeries);

  return [
    getDropdownItem({
      label: 'Ask AI',
      key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.askAI, {
        col,
        row,
      }),
      icon: (
        <Icon
          className="text-textSecondary w-[18px]"
          component={() => <SparklesIcon />}
        />
      ),
      shortcut: shortcutApi.getLabel(Shortcut.OpenAIPromptBox),
    }),
    getDropdownDivider(),
    !isComplex
      ? getDropdownItem({
          key: 'SortMenu',
          label: 'Sort',
          children: [
            getDropdownItem({
              label: isNumeric ? 'Sort Smallest to Largest' : 'Sort A-Z',
              key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.sortAsc, {
                col,
                row,
              }),
            }),
            getDropdownItem({
              label: isNumeric ? 'Sort Largest to Smallest' : 'Sort Z-A',
              key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.sortDesc, {
                col,
                row,
              }),
            }),
            getDropdownItem({
              label: 'Clear sort',
              key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.clearSort, {
                col,
                row,
              }),
            }),
          ],
        })
      : null,
    isNumeric && !isComplex
      ? getDropdownItem({
          key: 'NumFilter',
          label: 'Filter',
          children: [
            getDropdownItem({
              key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.numFilter, {
                col,
                row,
              }),
              stopPropagationOnClick: true,
              label: (
                <NumericFilter
                  fieldName={fieldName}
                  filter={cell.field?.numericFilter}
                  gridCallbacks={gridCallbacks}
                  tableName={tableName}
                />
              ),
            }),
            getDropdownItem({
              key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.textFilter, {
                col,
                row,
              }),
              stopPropagationOnClick: true,
              label: (
                <ListFilter
                  cell={cell}
                  gridCallbacks={gridCallbacks}
                  isNumeric={true}
                />
              ),
            }),
          ],
        })
      : null,
    !isNumeric && !isComplex
      ? getDropdownItem({
          key: 'TextFilter',
          label: 'Filter',
          children: [
            getDropdownItem({
              key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.textFilter, {
                col,
                row,
              }),
              stopPropagationOnClick: true,
              label: <ListFilter cell={cell} gridCallbacks={gridCallbacks} />,
            }),
          ],
        })
      : null,
    !isComplex
      ? getDropdownItem({
          key: 'Total',
          label: 'Total',
          children: [
            ...totalItems.map((totalItem) => {
              if (totalItem.isCheckbox) {
                return getCheckboxDropdownSubmenuItem(
                  {
                    label: totalItem.label,
                    key: getDropdownMenuKey<ContextMenuKeyData>(totalItem.key, {
                      col,
                      row,
                    }),
                  },
                  totalFieldTypes?.includes(totalItem.type) ?? false
                );
              }

              return getDropdownItem({
                label: totalItem.label,
                key: getDropdownMenuKey<ContextMenuKeyData>(totalItem.key, {
                  col,
                  row,
                }),
              });
            }),
          ],
        })
      : null,
    getDropdownDivider(),
    getDropdownItem({
      label: 'Edit formula',
      key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.editFormula, {
        col,
        row,
      }),
      shortcut: shortcutApi.getLabel(Shortcut.EditExpression),
    }),
    getDropdownItem({
      label: 'Rename field',
      key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.renameField, {
        col,
        row,
      }),
      shortcut: shortcutApi.getLabel(Shortcut.Rename),
      disabled: isDynamic,
    }),
    getDropdownItem({
      label: isKey ? 'Unmake a key field' : 'Make key field',
      key: getDropdownMenuKey<ContextMenuKeyData>(
        isKey ? menuKey.removeKey : menuKey.addKey,
        {
          col,
          row,
        }
      ),
      disabled: isDynamic,
    }),
    showCollapseNestedField || showExpandNestedField
      ? getDropdownItem({
          label: showCollapseNestedField ? 'Collapse all' : 'Expand all',
          key: getDropdownMenuKey<ContextMenuKeyData>(
            showCollapseNestedField
              ? menuKey.removeDimension
              : menuKey.addDimension,
            { col, row }
          ),
          disabled: isDynamic,
        })
      : null,
    getDropdownDivider(),
    getDropdownItem({
      key: 'InsertMenu',
      label: 'Insert',
      children: [
        getDropdownItem({
          label: isTableHorizontal ? 'Field above' : 'Field to the left',
          key: getDropdownMenuKey<ContextMenuKeyData>(
            menuKey.insertFieldToLeft,
            { col, row }
          ),
        }),
        getDropdownItem({
          label: isTableHorizontal ? 'Field below' : 'Field to the right',
          key: getDropdownMenuKey<ContextMenuKeyData>(
            menuKey.insertFieldToRight,
            { col, row }
          ),
        }),
        getDropdownItem({
          label: 'New row',
          key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.addRow, {
            col,
            row,
          }),
          disabled: !isManual,
          tooltip: !isManual ? 'Only available for manual table' : undefined,
        }),
      ],
    }),
    getDropdownItem({
      label: 'Delete',
      key: 'Delete',
      children: [
        getDropdownItem({
          label: 'Delete field',
          key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.deleteField, {
            col,
            row,
          }),
          shortcut: shortcutApi.getLabel(Shortcut.Delete),
        }),
        getDropdownItem({
          label: 'Delete table',
          key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.deleteTable, {
            col,
            row,
          }),
        }),
      ],
    }),
    getDropdownItem({
      label: 'Field',
      key: 'Field',
      children: [
        getDropdownItem({
          label: 'Swap left',
          key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.swapLeft, {
            col,
            row,
          }),
          shortcut: shortcutApi.getLabel(Shortcut.SwapFieldsLeft),
        }),
        getDropdownItem({
          label: 'Swap right',
          key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.swapRight, {
            col,
            row,
          }),
          shortcut: shortcutApi.getLabel(Shortcut.SwapFieldsRight),
        }),
        getDropdownDivider(),
        !isDynamic && !table?.isTableHorizontal
          ? getDropdownItem({
              label: 'Increase field width',
              key: getDropdownMenuKey<ContextMenuKeyData>(
                menuKey.increaseFieldWidth,
                { col, row }
              ),
            })
          : null,
        !isDynamic && !table?.isTableHorizontal
          ? getDropdownItem({
              label: 'Decrease field width',
              key: getDropdownMenuKey<ContextMenuKeyData>(
                menuKey.decreaseFieldWidth,
                { col, row }
              ),
              disabled: colSize <= 1,
            })
          : null,
      ],
    }),
    getDropdownDivider(),
    getDropdownItem({
      label: note ? 'Edit Note' : 'Add Note',
      key: getDropdownMenuKey<ContextMenuKeyData>(
        note ? menuKey.editNote : menuKey.addNote,
        {
          col,
          row,
        }
      ),
      shortcut: shortcutApi.getLabel(Shortcut.AddNote),
    }),
    note
      ? getDropdownItem({
          label: 'Remove Note',
          key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.removeNote, {
            col,
            row,
          }),
        })
      : null,
    getDropdownDivider(),

    arrangeTableItems(col, row),

    getDropdownItem({
      label: 'Orientation',
      key: 'Orientation',
      children: [
        getCheckboxDropdownSubmenuItem(
          {
            label: 'Horizontal',
            key: getDropdownMenuKey<ContextMenuKeyData>(
              menuKey.flipTableToVertical,
              { col, row }
            ),
          },
          isTableHorizontal
        ),
        getCheckboxDropdownSubmenuItem(
          {
            label: 'Vertical',
            key: getDropdownMenuKey<ContextMenuKeyData>(
              menuKey.flipTableToHorizontal,
              {
                col,
                row,
              }
            ),
          },
          !isTableHorizontal
        ),
      ],
    }),
    getDropdownItem({
      label: 'Hide',
      key: 'Hide',
      children: [
        getDropdownItem({
          label: isTableNameHeaderHidden
            ? 'Show table header'
            : 'Hide table header',
          key: getDropdownMenuKey<ContextMenuKeyData>(
            menuKey.toggleTableNameHeader,
            { col, row }
          ),
        }),
        getDropdownItem({
          label: isTableFieldsHeaderHidden
            ? 'Show fields header'
            : 'Hide fields header',
          key: getDropdownMenuKey<ContextMenuKeyData>(
            menuKey.toggleTableFieldsHeader,
            {
              col,
              row,
            }
          ),
        }),
      ],
    }),
    getDropdownDivider(),
    getDropdownItem({
      label: 'Open in Editor',
      key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.openFieldInEditor, {
        col,
        row,
      }),
    }),
  ];
};
