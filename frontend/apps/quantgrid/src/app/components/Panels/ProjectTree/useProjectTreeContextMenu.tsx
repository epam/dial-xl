import { ItemType } from 'antd/es/menu/interface';
import { DataNode, EventDataNode } from 'antd/es/tree';
import { MenuInfo } from 'rc-menu/lib/interface';
import { useCallback, useContext, useState } from 'react';

import {
  ColumnDataType,
  defaultFieldName,
  getCheckboxDropdownSubmenuItem,
  getDropdownDivider,
  getDropdownItem,
  getDropdownMenuKey,
  MenuItem,
  TableArrangeType,
} from '@frontend/common';

import {
  ApiContext,
  AppContext,
  AppSpreadsheetInteractionContext,
  OpenFieldSideEffect,
  OpenTableSideEffect,
  ProjectContext,
  ViewportContext,
} from '../../../context';
import {
  useDSLUtils,
  useManualAddTableRowDSL,
  useManualArrangeTableDSL,
  useManualCreateEntityDSL,
  useManualDeleteTableDSL,
  useManualEditDSL,
  useOpenInEditor,
  usePointClickSelectValue,
  useProjectActions,
} from '../../../hooks';

const contextMenuActionKeys = {
  renameProject: 'renameProject',
  deleteProject: 'deleteProject',

  selectWorksheet: 'selectWorksheet',

  putSheet: 'putSheet',
  renameSheet: 'renameSheet',
  deleteSheet: 'deleteSheet',

  selectTable: 'selectTable',
  deleteTable: 'deleteTable',
  renameTable: 'renameTable',
  moveTable: 'moveTable',
  cloneTable: 'cloneTable',
  toggleTableNameHeader: 'toggleTableNameHeader',
  toggleTableFieldsHeader: 'toggleTableFieldsHeader',
  flipTableHorizontal: 'flipTableHorizontal',
  flipTableVertical: 'flipTableVertical',
  createDerivedTable: 'createDerivedTable',
  convertToChart: 'convertToChart',
  convertToTable: 'convertToTable',
  addChart: 'addChart',

  tableToFront: 'tableToFront',
  tableToBack: 'tableToBack',
  tableForward: 'tableForward',
  tableBackward: 'tableBackward',

  selectField: 'selectField',
  deleteField: 'deleteField',
  swapLeft: 'swapLeft',
  swapRight: 'swapRight',
  increaseFieldWidth: 'increaseFieldWidth',
  decreaseFieldWidth: 'decreaseFieldWidth',
  renameField: 'renameField',
  editFormula: 'editFormula',
  removeKey: 'removeKey',
  addKey: 'addKey',
  removeDimension: 'removeDimension',
  addDimension: 'addDimension',

  addField: 'addField',
  addFieldToRight: 'addFieldToRight',
  addFieldToLeft: 'addFieldToLeft',
  addRow: 'addRow',

  openTableInEditor: 'openTableInEditor',
  openFieldInEditor: 'openFieldInEditor',
};

export type ProjectTreeData = {
  fieldName?: string;
  tableName?: string;
  sheetName?: string;
};

export type ProjectTreeChildData = {
  [keyIndex: string]: ProjectTreeData;
};

const arrangeTableActions: Record<string, TableArrangeType> = {
  [contextMenuActionKeys.tableToBack]: 'back',
  [contextMenuActionKeys.tableForward]: 'forward',
  [contextMenuActionKeys.tableToFront]: 'front',
  [contextMenuActionKeys.tableBackward]: 'backward',
};

function parseContextMenuKey(key: string): {
  action: string;
  data: ProjectTreeData;
} {
  return JSON.parse(key);
}

