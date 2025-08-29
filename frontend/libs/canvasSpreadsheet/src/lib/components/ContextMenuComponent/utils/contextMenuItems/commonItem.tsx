import Icon from '@ant-design/icons';
import {
  ArrangeIcon,
  CollapseIcon,
  EyeIcon,
  FieldIcon,
  FilterIcon,
  getCheckboxDropdownSubmenuItem,
  getDropdownDivider,
  getDropdownItem,
  getDropdownMenuKey,
  GridCell,
  GridListFilter,
  GridTable,
  InsertFilledIcon,
  isNumericType,
  isTextType,
  KeyIcon,
  makeKeyFieldWithOverridesMessage,
  MenuItem,
  NoteIcon,
  NoteOffIcon,
  OrientationIcon,
  Shortcut,
  shortcutApi,
  SortIcon,
  SparklesIcon,
  TotalIcon,
  TrashFilledIcon,
  UncollapseIcon,
} from '@frontend/common';
import { TotalType } from '@frontend/parser';

import { GridCallbacks } from '../../../../types';
import { ConditionFilter, ListFilter } from '../../components';
import {
  spreadsheetMenuKeys as menuKey,
  spreadsheetMenuKeys,
  totalItems,
} from '../config';
import { ContextMenuKeyData } from '../types';

export function arrangeTableItems(col: number, row: number): MenuItem {
  return getDropdownItem({
    label: 'Arrange',
    key: 'Arrange',
    icon: (
      <Icon
        className="text-textSecondary w-[18px]"
        component={() => (
          <ArrangeIcon secondaryAccentCssVar="text-accent-primary" />
        )}
      />
    ),
    children: [
      getDropdownItem({
        label: 'Bring Forward',
        key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.tableForward, {
          col,
          row,
        }),
      }),
      getDropdownItem({
        label: 'Bring to Front',
        key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.tableToFront, {
          col,
          row,
        }),
      }),
      getDropdownItem({
        label: 'Send Backward',
        key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.tableBackward, {
          col,
          row,
        }),
      }),
      getDropdownItem({
        label: 'Send To Back',
        key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.tableToBack, {
          col,
          row,
        }),
      }),
    ],
  });
}

export function askAIItem(col: number, row: number): MenuItem {
  return getDropdownItem({
    label: 'Ask AI',
    key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.askAI, {
      col,
      row,
    }),
    icon: (
      <Icon
        className="text-textAccentTertiary w-[18px]"
        component={() => <SparklesIcon />}
      />
    ),
    shortcut: shortcutApi.getLabel(Shortcut.OpenAIPromptBox),
  });
}

export function noteEditItem(
  col: number,
  row: number,
  note?: string
): MenuItem {
  return getDropdownItem({
    label: note ? 'Edit Note' : 'Add Note',
    key: getDropdownMenuKey<ContextMenuKeyData>(
      note ? menuKey.editNote : menuKey.addNote,
      {
        col,
        row,
      }
    ),
    icon: (
      <Icon
        className="text-textWarning w-[18px]"
        component={() => <NoteIcon />}
      />
    ),
    shortcut: shortcutApi.getLabel(Shortcut.AddNote),
  });
}

export function noteRemoveItem(col: number, row: number): MenuItem {
  return getDropdownItem({
    label: 'Remove Note',
    key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.removeNote, {
      col,
      row,
    }),
    icon: (
      <Icon
        className="text-textWarning w-[18px]"
        component={() => <NoteOffIcon />}
      />
    ),
  });
}

export function orientationItem(
  col: number,
  row: number,
  isTableHorizontal: boolean
): MenuItem {
  return getDropdownItem({
    label: 'Orientation',
    key: 'Orientation',
    icon: (
      <Icon
        className="text-textSecondary w-[18px]"
        component={() => (
          <OrientationIcon secondaryAccentCssVar="text-accent-tertiary" />
        )}
      />
    ),
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
  });
}

export function hideItem(
  col: number,
  row: number,
  isTableNameHeaderHidden: boolean,
  isTableFieldsHeaderHidden: boolean,
  isChart: boolean
): MenuItem {
  return getDropdownItem({
    label: 'Hide',
    key: 'Hide',
    icon: (
      <Icon
        className="text-textSecondary w-[18px]"
        component={() => (
          <EyeIcon secondaryAccentCssVar="text-accent-primary" />
        )}
      />
    ),
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
          ? isChart
            ? 'Show chart legend'
            : 'Show fields header'
          : isChart
          ? 'Hide chart legend'
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
  });
}

export function sortItem(
  col: number,
  row: number,
  isNumeric: boolean
): MenuItem {
  return getDropdownItem({
    key: 'SortMenu',
    label: 'Sort',
    icon: (
      <Icon
        className="text-textSecondary w-[18px]"
        component={() => (
          <SortIcon secondaryAccentCssVar="text-accent-primary" />
        )}
      />
    ),
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
  });
}

