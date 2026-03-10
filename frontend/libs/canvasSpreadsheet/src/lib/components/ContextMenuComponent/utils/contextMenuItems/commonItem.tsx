import Icon from '@ant-design/icons';
import {
  ArrangeIcon,
  CollapseIcon,
  EyeIcon,
  FieldIcon,
  FileIcon,
  FilterIcon,
  getCheckboxDropdownSubmenuItem,
  getDropdownDivider,
  getDropdownItem,
  getDropdownMenuKey,
  GridListFilter,
  InsertFilledIcon,
  isNumericType,
  isTextType,
  KeyIcon,
  makeKeyFieldWithOverridesMessage,
  MenuItem,
  NoteIcon,
  NoteOffIcon,
  OrientationIcon,
  ReloadIcon,
  SettingsIcon,
  Shortcut,
  shortcutApi,
  SortIcon,
  SparklesIcon,
  TableArrowIcon,
  TagIcon,
  TotalIcon,
  TrashFilledIcon,
  UncollapseIcon,
} from '@frontend/common';
import { TotalType } from '@frontend/parser';

import { GridCell, GridTable, SheetControl } from '../../../../types';
import { GridEventBus } from '../../../../utils';
import { FilterPanelItem } from '../../FilterPanelItem';
import {
  spreadsheetMenuKeys as menuKey,
  spreadsheetMenuKeys,
  totalItems,
} from '../config';
import { ContextMenuKeyData } from '../types';

export function arrangeTableItems(
  col: number,
  row: number,
  parentPath: string[],
): MenuItem {
  const path = [...parentPath, 'Arrange'];

  return getDropdownItem({
    label: 'Arrange',
    key: 'Arrange',
    fullPath: path,
    icon: (
      <Icon
        className="text-text-secondary w-[18px]"
        component={() => (
          <ArrangeIcon secondaryAccentCssVar="text-accent-primary" />
        )}
      />
    ),
    children: [
      getDropdownItem({
        label: 'Bring Forward',
        fullPath: [...path, 'BringForward'],
        key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.tableForward, {
          col,
          row,
        }),
      }),
      getDropdownItem({
        label: 'Bring to Front',
        fullPath: [...path, 'BringToFront'],
        key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.tableToFront, {
          col,
          row,
        }),
      }),
      getDropdownItem({
        label: 'Send Backward',
        fullPath: [...path, 'SendBackward'],
        key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.tableBackward, {
          col,
          row,
        }),
      }),
      getDropdownItem({
        label: 'Send To Back',
        fullPath: [...path, 'SendToBack'],
        key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.tableToBack, {
          col,
          row,
        }),
      }),
    ],
  });
}

export function askAIItem(
  col: number,
  row: number,
  parentPath: string[],
): MenuItem {
  return getDropdownItem({
    label: 'Ask AI',
    fullPath: [...parentPath, 'AskAI'],
    key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.askAI, {
      col,
      row,
    }),
    icon: (
      <Icon
        className="text-text-accent-tertiary w-[18px]"
        component={() => <SparklesIcon />}
      />
    ),
    shortcut: shortcutApi.getLabel(Shortcut.OpenAIPromptBox),
  });
}

export function aiRegenerateItem(
  col: number,
  row: number,
  parentPath: string[],
): MenuItem {
  return getDropdownItem({
    label: 'Regenerate AI result',
    fullPath: [...parentPath, 'RegenerateAI'],
    key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.aiRegenerate, {
      col,
      row,
    }),
    icon: (
      <Icon
        className="text-text-secondary w-[18px]"
        component={() => <ReloadIcon />}
      />
    ),
  });
}

export function noteEditItem(
  col: number,
  row: number,
  parentPath: string[],
  note?: string,
): MenuItem {
  return getDropdownItem({
    label: note ? 'Edit Note' : 'Add Note',
    fullPath: [...parentPath, note ? 'EditNote' : 'AddNote'],
    key: getDropdownMenuKey<ContextMenuKeyData>(
      note ? menuKey.editNote : menuKey.addNote,
      {
        col,
        row,
      },
    ),
    icon: (
      <Icon
        className="text-text-warning w-[18px]"
        component={() => <NoteIcon />}
      />
    ),
    shortcut: shortcutApi.getLabel(Shortcut.AddNote),
  });
}