export const useProjectTreeContextMenu = (
  renameTableCallback: React.MutableRefObject<
    ((data: ProjectTreeChildData[string]) => void) | undefined
  >,
  renameFieldCallback: React.MutableRefObject<
    ((data: ProjectTreeChildData[string]) => void) | undefined
  >
) => {
  const { isPointClickMode } = useContext(AppContext);
  const { userBucket } = useContext(ApiContext);
  const projectAction = useProjectActions();
  const { projectName, openSheet, projectBucket } = useContext(ProjectContext);
  const { viewGridData } = useContext(ViewportContext);
  const { openField, openTable } = useContext(AppSpreadsheetInteractionContext);
  const {
    addChart,
    deleteField,
    convertToTable,
    convertToChart,
    addKey,
    removeKey,
    removeDimension,
    addDimension,
    swapFieldsHandler,
    onIncreaseFieldColumnSize,
    onDecreaseFieldColumnSize,
    onToggleTableHeaderVisibility,
    onToggleTableFieldsVisibility,
    onFlipTable,
    addField,
    onCloneTable,
  } = useManualEditDSL();
  const { arrangeTable } = useManualArrangeTableDSL();
  const { deleteTable } = useManualDeleteTableDSL();
  const { createDerivedTable } = useManualCreateEntityDSL();
  const { addTableRowToEnd } = useManualAddTableRowDSL();
  const { findContext } = useDSLUtils();
  const { handlePointClickSelectValue } = usePointClickSelectValue();
  const { openInEditor } = useOpenInEditor();

  const [items, setItems] = useState<MenuItem[]>([]);

  const isYourProject = userBucket === projectBucket;

  const getProjectActions = useCallback((): MenuItem[] => {
    return [
      getDropdownItem({
        key: getDropdownMenuKey<ProjectTreeData>(
          contextMenuActionKeys.putSheet,
          {}
        ),
        label: 'Create Worksheet',
      }),
      getDropdownItem({
        key: getDropdownMenuKey<ProjectTreeData>(
          contextMenuActionKeys.renameProject,
          {}
        ),
        label: 'Rename Project',
        disabled: !isYourProject,
        tooltip: !isYourProject
          ? 'You are not allowed to rename projects which are not yours'
          : undefined,
      }),
      getDropdownItem({
        key: getDropdownMenuKey<ProjectTreeData>(
          contextMenuActionKeys.deleteProject,
          {}
        ),
        label: 'Delete Project',
        disabled: !isYourProject,
        tooltip: !isYourProject
          ? 'You are not allowed to delete projects which are not yours'
          : undefined,
      }),
    ];
  }, [isYourProject]);

  const getSheetActions = useCallback(
    (childData: ProjectTreeData): MenuItem[] => {
      return [
        getDropdownItem({
          key: getDropdownMenuKey<ProjectTreeData>(
            contextMenuActionKeys.selectWorksheet,
            childData
          ),
          label: 'Select Worksheet',
        }),
        getDropdownItem({
          key: getDropdownMenuKey<ProjectTreeData>(
            contextMenuActionKeys.renameSheet,
            childData
          ),
          label: 'Rename Worksheet',
        }),
        getDropdownItem({
          key: getDropdownMenuKey<ProjectTreeData>(
            contextMenuActionKeys.deleteSheet,
            childData
          ),
          label: 'Delete Worksheet',
        }),
      ];
    },
    []
  );

  const getTableActions = useCallback(
    (childData: ProjectTreeData): MenuItem[] => {
      const { tableName } = childData;

      let isChart = undefined;
      let isTableHeaderHidden = false;
      let isTableFieldsHidden = false;
      let isTableHorizontal = false;
      let isManual = false;

      if (tableName) {
        const context = findContext(tableName);

        if (context) {
          isChart = context.table.isChart();
          isTableHeaderHidden = context.table.getIsTableHeaderHidden();
          isTableFieldsHidden = context.table.getIsTableFieldsHidden();
          isTableHorizontal = context.table.getIsTableDirectionHorizontal();
          isManual = context.table.isManual();
        }
      }

      return [
        getDropdownItem({
          key: getDropdownMenuKey<ProjectTreeData>(
            contextMenuActionKeys.selectTable,
            childData
          ),
          label: 'Select table',
        }),
        getDropdownItem({
          key: getDropdownMenuKey<ProjectTreeData>(
            contextMenuActionKeys.renameTable,
            childData
          ),
          label: 'Rename table',
        }),
        getDropdownItem({
          key: getDropdownMenuKey<ProjectTreeData>(
            contextMenuActionKeys.deleteTable,
            childData
          ),
          label: 'Delete table',
        }),
        getDropdownItem({
          key: getDropdownMenuKey<ProjectTreeData>(
            contextMenuActionKeys.moveTable,
            childData
          ),
          label: 'Move table',
        }),

        getDropdownDivider(),

        getDropdownItem({
          label: 'Insert',
          key: 'Insert',
          children: [
            getDropdownItem({
              label: 'New field',
              key: getDropdownMenuKey<ProjectTreeData>(
                contextMenuActionKeys.addField,
                childData
              ),
            }),
            getDropdownItem({
              label: 'New row',
              key: getDropdownMenuKey<ProjectTreeData>(
                contextMenuActionKeys.addRow,
                childData
              ),
              disabled: !isManual,
              tooltip: !isManual
                ? 'Only available for manual table'
                : undefined,
            }),
          ],
        }),
        getDropdownItem({
          label: 'Clone table',
          key: getDropdownMenuKey<ProjectTreeData>(
            contextMenuActionKeys.cloneTable,
            childData
          ),
        }),
        getDropdownItem({
          key: getDropdownMenuKey<ProjectTreeData>(
            contextMenuActionKeys.createDerivedTable,
            childData
          ),
          label: 'Create derived',
        }),
        getDropdownItem({
          key: getDropdownMenuKey<ProjectTreeData>(
            isChart
              ? contextMenuActionKeys.convertToTable
              : contextMenuActionKeys.convertToChart,
            childData
          ),
          label: isChart ? 'Convert to table' : 'Convert to chart',
        }),
        !isChart
          ? getDropdownItem({
              key: getDropdownMenuKey<ProjectTreeData>(
                contextMenuActionKeys.addChart,
                childData
              ),
              label: 'Add chart',
            })
          : undefined,

        getDropdownDivider(),

        getDropdownItem({
          label: 'Arrange',
          key: 'Arrange',
          children: [
            getDropdownItem({
              label: 'Bring Forward',
              key: getDropdownMenuKey<ProjectTreeData>(
                contextMenuActionKeys.tableForward,
                childData
              ),
            }),
            getDropdownItem({
              label: 'Bring to Front',
              key: getDropdownMenuKey<ProjectTreeData>(
                contextMenuActionKeys.tableToFront,
                childData
              ),
            }),
            getDropdownItem({
              label: 'Send Backward',
              key: getDropdownMenuKey<ProjectTreeData>(
                contextMenuActionKeys.tableBackward,
                childData
              ),
            }),
            getDropdownItem({
              label: 'Send To Back',
              key: getDropdownMenuKey<ProjectTreeData>(
                contextMenuActionKeys.tableToBack,
                childData
              ),
            }),
          ],
        }),
        getDropdownItem({
          label: 'Orientation',
          key: 'Orientation',
          children: [
            getCheckboxDropdownSubmenuItem(
              {
                label: 'Horizontal',
                key: getDropdownMenuKey<ProjectTreeData>(
                  contextMenuActionKeys.flipTableHorizontal,
                  childData
                ),
              },
              isTableHorizontal
            ),
            getCheckboxDropdownSubmenuItem(
              {
                label: 'Vertical',
                key: getDropdownMenuKey<ProjectTreeData>(
                  contextMenuActionKeys.flipTableVertical,
                  childData
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
              label: isTableHeaderHidden
                ? 'Show table header'
                : 'Hide table header',
              key: getDropdownMenuKey<ProjectTreeData>(
                contextMenuActionKeys.toggleTableNameHeader,
                childData
              ),
            }),
            getDropdownItem({
              label: isTableFieldsHidden
                ? 'Show fields header'
                : 'Hide fields header',
              key: getDropdownMenuKey<ProjectTreeData>(
                contextMenuActionKeys.toggleTableFieldsHeader,
                childData
              ),
            }),
          ],
        }),
        getDropdownDivider(),
        getDropdownItem({
          key: getDropdownMenuKey<ProjectTreeData>(
            contextMenuActionKeys.openTableInEditor,
            childData
          ),
          label: 'Open in editor',
        }),
      ].filter(Boolean) as MenuItem[];
    },
    [findContext]
  );

  const getFieldActions = useCallback(
    (childData: ProjectTreeData): MenuItem[] => {
      const { tableName, fieldName } = childData;

      let isKey = undefined;
      let isDim = undefined;
      let isManual = undefined;
      let isDynamic = undefined;
      let isNested = undefined;
      let isPeriodSeries = undefined;
      let colSize = 0;
      let isTableHorizontal = false;
      let isTableHeaderHidden = false;
      let isTableFieldsHidden = false;

      if (tableName && fieldName) {
        const context = findContext(tableName, fieldName);

        if (context) {
          isKey = context.field?.isKey;
          isDim = context.field?.isDim;
          isDynamic = context.field?.isDynamic;
          isManual = context.table.isManual();
          colSize = context.field?.getSize() ?? 1;
          isTableHorizontal = context.table.getIsTableDirectionHorizontal();
          isTableHeaderHidden = context.table.getIsTableHeaderHidden();
          isTableFieldsHidden = context.table.getIsTableFieldsHidden();
        }

        if (viewGridData) {
          const tableData = viewGridData.getTableData(tableName);

          if (tableData) {
            const type = tableData.types[fieldName];
            isNested = tableData.nestedColumnNames.has(fieldName);
            isPeriodSeries = type === ColumnDataType.PERIOD_SERIES;
          }
        }
      }
      const showCollapseNestedField = !isManual && isDim;
      const showExpandNestedField =
        !isManual && !isDim && (isNested || isPeriodSeries);

      const action = isKey
        ? contextMenuActionKeys.removeKey
        : contextMenuActionKeys.addKey;

      return [
        getDropdownItem({
          key: getDropdownMenuKey<ProjectTreeData>(
            contextMenuActionKeys.selectField,
            childData
          ),
          label: 'Select field',
        }),
        getDropdownDivider(),
        getDropdownItem({
          key: getDropdownMenuKey<ProjectTreeData>(
            contextMenuActionKeys.editFormula,
            childData
          ),
          label: 'Edit formula',
        }),
        getDropdownItem({
          key: getDropdownMenuKey<ProjectTreeData>(
            contextMenuActionKeys.renameField,
            childData
          ),
          label: 'Rename field',
          disabled: isDynamic,
        }),
        ...(isKey !== undefined
          ? [
              getDropdownDivider(),

              getDropdownItem({
                key: getDropdownMenuKey<ProjectTreeData>(action, childData),
                label: isKey ? 'Remove key' : 'Add key',
                disabled: isDynamic,
              }),
            ]
          : []),
        showCollapseNestedField
          ? getDropdownItem({
              key: getDropdownMenuKey<ProjectTreeData>(
                contextMenuActionKeys.removeDimension,
                childData
              ),
              label: 'Collapse nested field',
              disabled: isDynamic,
            })
          : undefined,

        showExpandNestedField
          ? getDropdownItem({
              key: getDropdownMenuKey<ProjectTreeData>(
                contextMenuActionKeys.addDimension,
                childData
              ),
              label: 'Expand nested field',
              disabled: isDynamic,
            })
          : undefined,
        getDropdownDivider(),
        getDropdownItem({
          key: 'InsertMenu',
          label: 'Insert',
          children: [
            getDropdownItem({
              label: isTableHorizontal ? 'Field above' : 'Field to the left',
              key: getDropdownMenuKey<ProjectTreeData>(
                contextMenuActionKeys.addFieldToLeft,
                childData
              ),
            }),
            getDropdownItem({
              label: isTableHorizontal ? 'Field below' : 'Field to the right',
              key: getDropdownMenuKey<ProjectTreeData>(
                contextMenuActionKeys.addFieldToRight,
                childData
              ),
            }),
            getDropdownItem({
              label: 'New row',
              key: getDropdownMenuKey<ProjectTreeData>(
                contextMenuActionKeys.addRow,
                childData
              ),
              disabled: !isManual,
              tooltip: !isManual
                ? 'Only available for manual table'
                : undefined,
            }),
          ],
        }),
        getDropdownItem({
          label: 'Delete',
          key: 'Delete',
          children: [
            getDropdownItem({
              key: getDropdownMenuKey<ProjectTreeData>(
                contextMenuActionKeys.deleteField,
                childData
              ),
              label: 'Delete field',
            }),
            getDropdownItem({
              label: 'Delete table',
              key: getDropdownMenuKey<ProjectTreeData>(
                contextMenuActionKeys.deleteTable,
                childData
              ),
            }),
          ],
        }),
        getDropdownItem({
          label: 'Field',
          key: 'Field',
          children: [
            getDropdownItem({
              key: getDropdownMenuKey<ProjectTreeData>(
                contextMenuActionKeys.swapLeft,
                childData
              ),
              label: 'Swap left',
            }),
            getDropdownItem({
              key: getDropdownMenuKey<ProjectTreeData>(
                contextMenuActionKeys.swapRight,
                childData
              ),
              label: 'Swap right',
            }),
            getDropdownDivider(),
            !isDynamic
              ? getDropdownItem({
                  key: getDropdownMenuKey<ProjectTreeData>(
                    contextMenuActionKeys.increaseFieldWidth,
                    childData
                  ),
                  label: 'Increase field width',
                })
              : undefined,
            !isDynamic
              ? getDropdownItem({
                  key: getDropdownMenuKey<ProjectTreeData>(
                    contextMenuActionKeys.decreaseFieldWidth,
                    childData
                  ),
                  label: 'Decrease field width',
                  disabled: colSize <= 1,
                })
              : undefined,
          ].filter(Boolean) as ItemType[],
        }),
        getDropdownDivider(),
        getDropdownItem({
          label: 'Orientation',
          key: 'Orientation',
          children: [
            getCheckboxDropdownSubmenuItem(
              {
                label: 'Horizontal',
                key: getDropdownMenuKey<ProjectTreeData>(
                  contextMenuActionKeys.flipTableHorizontal,
                  childData
                ),
              },
              isTableHorizontal
            ),
            getCheckboxDropdownSubmenuItem(
              {
                label: 'Vertical',
                key: getDropdownMenuKey<ProjectTreeData>(
                  contextMenuActionKeys.flipTableVertical,
                  childData
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
              label: isTableHeaderHidden
                ? 'Show table header'
                : 'Hide table header',
              key: getDropdownMenuKey<ProjectTreeData>(
                contextMenuActionKeys.toggleTableNameHeader,
                childData
              ),
            }),
            getDropdownItem({
              label: isTableFieldsHidden
                ? 'Show fields header'
                : 'Hide fields header',
              key: getDropdownMenuKey<ProjectTreeData>(
                contextMenuActionKeys.toggleTableFieldsHeader,
                childData
              ),
            }),
          ],
        }),
        getDropdownDivider(),
        getDropdownItem({
          label: 'Open in Editor',
          key: getDropdownMenuKey<ProjectTreeData>(
            contextMenuActionKeys.openFieldInEditor,
            childData
          ),
        }),
      ].filter(Boolean) as MenuItem[];
    },
    [findContext, viewGridData]
  );

  const createContextMenuItems = useCallback(
    (
      info: {
        event: React.MouseEvent<Element, MouseEvent>;
        node: EventDataNode<DataNode>;
      },
      childData: ProjectTreeChildData
    ) => {
      const key = info.node.key as string;
      let menuItems: MenuItem[] = [];

      // Project actions, deep = 2
      if (key.toString().split('-').length === 2) {
        menuItems = menuItems.concat(getProjectActions());
      }

      // Sheet actions, deep = 3
      if (key.toString().split('-').length === 3) {
        menuItems = menuItems.concat(getSheetActions(childData[key]));
      }

      // Table actions, deep = 4
      if (key.toString().split('-').length === 4) {
        menuItems = menuItems.concat(getTableActions(childData[key]));
      }

      // Field actions, deep = 5
      if (key.toString().split('-').length === 5) {
        menuItems = menuItems.concat(getFieldActions(childData[key]));
      }

      setItems(menuItems);
    },
    [getFieldActions, getProjectActions, getSheetActions, getTableActions]
  );

  const moveToNode = useCallback(
    (
      childData: {
        fieldName?: string;
        tableName?: string;
        sheetName?: string;
      },
      tableSideEffect?: OpenTableSideEffect,
      fieldSideEffect?: OpenFieldSideEffect
    ) => {
      const { fieldName, tableName, sheetName } = childData;

      if (fieldName && tableName && sheetName) {
        if (isPointClickMode) {
          handlePointClickSelectValue({
            tableName,
            fieldName,
          });
        } else {
          openField(sheetName, tableName, fieldName, fieldSideEffect);
        }

        return;
      }

      if (tableName && sheetName) {
        if (isPointClickMode) {
          handlePointClickSelectValue({
            tableName,
          });
        } else {
          openTable(sheetName, tableName, tableSideEffect);
        }

        return;
      }

      if (sheetName && projectName && !isPointClickMode) {
        openSheet({ sheetName });

        return;
      }
    },
    [
      handlePointClickSelectValue,
      isPointClickMode,
      openField,
      openSheet,
      openTable,
      projectName,
    ]
  );

  const onContextMenuClick = useCallback(
    (info: MenuInfo) => {
      const { action, data } = parseContextMenuKey(info.key);

      switch (action) {
        case contextMenuActionKeys.deleteProject:
          projectAction.deleteProjectAction();
          break;
        case contextMenuActionKeys.renameProject:
          projectAction.renameProjectAction();
          break;
        case contextMenuActionKeys.putSheet:
          projectAction.createWorksheetAction();
          break;
        case contextMenuActionKeys.renameSheet:
          projectAction.renameWorksheetAction(data.sheetName);
          break;
        case contextMenuActionKeys.deleteSheet:
          projectAction.deleteWorksheetAction(data.sheetName);
          break;
        case contextMenuActionKeys.deleteTable:
          if (data.tableName) {
            deleteTable(data.tableName);
          }
          break;
        case contextMenuActionKeys.deleteField:
          if (data.tableName && data.fieldName) {
            deleteField(data.tableName, data.fieldName);
          }
          break;
        case contextMenuActionKeys.renameTable:
          if (data.tableName) {
            renameTableCallback.current?.(data);
          }
          break;
        case contextMenuActionKeys.moveTable:
          moveToNode(data, 'move');
          break;
        case contextMenuActionKeys.toggleTableNameHeader:
          if (data.tableName) {
            onToggleTableHeaderVisibility(data.tableName);
          }
          break;
        case contextMenuActionKeys.toggleTableFieldsHeader:
          if (data.tableName) {
            onToggleTableFieldsVisibility(data.tableName);
          }
          break;
        case contextMenuActionKeys.flipTableHorizontal:
        case contextMenuActionKeys.flipTableVertical:
          if (data.tableName) {
            onFlipTable(data.tableName);
          }
          break;
        case contextMenuActionKeys.createDerivedTable:
          if (data.tableName) {
            createDerivedTable(data.tableName);
          }
          break;
        case contextMenuActionKeys.cloneTable:
          if (data.tableName) {
            onCloneTable(data.tableName);
          }
          break;
        case contextMenuActionKeys.convertToChart:
          if (data.tableName) {
            convertToChart(data.tableName);
          }
          break;
        case contextMenuActionKeys.convertToTable:
          if (data.tableName) {
            convertToTable(data.tableName);
          }
          break;
        case contextMenuActionKeys.addChart:
          if (data.tableName) {
            addChart(data.tableName);
          }
          break;
        case contextMenuActionKeys.swapRight:
          if (data.tableName && data.fieldName) {
            swapFieldsHandler(data.tableName, data.fieldName, 'right');
          }
          break;
        case contextMenuActionKeys.swapLeft:
          if (data.tableName && data.fieldName) {
            swapFieldsHandler(data.tableName, data.fieldName, 'left');
          }
          break;
        case contextMenuActionKeys.increaseFieldWidth:
          if (data.tableName && data.fieldName) {
            onIncreaseFieldColumnSize?.(data.tableName, data.fieldName);
          }
          break;
        case contextMenuActionKeys.decreaseFieldWidth:
          if (data.tableName && data.fieldName) {
            onDecreaseFieldColumnSize?.(data.tableName, data.fieldName);
          }
          break;
        case contextMenuActionKeys.renameField:
          if (data.tableName && data.fieldName) {
            renameFieldCallback.current?.(data);
          }
          break;
        case contextMenuActionKeys.addField:
          if (data.tableName) {
            addField(data.tableName, defaultFieldName, { withSelection: true });
          }
          break;
        case contextMenuActionKeys.addRow:
          if (data.tableName) {
            addTableRowToEnd(data.tableName, '');
          }
          break;
        case contextMenuActionKeys.editFormula:
          moveToNode(data, undefined, 'editFormula');
          break;
        case contextMenuActionKeys.addKey:
          if (data.tableName && data.fieldName) {
            addKey(data.tableName, data.fieldName);
          }
          break;
        case contextMenuActionKeys.removeKey:
          if (data.tableName && data.fieldName) {
            removeKey(data.tableName, data.fieldName);
          }
          break;
        case contextMenuActionKeys.addDimension:
          if (data.tableName && data.fieldName) {
            addDimension(data.tableName, data.fieldName);
          }
          break;
        case contextMenuActionKeys.removeDimension:
          if (data.tableName && data.fieldName) {
            removeDimension(data.tableName, data.fieldName);
          }
          break;
        case contextMenuActionKeys.selectField:
        case contextMenuActionKeys.selectTable:
        case contextMenuActionKeys.selectWorksheet: {
          moveToNode(data);

          return;
        }
        case contextMenuActionKeys.openTableInEditor: {
          if (data.tableName) {
            openInEditor(data.tableName);
          }
          break;
        }
        case contextMenuActionKeys.openFieldInEditor:
          if (data.tableName && data.fieldName) {
            openInEditor(data.tableName, data.fieldName);
          }
          break;
        case contextMenuActionKeys.addFieldToLeft:
          if (data.tableName && data.fieldName) {
            addField(data.tableName, defaultFieldName, {
              direction: 'left',
              insertFromFieldName: data.fieldName,
              withSelection: true,
            });
          }
          break;
        case contextMenuActionKeys.addFieldToRight:
          if (data.tableName && data.fieldName) {
            addField(data.tableName, defaultFieldName, {
              direction: 'right',
              insertFromFieldName: data.fieldName,
              withSelection: true,
            });
          }
          break;
        case contextMenuActionKeys.tableToBack:
        case contextMenuActionKeys.tableForward:
        case contextMenuActionKeys.tableToFront:
        case contextMenuActionKeys.tableBackward:
          if (data.tableName && arrangeTableActions[action]) {
            arrangeTable(data.tableName, arrangeTableActions[action]);
          }
          break;
        default:
          break;
      }
    },
    [
      arrangeTable,
      projectAction,
      moveToNode,
      deleteTable,
      deleteField,
      renameTableCallback,
      onToggleTableHeaderVisibility,
      onToggleTableFieldsVisibility,
      onFlipTable,
      createDerivedTable,
      onCloneTable,
      convertToChart,
      convertToTable,
      addChart,
      swapFieldsHandler,
      onIncreaseFieldColumnSize,
      onDecreaseFieldColumnSize,
      renameFieldCallback,
      addField,
      addTableRowToEnd,
      addKey,
      removeKey,
      addDimension,
      removeDimension,
      openInEditor,
    ]
  );

  return { items, onContextMenuClick, createContextMenuItems, moveToNode };
};