export function fieldTagsItem(
  col: number,
  row: number,
  isKey: boolean,
  isDynamic: boolean,
  isManual: boolean,
  isHasOverrides: boolean,
  isIndex: boolean,
  isDescription: boolean,
  isText: boolean,
  fieldNames: string[]
): MenuItem {
  return getDropdownItem({
    key: 'Indices',
    label: 'Index',
    icon: (
      <Icon
        className="text-textWarning w-[18px]"
        component={() => <KeyIcon />}
      />
    ),
    children: [
      getDropdownItem({
        label: isKey ? 'Unmark as key column' : 'Mark as a key column',
        key: getDropdownMenuKey<ContextMenuKeyData>(
          isKey ? menuKey.removeKey : menuKey.addKey,
          {
            col,
            row,
          }
        ),
        disabled: isDynamic || (isHasOverrides && !isManual && !isKey),
        tooltip:
          isHasOverrides && !isManual && !isKey
            ? makeKeyFieldWithOverridesMessage
            : undefined,
      }),
      getDropdownItem({
        label: isIndex ? 'Remove an Index' : 'Add an Index',
        key: getDropdownMenuKey<ContextMenuKeyData>(
          isIndex ? menuKey.removeIndex : menuKey.addIndex,
          {
            col,
            row,
          }
        ),
        disabled: !isIndex && !isText,
        tooltip:
          !isIndex && !isText ? 'Only available for text column' : undefined,
      }),
      getDropdownItem({
        label: isIndex ? 'Add description' : 'Add an index with description',
        key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.addDescription, {
          col,
          row,
        }),
        disabled: !isText,
        tooltip: !isText ? 'Only available for text column' : undefined,
        children: fieldNames.map((fieldName) =>
          getDropdownItem({
            label: fieldName,
            key: getDropdownMenuKey<ContextMenuKeyData>(
              menuKey.addDescription,
              {
                col,
                row,
                fieldName,
              }
            ),
          })
        ),
      }),
      isDescription
        ? getDropdownItem({
            label: 'Remove description',
            key: getDropdownMenuKey<ContextMenuKeyData>(
              menuKey.removeDescription,
              {
                col,
                row,
              }
            ),
          })
        : null,
    ],
  });
}

export function dimensionItem(
  col: number,
  row: number,
  showCollapseNestedField: boolean,
  isDynamic: boolean
): MenuItem {
  return getDropdownItem({
    label: showCollapseNestedField ? 'Collapse all' : 'Expand all',
    key: getDropdownMenuKey<ContextMenuKeyData>(
      showCollapseNestedField ? menuKey.removeDimension : menuKey.addDimension,
      { col, row }
    ),
    icon: (
      <Icon
        className="text-textSecondary w-[18px]"
        component={() =>
          showCollapseNestedField ? (
            <CollapseIcon secondaryAccentCssVar="text-accent-primary" />
          ) : (
            <UncollapseIcon secondaryAccentCssVar="text-accent-primary" />
          )
        }
      />
    ),
    disabled: isDynamic,
  });
}