export function noteRemoveItem(
  col: number,
  row: number,
  parentPath: string[],
): MenuItem {
  return getDropdownItem({
    label: 'Remove Note',
    fullPath: [...parentPath, 'RemoveNote'],
    key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.removeNote, {
      col,
      row,
    }),
    icon: (
      <Icon
        className="text-text-warning w-[18px]"
        component={() => <NoteOffIcon />}
      />
    ),
  });
}

export function orientationItem(
  col: number,
  row: number,
  parentPath: string[],
  isTableHorizontal: boolean,
): MenuItem {
  const path = [...parentPath, 'Orientation'];

  return getDropdownItem({
    label: 'Orientation',
    key: 'Orientation',
    fullPath: path,
    icon: (
      <Icon
        className="text-text-secondary w-[18px]"
        component={() => (
          <OrientationIcon secondaryAccentCssVar="text-accent-tertiary" />
        )}
      />
    ),
    children: [
      getCheckboxDropdownSubmenuItem(
        {
          label: 'Horizontal',
          fullPath: [...path, 'Horizontal'],
          key: getDropdownMenuKey<ContextMenuKeyData>(
            menuKey.flipTableToVertical,
            { col, row },
          ),
        },
        isTableHorizontal,
      ),
      getCheckboxDropdownSubmenuItem(
        {
          label: 'Vertical',
          fullPath: [...path, 'Vertical'],
          key: getDropdownMenuKey<ContextMenuKeyData>(
            menuKey.flipTableToHorizontal,
            {
              col,
              row,
            },
          ),
        },
        !isTableHorizontal,
      ),
    ],
  });
}

