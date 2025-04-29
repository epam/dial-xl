import { ItemType } from 'antd/es/menu/interface';
import { DataNode, EventDataNode } from 'antd/es/tree';
import { MenuInfo } from 'rc-menu/lib/interface';
import { useCallback, useContext, useState } from 'react';

import Icon from '@ant-design/icons';
import { ContextMenuKeyData } from '@frontend/canvas-spreadsheet';
import {
  chartItems,
  ChartType,
  ColumnDataType,
  defaultFieldName,
  getCheckboxDropdownSubmenuItem,
  getDropdownDivider,
  getDropdownItem,
  getDropdownMenuKey,
  isOtherCellsInFieldDataHasOverrides,
  isTextType,
  makeKeyFieldWithOverridesMessage,
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
  useChartEditDsl,
  useCreateTableDsl,
  useDeleteEntityDsl,
  useDownloadTable,
  useDSLUtils,
  useFieldEditDsl,
  useGridApi,
  useManualEditDSL,
  useOpenInEditor,
  usePointClickSelectValue,
  useProjectActions,
  useTableEditDsl,
} from '../../../hooks';
import { useAddTableRow } from '../../../hooks/EditDsl/useAddTableRow';

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
  downloadTable: 'downloadTable',
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
  fieldsAutoFit: 'fieldsAutoFit',
  removeFieldSizes: 'removeFieldSizes',
  renameField: 'renameField',
  editFormula: 'editFormula',
  removeKey: 'removeKey',
  addKey: 'addKey',
  addIndex: 'addIndex',
  removeIndex: 'removeIndex',
  addDescription: 'addDescription',
  removeDescription: 'removeDescription',
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
  chartType?: ChartType;
  descriptionFieldName?: string;
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
  const { onCloneTable } = useManualEditDSL();
  const { deleteField } = useDeleteEntityDsl();
  const { downloadTable } = useDownloadTable();
  const {
    addField,
    changeFieldDimension,
    changeFieldKey,
    changeFieldDescription,
    changeFieldIndex,
    onIncreaseFieldColumnSize,
    onDecreaseFieldColumnSize,
    autoFitTableFields,
    removeFieldSizes,
  } = useFieldEditDsl();
  const {
    arrangeTable,
    convertToChart,
    convertToTable,
    deleteTable,
    flipTable,
    swapFieldsByDirection,
    toggleTableTitleOrHeaderVisibility,
  } = useTableEditDsl();
  const { addChart } = useChartEditDsl();
  const { createDerivedTable } = useCreateTableDsl();
  const { addTableRowToEnd } = useAddTableRow();
  const { findContext } = useDSLUtils();
  const { handlePointClickSelectValue } = usePointClickSelectValue();
  const { openInEditor } = useOpenInEditor();
  const gridApi = useGridApi();

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
      let chartType = undefined;

      if (tableName) {
        const context = findContext(tableName);

        if (context) {
          isChart = context.table.isChart();
          isTableHeaderHidden = context.table.getIsTableHeaderHidden();
          isTableFieldsHidden = context.table.getIsTableFieldsHidden();
          isTableHorizontal = context.table.getIsTableDirectionHorizontal();
          isManual = context.table.isManual();
          chartType = context.table.getChartType();
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
          key: getDropdownMenuKey<ProjectTreeData>(
            contextMenuActionKeys.downloadTable,
            childData
          ),
          label: 'Download table',
        }),
        getDropdownDivider(),

        getDropdownItem({
          label: 'Insert',
          key: 'Insert',
          children: [
            getDropdownItem({
              label: 'New column',
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

        isChart
          ? getDropdownItem({
              label: 'Convert to table',
              key: getDropdownMenuKey<ContextMenuKeyData>(
                contextMenuActionKeys.convertToTable,
                childData
              ),
            })
          : null,

        getDropdownItem({
          label: 'Convert to chart',
          key: 'ConvertToChart',
          children: [
            ...chartItems
              .filter((i) => i.type !== chartType)
              .map((item) => {
                return getDropdownItem({
                  label: item.label,
                  key: getDropdownMenuKey<ContextMenuKeyData>(
                    contextMenuActionKeys.convertToChart,
                    {
                      ...childData,
                      chartType: item.type,
                    }
                  ),
                  icon: (
                    <Icon
                      className="text-textSecondary w-[18px]"
                      component={() => item.icon}
                    />
                  ),
                });
              }),
          ],
        }),
        !isChart
          ? getDropdownItem({
              label: 'Add chart',
              key: 'AddChart',
              children: [
                ...chartItems.map((item) => {
                  return getDropdownItem({
                    label: item.label,
                    key: getDropdownMenuKey<ContextMenuKeyData>(
                      contextMenuActionKeys.addChart,
                      {
                        ...childData,
                        chartType: item.type,
                      }
                    ),
                    icon: (
                      <Icon
                        className="text-textSecondary w-[18px]"
                        component={() => item.icon}
                      />
                    ),
                  });
                }),
              ],
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
        !isChart
          ? getDropdownItem({
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
            })
          : undefined,
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
                ? isChart
                  ? 'Show chart legend'
                  : 'Show fields header'
                : isChart
                ? 'Hide chart legend'
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
      let isChart = undefined;
      let isFieldHasOverrides = false;
      let isIndex = false;
      let isText = false;
      let isDescription = false;
      let fieldNames: string[] = [];

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
          isChart = context.table.isChart();
          isIndex = !!context.field?.isIndex();
          isDescription = !!context.field?.isDescription();
          fieldNames = context.table.getFieldNames();

          const fieldHeaderPlacement =
            context.table.getFieldHeaderPlacement(fieldName);
          const fieldCell = fieldHeaderPlacement
            ? gridApi?.getCell(
                fieldHeaderPlacement.startCol,
                fieldHeaderPlacement.startRow
              )
            : undefined;
          isFieldHasOverrides = fieldCell
            ? fieldCell.isOverride ||
              isOtherCellsInFieldDataHasOverrides(fieldCell, gridApi?.getCell)
            : false;
        }

        if (viewGridData) {
          const tableData = viewGridData.getTableData(tableName);

          if (tableData) {
            const type = tableData.types[fieldName];
            isNested = tableData.nestedColumnNames.has(fieldName);
            isPeriodSeries = type === ColumnDataType.PERIOD_SERIES;
            isText = isTextType(type);
          }
        }
      }
      const showCollapseNestedField = !isManual && isDim;
      const showExpandNestedField =
        !isManual && !isDim && (isNested || isPeriodSeries);

      const keyAction = isKey
        ? contextMenuActionKeys.removeKey
        : contextMenuActionKeys.addKey;

      return [
        getDropdownItem({
          key: getDropdownMenuKey<ProjectTreeData>(
            contextMenuActionKeys.selectField,
            childData
          ),
          label: 'Select column',
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
          label: 'Rename column',
          disabled: isDynamic,
        }),
        getDropdownDivider(),
        getDropdownItem({
          key: 'Indices',
          label: 'Add/remove indices',
          children: [
            getDropdownItem({
              label: isKey ? 'Unmark as key column' : 'Mark as a key column',
              key: getDropdownMenuKey<ProjectTreeData>(keyAction, childData),
              disabled:
                isDynamic || (isFieldHasOverrides && !isManual && !isKey),
              tooltip:
                isFieldHasOverrides && !isManual && !isKey
                  ? makeKeyFieldWithOverridesMessage
                  : undefined,
            }),
            getDropdownItem({
              label: isIndex ? 'Remove an Index' : 'Add an Index',
              key: getDropdownMenuKey<ProjectTreeData>(
                isIndex
                  ? contextMenuActionKeys.removeIndex
                  : contextMenuActionKeys.addIndex,
                childData
              ),
              disabled: !isIndex && !isText,
              tooltip:
                !isIndex && !isText
                  ? 'Only available for text column'
                  : undefined,
            }),
            getDropdownItem({
              label: isIndex
                ? 'Add description'
                : 'Add an index with description',
              key: getDropdownMenuKey<ProjectTreeData>(
                contextMenuActionKeys.addDescription,
                childData
              ),
              disabled: !isText,
              tooltip: !isText ? 'Only available for text column' : undefined,
              children: fieldNames.map((descriptionFieldName) =>
                getDropdownItem({
                  label: descriptionFieldName,
                  key: getDropdownMenuKey<ProjectTreeData>(
                    contextMenuActionKeys.addDescription,
                    {
                      ...childData,
                      descriptionFieldName,
                    }
                  ),
                })
              ),
            }),
            isDescription
              ? getDropdownItem({
                  label: 'Remove description',
                  key: getDropdownMenuKey<ProjectTreeData>(
                    contextMenuActionKeys.removeDescription,
                    childData
                  ),
                })
              : null,
          ],
        }),
        showCollapseNestedField
          ? getDropdownItem({
              key: getDropdownMenuKey<ProjectTreeData>(
                contextMenuActionKeys.removeDimension,
                childData
              ),
              label: 'Collapse nested column',
              disabled: isDynamic,
            })
          : undefined,

        showExpandNestedField
          ? getDropdownItem({
              key: getDropdownMenuKey<ProjectTreeData>(
                contextMenuActionKeys.addDimension,
                childData
              ),
              label: 'Expand nested column',
              disabled: isDynamic,
            })
          : undefined,
        getDropdownDivider(),
        getDropdownItem({
          key: 'InsertMenu',
          label: 'Insert',
          children: [
            getDropdownItem({
              label: isTableHorizontal ? 'Column above' : 'Column to the left',
              key: getDropdownMenuKey<ProjectTreeData>(
                contextMenuActionKeys.addFieldToLeft,
                childData
              ),
            }),
            getDropdownItem({
              label: isTableHorizontal ? 'Column below' : 'Column to the right',
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
              label: 'Delete column',
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
          label: 'Column',
          key: 'Column',
          children: [
            getDropdownItem({
              key: getDropdownMenuKey<ProjectTreeData>(
                contextMenuActionKeys.swapLeft,
                childData
              ),
              label: isTableHorizontal ? 'Swap top' : 'Swap left',
            }),
            getDropdownItem({
              key: getDropdownMenuKey<ProjectTreeData>(
                contextMenuActionKeys.swapRight,
                childData
              ),
              label: isTableHorizontal ? 'Swap bottom' : 'Swap right',
            }),
            !isDynamic && !isTableHorizontal && getDropdownDivider(),
            !isDynamic && !isTableHorizontal
              ? getDropdownItem({
                  key: getDropdownMenuKey<ProjectTreeData>(
                    contextMenuActionKeys.increaseFieldWidth,
                    childData
                  ),
                  label: 'Increase column width',
                })
              : undefined,
            !isDynamic && !isTableHorizontal
              ? getDropdownItem({
                  key: getDropdownMenuKey<ProjectTreeData>(
                    contextMenuActionKeys.decreaseFieldWidth,
                    childData
                  ),
                  label: 'Decrease column width',
                  disabled: colSize <= 1,
                })
              : undefined,
            !isTableHorizontal && getDropdownDivider(),
            !isTableHorizontal &&
              getDropdownItem({
                key: getDropdownMenuKey<ProjectTreeData>(
                  contextMenuActionKeys.fieldsAutoFit,
                  childData
                ),
                label: 'Columns Auto Fit',
              }),
            !isTableHorizontal &&
              getDropdownItem({
                key: getDropdownMenuKey<ProjectTreeData>(
                  contextMenuActionKeys.removeFieldSizes,
                  childData
                ),
                label: 'Remove custom column sizes',
              }),
          ].filter(Boolean) as ItemType[],
        }),
        getDropdownDivider(),
        !isChart
          ? getDropdownItem({
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
            })
          : undefined,
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
                ? isChart
                  ? 'Show chart legend'
                  : 'Show fields header'
                : isChart
                ? 'Hide chart legend'
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
    [findContext, gridApi, viewGridData]
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
        case contextMenuActionKeys.downloadTable:
          if (data.tableName) {
            downloadTable(data.tableName);
          }
          break;
        case contextMenuActionKeys.toggleTableNameHeader:
          if (data.tableName) {
            toggleTableTitleOrHeaderVisibility(data.tableName, true);
          }
          break;
        case contextMenuActionKeys.toggleTableFieldsHeader:
          if (data.tableName) {
            toggleTableTitleOrHeaderVisibility(data.tableName, false);
          }
          break;
        case contextMenuActionKeys.flipTableHorizontal:
        case contextMenuActionKeys.flipTableVertical:
          if (data.tableName) {
            flipTable(data.tableName);
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
          if (data.tableName && data.chartType) {
            convertToChart(data.tableName, data.chartType);
          }
          break;
        case contextMenuActionKeys.convertToTable:
          if (data.tableName) {
            convertToTable(data.tableName);
          }
          break;
        case contextMenuActionKeys.addChart:
          if (data.tableName && data.chartType) {
            addChart(data.tableName, data.chartType);
          }
          break;
        case contextMenuActionKeys.swapRight:
          if (data.tableName && data.fieldName) {
            swapFieldsByDirection(data.tableName, data.fieldName, 'right');
          }
          break;
        case contextMenuActionKeys.swapLeft:
          if (data.tableName && data.fieldName) {
            swapFieldsByDirection(data.tableName, data.fieldName, 'left');
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
        case contextMenuActionKeys.fieldsAutoFit:
          if (data.tableName) {
            autoFitTableFields(data.tableName);
          }
          break;
        case contextMenuActionKeys.removeFieldSizes:
          if (data.tableName) {
            removeFieldSizes(data.tableName);
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
        case contextMenuActionKeys.removeKey:
          if (data.tableName && data.fieldName) {
            changeFieldKey(
              data.tableName,
              data.fieldName,
              action === contextMenuActionKeys.removeKey
            );
          }
          break;
        case contextMenuActionKeys.addDimension:
        case contextMenuActionKeys.removeDimension:
          if (data.tableName && data.fieldName) {
            changeFieldDimension(
              data.tableName,
              data.fieldName,
              action === contextMenuActionKeys.removeDimension
            );
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
        case contextMenuActionKeys.addIndex:
        case contextMenuActionKeys.removeIndex:
          if (data.tableName && data.fieldName) {
            const isRemove = action === contextMenuActionKeys.removeIndex;
            changeFieldIndex(data.tableName, data.fieldName, isRemove);
          }
          break;
        case contextMenuActionKeys.addDescription:
          if (data.tableName && data.fieldName && data.descriptionFieldName) {
            changeFieldDescription(
              data.tableName,
              data.fieldName,
              data.descriptionFieldName
            );
          }
          break;
        case contextMenuActionKeys.removeDescription:
          if (data.tableName && data.fieldName) {
            changeFieldDescription(data.tableName, data.fieldName, '', true);
          }
          break;
        default:
          break;
      }
    },
    [
      projectAction,
      moveToNode,
      deleteTable,
      deleteField,
      renameTableCallback,
      downloadTable,
      toggleTableTitleOrHeaderVisibility,
      flipTable,
      createDerivedTable,
      onCloneTable,
      convertToChart,
      convertToTable,
      addChart,
      swapFieldsByDirection,
      onIncreaseFieldColumnSize,
      onDecreaseFieldColumnSize,
      autoFitTableFields,
      removeFieldSizes,
      renameFieldCallback,
      addField,
      addTableRowToEnd,
      changeFieldKey,
      changeFieldDimension,
      openInEditor,
      arrangeTable,
      changeFieldIndex,
      changeFieldDescription,
    ]
  );

  return { items, onContextMenuClick, createContextMenuItems, moveToNode };
};