export function insertItem(
  col: number,
  row: number,
  isTableHorizontal: boolean,
  isManual: boolean
): MenuItem {
  return getDropdownItem({
    key: 'InsertMenu',
    label: 'Insert',
    icon: (
      <Icon
        className="text-textAccentTertiary w-[18px]"
        component={() => <InsertFilledIcon />}
      />
    ),
    children: [
      getDropdownItem({
        label: isTableHorizontal ? 'Column above' : 'Column to the left',
        key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.insertFieldToLeft, {
          col,
          row,
        }),
      }),
      getDropdownItem({
        label: isTableHorizontal ? 'Column below' : 'Column to the right',
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
  });
}

export function fieldItem(
  col: number,
  row: number,
  cell: GridCell,
  table: GridTable,
  isDynamic: boolean
): MenuItem {
  const { endCol, startCol } = cell;
  const { isTableHorizontal, isTableNameHeaderHidden } = table;
  const colSize = endCol - startCol + 1;
  const isFirstField = isTableHorizontal
    ? row === table.startRow + (isTableNameHeaderHidden ? 0 : 1)
    : startCol === table.startCol;
  const isLastField = isTableHorizontal
    ? row === table.endRow
    : endCol === table.endCol;

  return getDropdownItem({
    label: 'Column',
    key: 'Column',
    icon: (
      <Icon
        className="text-textSecondary w-[18px]"
        component={() => (
          <FieldIcon secondaryAccentCssVar="text-accent-primary" />
        )}
      />
    ),
    children: [
      getDropdownItem({
        label: isTableHorizontal ? 'Swap top' : 'Swap left',
        key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.swapLeft, {
          col,
          row,
        }),
        shortcut: shortcutApi.getLabel(Shortcut.SwapFieldsLeft),
        disabled: isFirstField,
      }),
      getDropdownItem({
        label: isTableHorizontal ? 'Swap bottom' : 'Swap right',
        key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.swapRight, {
          col,
          row,
        }),
        shortcut: shortcutApi.getLabel(Shortcut.SwapFieldsRight),
        disabled: isLastField,
      }),
      !isDynamic && !table?.isTableHorizontal ? getDropdownDivider() : null,
      !isDynamic && !table?.isTableHorizontal
        ? getDropdownItem({
            label: 'Increase column width',
            key: getDropdownMenuKey<ContextMenuKeyData>(
              menuKey.increaseFieldWidth,
              { col, row }
            ),
          })
        : null,
      !isDynamic && !table?.isTableHorizontal
        ? getDropdownItem({
            label: 'Decrease column width',
            key: getDropdownMenuKey<ContextMenuKeyData>(
              menuKey.decreaseFieldWidth,
              { col, row }
            ),
            disabled: colSize <= 1,
          })
        : null,
      !table?.isTableHorizontal ? getDropdownDivider() : null,
      !table?.isTableHorizontal
        ? getDropdownItem({
            label: 'Columns Auto Fit',
            key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.fieldsAutoFit, {
              col,
              row,
            }),
          })
        : null,
      !table?.isTableHorizontal
        ? getDropdownItem({
            label: 'Remove custom column widths',
            key: getDropdownMenuKey<ContextMenuKeyData>(
              menuKey.removeFieldSizes,
              { col, row }
            ),
          })
        : null,
    ],
  });
}

export function deleteItem(
  col: number,
  row: number,
  table: GridTable,
  isTableCell: boolean
): MenuItem {
  return getDropdownItem({
    label: 'Delete',
    key: 'Delete',
    icon: (
      <Icon
        className="text-textError w-[18px]"
        component={() => <TrashFilledIcon />}
      />
    ),
    children: [
      getDropdownItem({
        label: 'Delete column',
        key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.deleteField, {
          col,
          row,
        }),
      }),
      getDropdownItem({
        label: 'Delete table',
        key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.deleteTable, {
          col,
          row,
        }),
      }),
      isTableCell && table.isManual
        ? getDropdownItem({
            label: 'Delete row',
            key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.deleteRow, {
              col,
              row,
            }),
          })
        : null,
    ],
  });
}

export function totalItem(
  col: number,
  row: number,
  totalFieldTypes: TotalType[] | undefined,
  isComplex: boolean
): MenuItem {
  const complexTotalKeys = [spreadsheetMenuKeys.countTotal];
  const filteredTotalItems = isComplex
    ? totalItems.filter(({ key }) => complexTotalKeys.includes(key))
    : totalItems;

  return getDropdownItem({
    key: 'Total',
    label: 'Total',
    icon: (
      <Icon
        className="text-textAccentTertiary w-[18px]"
        component={() => <TotalIcon />}
      />
    ),
    children: [
      getDropdownItem({
        key: 'All Totals',
        label: 'All Totals',
        children: [
          !isComplex
            ? getDropdownItem({
                label: 'Add Totals',
                key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.allTotals, {
                  col,
                  row,
                }),
              })
            : null,
          getDropdownItem({
            label: 'Separate Table',
            key: getDropdownMenuKey<ContextMenuKeyData>(
              menuKey.allTotalsSeparateTable,
              {
                col,
                row,
              }
            ),
          }),
        ],
      }),
      ...filteredTotalItems.map((totalItem) => {
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
  });
}

export function filterItem(
  col: number,
  row: number,
  cell: GridCell,
  gridCallbacks: GridCallbacks,
  filterList: GridListFilter[]
): MenuItem {
  const { field, table } = cell;

  if (!table || !field) return null;

  const { tableName } = table;
  const { fieldName, type } = field;
  const isNumeric = isNumericType(type);
  const isText = isTextType(type);
  const filterType = isNumeric ? 'numeric' : isText ? 'text' : null;

  if (!filterType) return null;

  return getDropdownItem({
    key: 'Filter',
    label: 'Filter',
    icon: (
      <Icon
        className="text-textSecondary w-[18px]"
        component={() => <FilterIcon />}
      />
    ),
    children: [
      getDropdownItem({
        key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.numFilter, {
          col,
          row,
        }),
        stopPropagationOnClick: true,
        label: (
          <ConditionFilter
            fieldName={fieldName}
            filter={field?.filter}
            filterType={filterType}
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
            isNumeric={isNumeric}
            listFilter={filterList}
          />
        ),
      }),
    ],
  });
}