export function hideItem(
  col: number,
  row: number,
  parentPath: string[],
  isTableNameHeaderHidden: boolean,
  isTableFieldsHeaderHidden: boolean,
  isChart: boolean,
): MenuItem {
  const path = [...parentPath, 'Hide'];

  return getDropdownItem({
    label: 'Hide',
    key: 'Hide',
    fullPath: path,
    icon: (
      <Icon
        className="text-text-secondary w-[18px]"
        component={() => (
          <EyeIcon secondaryAccentCssVar="text-accent-primary" />
        )}
      />
    ),
    children: [
      getDropdownItem({
        label: isTableNameHeaderHidden
          ? isChart
            ? 'Show chart title'
            : 'Show table header'
          : isChart
            ? 'Hide chart title'
            : 'Hide table header',
        fullPath: [...path, 'ToggleTableNameHeader'],
        key: getDropdownMenuKey<ContextMenuKeyData>(
          menuKey.toggleTableNameHeader,
          { col, row },
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
        fullPath: [...path, 'ToggleTableFieldsHeader'],
        key: getDropdownMenuKey<ContextMenuKeyData>(
          menuKey.toggleTableFieldsHeader,
          {
            col,
            row,
          },
        ),
      }),
    ],
  });
}

export function sortItem(
  col: number,
  row: number,
  parentPath: string[],
  isNumeric: boolean,
): MenuItem {
  const path = [...parentPath, 'Sort'];

  return getDropdownItem({
    key: 'SortMenu',
    label: 'Sort',
    fullPath: path,
    icon: (
      <Icon
        className="text-text-secondary w-[18px]"
        component={() => (
          <SortIcon secondaryAccentCssVar="text-accent-primary" />
        )}
      />
    ),
    children: [
      getDropdownItem({
        label: isNumeric ? 'Sort Smallest to Largest' : 'Sort A-Z',
        fullPath: [...path, 'SortAsc'],
        key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.sortAsc, {
          col,
          row,
        }),
      }),
      getDropdownItem({
        label: isNumeric ? 'Sort Largest to Smallest' : 'Sort Z-A',
        fullPath: [...path, 'SortDesc'],
        key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.sortDesc, {
          col,
          row,
        }),
      }),
      getDropdownItem({
        label: 'Clear sort',
        fullPath: [...path, 'ClearSort'],
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
  parentPath: string[],
  isKey: boolean,
  isDynamic: boolean,
  isManual: boolean,
  isHasOverrides: boolean,
  isIndex: boolean,
  isDescription: boolean,
  isText: boolean,
  fieldNames: string[],
): MenuItem {
  const path = [...parentPath, 'Index'];

  return getDropdownItem({
    key: 'Indices',
    label: 'Index',
    fullPath: path,
    icon: (
      <Icon
        className="text-text-warning w-[18px]"
        component={() => <KeyIcon />}
      />
    ),
    children: [
      getDropdownItem({
        label: isKey ? 'Unmark as key column' : 'Mark as a key column',
        fullPath: [...path, 'ToggleKey'],
        key: getDropdownMenuKey<ContextMenuKeyData>(
          isKey ? menuKey.removeKey : menuKey.addKey,
          {
            col,
            row,
          },
        ),
        disabled: isDynamic || (isHasOverrides && !isManual && !isKey),
        tooltip:
          isHasOverrides && !isManual && !isKey
            ? makeKeyFieldWithOverridesMessage
            : undefined,
      }),
      getDropdownItem({
        label: isIndex ? 'Remove an Index' : 'Add an Index',
        fullPath: [...path, 'ToggleIndex'],
        key: getDropdownMenuKey<ContextMenuKeyData>(
          isIndex ? menuKey.removeIndex : menuKey.addIndex,
          {
            col,
            row,
          },
        ),
        disabled: !isIndex && !isText,
        tooltip:
          !isIndex && !isText ? 'Only available for text column' : undefined,
      }),
      getDropdownItem({
        label: isIndex ? 'Add description' : 'Add an index with description',
        fullPath: [...path, 'AddDescription'],
        key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.addDescription, {
          col,
          row,
        }),
        disabled: !isText,
        tooltip: !isText ? 'Only available for text column' : undefined,
        children: fieldNames.map((fieldName) =>
          getDropdownItem({
            label: fieldName,
            fullPath: [...path, 'AddDescription', fieldName],
            key: getDropdownMenuKey<ContextMenuKeyData>(
              menuKey.addDescription,
              {
                col,
                row,
                fieldName,
              },
            ),
          }),
        ),
      }),
      isDescription
        ? getDropdownItem({
            label: 'Remove description',
            fullPath: [...path, 'RemoveDescription'],
            key: getDropdownMenuKey<ContextMenuKeyData>(
              menuKey.removeDescription,
              {
                col,
                row,
              },
            ),
          })
        : null,
    ],
  });
}

export function dimensionItem(
  col: number,
  row: number,
  parentPath: string[],
  showCollapseNestedField: boolean,
  isDynamic: boolean,
): MenuItem {
  return getDropdownItem({
    label: showCollapseNestedField ? 'Collapse all' : 'Expand all',
    fullPath: [
      ...parentPath,
      showCollapseNestedField ? 'CollapseAll' : 'ExpandAll',
    ],
    key: getDropdownMenuKey<ContextMenuKeyData>(
      showCollapseNestedField ? menuKey.removeDimension : menuKey.addDimension,
      { col, row },
    ),
    icon: (
      <Icon
        className="text-text-secondary w-[18px]"
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
  parentPath: string[],
  isTableHorizontal: boolean,
  isManual: boolean,
): MenuItem {
  const path = [...parentPath, 'Insert'];

  return getDropdownItem({
    key: 'InsertMenu',
    label: 'Insert',
    fullPath: path,
    icon: (
      <Icon
        className="text-text-accent-tertiary w-[18px]"
        component={() => <InsertFilledIcon />}
      />
    ),
    children: [
      getDropdownItem({
        label: isTableHorizontal ? 'Column above' : 'Column to the left',
        fullPath: [...path, 'ColumnLeft'],
        key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.insertFieldToLeft, {
          col,
          row,
        }),
      }),
      getDropdownItem({
        label: isTableHorizontal ? 'Column below' : 'Column to the right',
        fullPath: [...path, 'ColumnRight'],
        key: getDropdownMenuKey<ContextMenuKeyData>(
          menuKey.insertFieldToRight,
          { col, row },
        ),
      }),
      getDropdownItem({
        label: 'New row',
        fullPath: [...path, 'NewRow'],
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
  parentPath: string[],
  cell: GridCell,
  table: GridTable,
  isDynamic: boolean,
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

  const path = [...parentPath, 'Column'];

  return getDropdownItem({
    label: 'Column',
    key: 'Column',
    fullPath: path,
    icon: (
      <Icon
        className="text-text-secondary w-[18px]"
        component={() => (
          <FieldIcon secondaryAccentCssVar="text-accent-primary" />
        )}
      />
    ),
    children: [
      getDropdownItem({
        label: isTableHorizontal ? 'Swap top' : 'Swap left',
        fullPath: [...path, 'SwapLeft'],
        key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.swapLeft, {
          col,
          row,
        }),
        shortcut: shortcutApi.getLabel(Shortcut.SwapFieldsLeft),
        disabled: isFirstField,
      }),
      getDropdownItem({
        label: isTableHorizontal ? 'Swap bottom' : 'Swap right',
        fullPath: [...path, 'SwapRight'],
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
            fullPath: [...path, 'IncreaseColumnWidth'],
            key: getDropdownMenuKey<ContextMenuKeyData>(
              menuKey.increaseFieldWidth,
              { col, row },
            ),
          })
        : null,
      !isDynamic && !table?.isTableHorizontal
        ? getDropdownItem({
            label: 'Decrease column width',
            fullPath: [...path, 'DecreaseColumnWidth'],
            key: getDropdownMenuKey<ContextMenuKeyData>(
              menuKey.decreaseFieldWidth,
              { col, row },
            ),
            disabled: colSize <= 1,
          })
        : null,
      !table?.isTableHorizontal ? getDropdownDivider() : null,
      !table?.isTableHorizontal
        ? getDropdownItem({
            label: 'Columns Auto Fit',
            fullPath: [...path, 'ColumnsAutoFit'],
            key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.fieldsAutoFit, {
              col,
              row,
            }),
          })
        : null,
      !table?.isTableHorizontal
        ? getDropdownItem({
            label: 'Remove custom column widths',
            fullPath: [...path, 'RemoveCustomColumnWidths'],
            key: getDropdownMenuKey<ContextMenuKeyData>(
              menuKey.removeFieldSizes,
              { col, row },
            ),
          })
        : null,
    ],
  });
}

export function deleteItem(
  col: number,
  row: number,
  parentPath: string[],
  table: GridTable,
  isTableCell: boolean,
): MenuItem {
  const path = [...parentPath, 'Delete'];

  return getDropdownItem({
    label: 'Delete',
    key: 'Delete',
    fullPath: path,
    icon: (
      <Icon
        className="text-text-error w-[18px]"
        component={() => <TrashFilledIcon />}
      />
    ),
    children: [
      getDropdownItem({
        label: 'Delete column',
        fullPath: [...path, 'DeleteColumn'],
        key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.deleteField, {
          col,
          row,
        }),
      }),
      getDropdownItem({
        label: 'Delete table',
        fullPath: [...path, 'DeleteTable'],
        key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.deleteTable, {
          col,
          row,
        }),
      }),
      isTableCell && table.isManual
        ? getDropdownItem({
            label: 'Delete row',
            fullPath: [...path, 'DeleteRow'],
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
  parentPath: string[],
  totalFieldTypes: TotalType[] | undefined,
  isComplex: boolean,
): MenuItem {
  const complexTotalKeys = [spreadsheetMenuKeys.countTotal];
  const filteredTotalItems = isComplex
    ? totalItems.filter(({ key }) => complexTotalKeys.includes(key))
    : totalItems;

  const path = [...parentPath, 'Total'];
  const allTotalsPath = [...path, 'AllTotals'];

  return getDropdownItem({
    key: 'Total',
    label: 'Total',
    fullPath: path,
    icon: (
      <Icon
        className="text-text-accent-tertiary w-[18px]"
        component={() => <TotalIcon />}
      />
    ),
    children: [
      getDropdownItem({
        key: 'All Totals',
        label: 'All Totals',
        fullPath: allTotalsPath,
        children: [
          !isComplex
            ? getDropdownItem({
                label: 'Add Totals',
                fullPath: [...allTotalsPath, 'AddTotals'],
                key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.allTotals, {
                  col,
                  row,
                }),
              })
            : null,
          getDropdownItem({
            label: 'Separate Table',
            fullPath: [...allTotalsPath, 'SeparateTable'],
            key: getDropdownMenuKey<ContextMenuKeyData>(
              menuKey.allTotalsSeparateTable,
              {
                col,
                row,
              },
            ),
          }),
        ],
      }),
      ...filteredTotalItems.map((totalItem) => {
        if (totalItem.isCheckbox) {
          return getCheckboxDropdownSubmenuItem(
            {
              label: totalItem.label,
              fullPath: [...path, totalItem.key],
              key: getDropdownMenuKey<ContextMenuKeyData>(totalItem.key, {
                col,
                row,
              }),
            },
            totalFieldTypes?.includes(totalItem.type) ?? false,
          );
        }

        return getDropdownItem({
          label: totalItem.label,
          fullPath: [...path, totalItem.key],
          key: getDropdownMenuKey<ContextMenuKeyData>(totalItem.key, {
            col,
            row,
          }),
        });
      }),
    ],
  });
}

export function filterItem({
  col,
  row,
  parentPath,
  cell,
  eventBus,
  filterList,
  sheetControls,
  onClose,
}: {
  col: number;
  row: number;
  parentPath: string[];
  cell: GridCell;
  eventBus: GridEventBus;
  filterList: GridListFilter[];
  sheetControls: SheetControl[];
  onClose: () => void;
}): MenuItem {
  const { field, table } = cell;

  if (!table || !field) return null;

  const { tableName } = table;
  const { fieldName, type } = field;
  const isNumeric = isNumericType(type);
  const isText = isTextType(type);
  const filterType = isNumeric ? 'numeric' : isText ? 'text' : null;

  if (!filterType) return null;

  const path = [...parentPath, 'Filter'];

  return getDropdownItem({
    key: 'Filter',
    label: 'Filter',
    fullPath: path,
    icon: (
      <Icon
        className="text-text-secondary w-[18px]"
        component={() => <FilterIcon />}
      />
    ),
    children: [
      getDropdownItem({
        key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.filter, {
          col,
          row,
        }),
        fullPath: [...path, 'Filter'],
        stopPropagationOnClick: true,
        isCustomContent: true,
        label: (
          <FilterPanelItem
            cell={cell}
            eventBus={eventBus}
            fieldName={fieldName}
            filters={field?.conditionFilters?.filters}
            filterType={filterType}
            isNumeric={isNumeric}
            listFilter={filterList}
            sheetControls={sheetControls}
            tableName={tableName}
            onClose={onClose}
          />
        ),
      }),
    ],
  });
}

export function switchInput(
  col: number,
  row: number,
  parentPath: string[],
): MenuItem {
  return getDropdownItem({
    label: 'Switch input',
    fullPath: [...parentPath, 'SwitchInput'],
    key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.switchInput, {
      col,
      row,
    }),
    icon: (
      <Icon
        className="text-text-secondary w-[18px]"
        component={() => <FileIcon />}
      />
    ),
  });
}

export function syncImport(
  col: number,
  row: number,
  parentPath: string[],
): MenuItem {
  return getDropdownItem({
    label: 'Sync import',
    fullPath: [...parentPath, 'SyncImport'],
    key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.syncImport, {
      col,
      row,
    }),
    icon: (
      <Icon
        className="text-text-secondary w-[18px]"
        component={() => <ReloadIcon />}
      />
    ),
  });
}

export function openDetails(
  col: number,
  row: number,
  parentPath: string[],
  isTableHeader: boolean,
  isOverride?: boolean,
): MenuItem[] {
  return [
    getDropdownItem({
      label: 'Open in Details Panel',
      fullPath: [...parentPath, 'OpenInDetailsPanel'],
      key: getDropdownMenuKey(menuKey.openDetailsPanel, { col, row }),
      icon: (
        <Icon
          className="text-text-secondary w-[18px]"
          component={() => <SettingsIcon />}
        />
      ),
    }),
    getDropdownItem({
      label: 'Open in Editor',
      fullPath: [...parentPath, 'OpenInEditor'],
      key: getDropdownMenuKey<ContextMenuKeyData>(
        isOverride
          ? menuKey.openOverrideInEditor
          : isTableHeader
            ? menuKey.openTableInEditor
            : menuKey.openFieldInEditor,
        {
          col,
          row,
        },
      ),
      icon: (
        <Icon
          className="text-text-secondary w-[18px]"
          component={() => <TagIcon />}
        />
      ),
    }),
  ];
}

export function moveTable(
  col: number,
  row: number,
  parentPath: string[],
  isChart: boolean,
): MenuItem {
  return getDropdownItem({
    label: isChart ? 'Move chart' : 'Move table',
    fullPath: [...parentPath, isChart ? 'MoveChart' : 'MoveTable'],
    shortcut: shortcutApi.getLabel(Shortcut.SelectAll),
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
  });
}
