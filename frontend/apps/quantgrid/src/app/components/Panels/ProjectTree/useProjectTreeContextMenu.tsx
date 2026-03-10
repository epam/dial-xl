import { ItemType } from 'antd/es/menu/interface';
import { DataNode, EventDataNode } from 'antd/es/tree';
import { useCallback, useContext, useState } from 'react';

import Icon from '@ant-design/icons';
import { ContextMenuKeyData } from '@frontend/canvas-spreadsheet';
import {
  chartItems,
  ChartType,
  ColumnDataType,
  defaultFieldName,
  disabledTooltips,
  getCheckboxDropdownSubmenuItem,
  getDropdownDivider,
  getDropdownItem,
  getDropdownMenuKey,
  isTextType,
  makeKeyFieldWithOverridesMessage,
  MenuItem,
  TableArrangeType,
} from '@frontend/common';
import { MenuInfo } from '@rc-component/menu/lib/interface';

import {
  AppSpreadsheetInteractionContext,
  ChatOverlayContext,
  InputsContext,
  OpenFieldSideEffect,
  OpenTableSideEffect,
  ProjectContext,
  ViewportContext,
} from '../../../context';
import {
  getControlType,
  isInputFormula,
  useChartEditDsl,
  useCreateTableDsl,
  useDeleteEntityDsl,
  useDownloadTable,
  useDSLUtils,
  useFieldEditDsl,
  useGridApi,
  useOpenInDetailsPanel,
  useOpenInEditor,
  usePointClickSelectValue,
  useProjectMode,
  useTableEditDsl,
  useWorksheetActions,
} from '../../../hooks';
import { useAddTableRow } from '../../../hooks/EditDsl/useAddTableRow';
import { useEditorStore } from '../../../store';

const contextMenuActionKeys = {
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
  openDetailsPanel: 'openDetailsPanel',
  switchInput: 'switchInput',
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

const projectTreePath = ['ProjectTreeContextMenu'];

export const useProjectTreeContextMenu = (
  renameTableCallback: React.RefObject<
    ((data: ProjectTreeChildData[string]) => void) | undefined
  >,
  renameFieldCallback: React.RefObject<
    ((data: ProjectTreeChildData[string]) => void) | undefined
  >,
) => {
  const isPointClickMode = useEditorStore((s) => s.isPointClickMode);
  const worksheetAction = useWorksheetActions();
  const { projectName, openSheet } = useContext(ProjectContext);
  const { answerIsGenerating } = useContext(ChatOverlayContext);
  const { onSwitchInput } = useContext(InputsContext);
  const { viewGridData } = useContext(ViewportContext);
  const { openField, openTable } = useContext(AppSpreadsheetInteractionContext);
  const { deleteField } = useDeleteEntityDsl();
  const { openInDetailsPanel } = useOpenInDetailsPanel();
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
    convertToTable,
    cloneTable,
    deleteTable,
    flipTable,
    swapFieldsByDirection,
    toggleTableTitleOrHeaderVisibility,
  } = useTableEditDsl();
  const { addChart, setChartType } = useChartEditDsl();
  const { createDerivedTable } = useCreateTableDsl();
  const { addTableRowToEnd } = useAddTableRow();
  const { findContext } = useDSLUtils();
  const { handlePointClickSelectValue } = usePointClickSelectValue();
  const { openInEditor } = useOpenInEditor();
  const gridApi = useGridApi();
  const { isDefaultMode } = useProjectMode();

  const [items, setItems] = useState<MenuItem[]>([]);

  const getSheetActions = useCallback(
    (childData: ProjectTreeData): MenuItem[] => {
      const sheetPath = [...projectTreePath, 'Sheet'];

      return [
        getDropdownItem({
          key: getDropdownMenuKey<ProjectTreeData>(
            contextMenuActionKeys.selectWorksheet,
            childData,
          ),
          fullPath: [...sheetPath, 'SelectWorksheet'],
          label: 'Select Worksheet',
        }),
        getDropdownItem({
          key: getDropdownMenuKey<ProjectTreeData>(
            contextMenuActionKeys.renameSheet,
            childData,
          ),
          fullPath: [...sheetPath, 'RenameWorksheet'],
          label: 'Rename Worksheet',
          disabled: !isDefaultMode || answerIsGenerating,
          tooltip: !isDefaultMode
            ? disabledTooltips.notAllowedChanges
            : answerIsGenerating
              ? disabledTooltips.answerIsGenerating
              : undefined,
        }),
        getDropdownItem({
          key: getDropdownMenuKey<ProjectTreeData>(
            contextMenuActionKeys.deleteSheet,
            childData,
          ),
          fullPath: [...sheetPath, 'DeleteWorksheet'],
          label: 'Delete Worksheet',
          disabled: !isDefaultMode || answerIsGenerating,
          tooltip: !isDefaultMode
            ? disabledTooltips.notAllowedChanges
            : answerIsGenerating
              ? disabledTooltips.answerIsGenerating
              : undefined,
        }),
      ];
    },
    [answerIsGenerating, isDefaultMode],
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

      const tablePath = [...projectTreePath, 'Table'];

      return [
        getDropdownItem({
          key: getDropdownMenuKey<ProjectTreeData>(
            contextMenuActionKeys.selectTable,
            childData,
          ),
          fullPath: [...tablePath, 'SelectTable'],
          label: isChart ? 'Select chart' : 'Select table',
        }),
        !isChart
          ? getDropdownItem({
              key: getDropdownMenuKey<ProjectTreeData>(
                contextMenuActionKeys.renameTable,
                childData,
              ),
              fullPath: [...tablePath, 'RenameTable'],
              label: 'Rename table',
            })
          : null,
        getDropdownItem({
          key: getDropdownMenuKey<ProjectTreeData>(
            contextMenuActionKeys.deleteTable,
            childData,
          ),
          fullPath: [...tablePath, 'DeleteTable'],
          label: isChart ? 'Delete chart' : 'Delete table',
        }),
        getDropdownItem({
          key: getDropdownMenuKey<ProjectTreeData>(
            contextMenuActionKeys.moveTable,
            childData,
          ),
          fullPath: [...tablePath, 'MoveTable'],
          label: isChart ? 'Move chart' : 'Move table',
        }),

        getDropdownDivider(),
        getDropdownItem({
          key: getDropdownMenuKey<ProjectTreeData>(
            contextMenuActionKeys.downloadTable,
            childData,
          ),
          fullPath: [...tablePath, 'DownloadTable'],
          label: 'Download table',
        }),
        getDropdownDivider(),

        !isChart
          ? getDropdownItem({
              label: 'Insert',
              key: 'Insert',
              fullPath: [...tablePath, 'Insert'],
              children: [
                getDropdownItem({
                  label: 'New column',
                  fullPath: [...tablePath, 'Insert', 'NewColumn'],
                  key: getDropdownMenuKey<ProjectTreeData>(
                    contextMenuActionKeys.addField,
                    childData,
                  ),
                }),
                getDropdownItem({
                  label: 'New row',
                  fullPath: [...tablePath, 'Insert', 'NewRow'],
                  key: getDropdownMenuKey<ProjectTreeData>(
                    contextMenuActionKeys.addRow,
                    childData,
                  ),
                  disabled: !isManual,
                  tooltip: !isManual
                    ? 'Only available for manual table'
                    : undefined,
                }),
              ],
            })
          : null,
        getDropdownItem({
          label: 'Clone table',
          fullPath: [...tablePath, 'CloneTable'],
          key: getDropdownMenuKey<ProjectTreeData>(
            contextMenuActionKeys.cloneTable,
            childData,
          ),
        }),
        getDropdownItem({
          key: getDropdownMenuKey<ProjectTreeData>(
            contextMenuActionKeys.createDerivedTable,
            childData,
          ),
          fullPath: [...tablePath, 'CreateDerived'],
          label: 'Create derived',
        }),

        isChart
          ? getDropdownItem({
              label: 'Convert to table',
              fullPath: [...tablePath, 'ConvertToTable'],
              key: getDropdownMenuKey<ContextMenuKeyData>(
                contextMenuActionKeys.convertToTable,
                childData,
              ),
            })
          : null,

        getDropdownItem({
          label: 'Convert to chart',
          key: 'ConvertToChart',
          fullPath: [...tablePath, 'ConvertToChart'],
          children: [
            ...chartItems
              .filter((i) => i.type !== chartType)
              .map((item) => {
                return getDropdownItem({
                  label: item.label,
                  fullPath: [...tablePath, 'ConvertToChart', item.type],
                  key: getDropdownMenuKey<ContextMenuKeyData>(
                    contextMenuActionKeys.convertToChart,
                    {
                      ...childData,
                      chartType: item.type,
                    },
                  ),
                  icon: (
                    <Icon
                      className="text-text-secondary w-[18px]"
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
              fullPath: [...tablePath, 'AddChart'],
              children: [
                ...chartItems.map((item) => {
                  return getDropdownItem({
                    label: item.label,
                    fullPath: [...tablePath, 'AddChart', item.type],
                    key: getDropdownMenuKey<ContextMenuKeyData>(
                      contextMenuActionKeys.addChart,
                      {
                        ...childData,
                        chartType: item.type,
                      },
                    ),
                    icon: (
                      <Icon
                        className="text-text-secondary w-[18px]"
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
          fullPath: [...tablePath, 'Arrange'],
          children: [
            getDropdownItem({
              label: 'Bring Forward',
              fullPath: [...tablePath, 'Arrange', 'BringForward'],
              key: getDropdownMenuKey<ProjectTreeData>(
                contextMenuActionKeys.tableForward,
                childData,
              ),
            }),
            getDropdownItem({
              label: 'Bring to Front',
              fullPath: [...tablePath, 'Arrange', 'BringToFront'],
              key: getDropdownMenuKey<ProjectTreeData>(
                contextMenuActionKeys.tableToFront,
                childData,
              ),
            }),
            getDropdownItem({
              label: 'Send Backward',
              fullPath: [...tablePath, 'Arrange', 'SendBackward'],
              key: getDropdownMenuKey<ProjectTreeData>(
                contextMenuActionKeys.tableBackward,
                childData,
              ),
            }),
            getDropdownItem({
              label: 'Send To Back',
              fullPath: [...tablePath, 'Arrange', 'SendToBack'],
              key: getDropdownMenuKey<ProjectTreeData>(
                contextMenuActionKeys.tableToBack,
                childData,
              ),
            }),
          ],
        }),
        !isChart
          ? getDropdownItem({
              label: 'Orientation',
              key: 'Orientation',
              fullPath: [...tablePath, 'Orientation'],
              children: [
                getCheckboxDropdownSubmenuItem(
                  {
                    label: 'Horizontal',
                    fullPath: [...tablePath, 'Orientation', 'Horizontal'],
                    key: getDropdownMenuKey<ProjectTreeData>(
                      contextMenuActionKeys.flipTableHorizontal,
                      childData,
                    ),
                  },
                  isTableHorizontal,
                ),
                getCheckboxDropdownSubmenuItem(
                  {
                    label: 'Vertical',
                    fullPath: [...tablePath, 'Orientation', 'Vertical'],
                    key: getDropdownMenuKey<ProjectTreeData>(
                      contextMenuActionKeys.flipTableVertical,
                      childData,
                    ),
                  },
                  !isTableHorizontal,
                ),
              ],
            })
          : undefined,
        hideItem(
          tablePath,
          isTableHeaderHidden,
          isTableFieldsHidden,
          !!isChart,
          childData,
        ),
        getDropdownDivider(),
        ...(openDetails(tablePath, true, childData) || []),
      ].filter(Boolean) as MenuItem[];
    },
    [findContext],
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
      let isInput = false;
      let isControl = false;

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
          isControl = !!getControlType(
            context.field?.expressionMetadata?.text || '',
          );
          isInput = isInputFormula(
            context.field?.expressionMetadata?.text || '',
          );

          const fieldHeaderPlacement =
            context.table.getFieldHeaderPlacement(fieldName);
          const fieldCell = fieldHeaderPlacement
            ? gridApi?.getCell(
                fieldHeaderPlacement.startCol,
                fieldHeaderPlacement.startRow,
              )
            : undefined;
          isFieldHasOverrides = fieldCell
            ? fieldCell.isOverride || !!fieldCell.field?.hasOverrides
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

      const fieldPath = [...projectTreePath, 'Field'];

      return [
        getDropdownItem({
          key: getDropdownMenuKey<ProjectTreeData>(
            contextMenuActionKeys.selectField,
            childData,
          ),
          fullPath: [...fieldPath, 'SelectColumn'],
          label: 'Select column',
        }),
        getDropdownDivider(),
        getDropdownItem({
          key: getDropdownMenuKey<ProjectTreeData>(
            contextMenuActionKeys.editFormula,
            childData,
          ),
          fullPath: [...fieldPath, 'EditFormula'],
          label: 'Edit formula',
        }),
        isInput
          ? getDropdownItem({
              key: getDropdownMenuKey<ProjectTreeData>(
                contextMenuActionKeys.switchInput,
                childData,
              ),
              fullPath: [...fieldPath, 'SwitchInput'],
              label: 'Switch input',
            })
          : null,
        getDropdownItem({
          key: getDropdownMenuKey<ProjectTreeData>(
            contextMenuActionKeys.renameField,
            childData,
          ),
          fullPath: [...fieldPath, 'RenameColumn'],
          label: 'Rename column',
          disabled: isDynamic,
        }),
        !isControl ? getDropdownDivider() : null,
        !isControl
          ? getDropdownItem({
              key: 'Indices',
              label: 'Index',
              fullPath: [...fieldPath, 'Index'],
              children: [
                getDropdownItem({
                  label: isKey
                    ? 'Unmark as key column'
                    : 'Mark as a key column',
                  fullPath: [...fieldPath, 'Index', 'ToggleKey'],
                  key: getDropdownMenuKey<ProjectTreeData>(
                    keyAction,
                    childData,
                  ),
                  disabled:
                    isDynamic || (isFieldHasOverrides && !isManual && !isKey),
                  tooltip:
                    isFieldHasOverrides && !isManual && !isKey
                      ? makeKeyFieldWithOverridesMessage
                      : undefined,
                }),
                getDropdownItem({
                  label: isIndex ? 'Remove an Index' : 'Add an Index',
                  fullPath: [...fieldPath, 'Index', 'ToggleIndex'],
                  key: getDropdownMenuKey<ProjectTreeData>(
                    isIndex
                      ? contextMenuActionKeys.removeIndex
                      : contextMenuActionKeys.addIndex,
                    childData,
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
                  fullPath: [...fieldPath, 'Index', 'AddDescription'],
                  key: getDropdownMenuKey<ProjectTreeData>(
                    contextMenuActionKeys.addDescription,
                    childData,
                  ),
                  disabled: !isText,
                  tooltip: !isText
                    ? 'Only available for text column'
                    : undefined,
                  children: fieldNames.map((descriptionFieldName) =>
                    getDropdownItem({
                      label: descriptionFieldName,
                      fullPath: [
                        ...fieldPath,
                        'Index',
                        'AddDescription',
                        descriptionFieldName,
                      ],
                      key: getDropdownMenuKey<ProjectTreeData>(
                        contextMenuActionKeys.addDescription,
                        {
                          ...childData,
                          descriptionFieldName,
                        },
                      ),
                    }),
                  ),
                }),
                isDescription
                  ? getDropdownItem({
                      label: 'Remove description',
                      fullPath: [...fieldPath, 'Index', 'RemoveDescription'],
                      key: getDropdownMenuKey<ProjectTreeData>(
                        contextMenuActionKeys.removeDescription,
                        childData,
                      ),
                    })
                  : null,
              ],
            })
          : null,
        showCollapseNestedField
          ? getDropdownItem({
              key: getDropdownMenuKey<ProjectTreeData>(
                contextMenuActionKeys.removeDimension,
                childData,
              ),
              fullPath: [...fieldPath, 'CollapseNestedColumn'],
              label: 'Collapse nested column',
              disabled: isDynamic,
            })
          : undefined,

        showExpandNestedField
          ? getDropdownItem({
              key: getDropdownMenuKey<ProjectTreeData>(
                contextMenuActionKeys.addDimension,
                childData,
              ),
              fullPath: [...fieldPath, 'ExpandNestedColumn'],
              label: 'Expand nested column',
              disabled: isDynamic,
            })
          : undefined,
        getDropdownDivider(),
        getDropdownItem({
          key: 'InsertMenu',
          label: 'Insert',
          fullPath: [...fieldPath, 'Insert'],
          children: [
            getDropdownItem({
              label: isTableHorizontal ? 'Column above' : 'Column to the left',
              fullPath: [...fieldPath, 'Insert', 'ColumnLeft'],
              key: getDropdownMenuKey<ProjectTreeData>(
                contextMenuActionKeys.addFieldToLeft,
                childData,
              ),
            }),
            getDropdownItem({
              label: isTableHorizontal ? 'Column below' : 'Column to the right',
              fullPath: [...fieldPath, 'Insert', 'ColumnRight'],
              key: getDropdownMenuKey<ProjectTreeData>(
                contextMenuActionKeys.addFieldToRight,
                childData,
              ),
            }),
            getDropdownItem({
              label: 'New row',
              fullPath: [...fieldPath, 'Insert', 'NewRow'],
              key: getDropdownMenuKey<ProjectTreeData>(
                contextMenuActionKeys.addRow,
                childData,
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
          fullPath: [...fieldPath, 'Delete'],
          children: [
            getDropdownItem({
              key: getDropdownMenuKey<ProjectTreeData>(
                contextMenuActionKeys.deleteField,
                childData,
              ),
              fullPath: [...fieldPath, 'Delete', 'DeleteColumn'],
              label: 'Delete column',
            }),
            getDropdownItem({
              label: 'Delete table',
              fullPath: [...fieldPath, 'Delete', 'DeleteTable'],
              key: getDropdownMenuKey<ProjectTreeData>(
                contextMenuActionKeys.deleteTable,
                childData,
              ),
            }),
          ],
        }),
        getDropdownItem({
          label: 'Column',
          key: 'Column',
          fullPath: [...fieldPath, 'Column'],
          children: [
            getDropdownItem({
              key: getDropdownMenuKey<ProjectTreeData>(
                contextMenuActionKeys.swapLeft,
                childData,
              ),
              fullPath: [...fieldPath, 'Column', 'SwapLeft'],
              label: isTableHorizontal ? 'Swap top' : 'Swap left',
            }),
            getDropdownItem({
              key: getDropdownMenuKey<ProjectTreeData>(
                contextMenuActionKeys.swapRight,
                childData,
              ),
              fullPath: [...fieldPath, 'Column', 'SwapRight'],
              label: isTableHorizontal ? 'Swap bottom' : 'Swap right',
            }),
            !isDynamic && !isTableHorizontal && getDropdownDivider(),
            !isDynamic && !isTableHorizontal
              ? getDropdownItem({
                  key: getDropdownMenuKey<ProjectTreeData>(
                    contextMenuActionKeys.increaseFieldWidth,
                    childData,
                  ),
                  fullPath: [...fieldPath, 'Column', 'IncreaseColumnWidth'],
                  label: 'Increase column width',
                })
              : undefined,
            !isDynamic && !isTableHorizontal
              ? getDropdownItem({
                  key: getDropdownMenuKey<ProjectTreeData>(
                    contextMenuActionKeys.decreaseFieldWidth,
                    childData,
                  ),
                  fullPath: [...fieldPath, 'Column', 'DecreaseColumnWidth'],
                  label: 'Decrease column width',
                  disabled: colSize <= 1,
                })
              : undefined,
            !isTableHorizontal && getDropdownDivider(),
            !isTableHorizontal &&
              getDropdownItem({
                key: getDropdownMenuKey<ProjectTreeData>(
                  contextMenuActionKeys.fieldsAutoFit,
                  childData,
                ),
                fullPath: [...fieldPath, 'Column', 'ColumnsAutoFit'],
                label: 'Columns Auto Fit',
              }),
            !isTableHorizontal &&
              getDropdownItem({
                key: getDropdownMenuKey<ProjectTreeData>(
                  contextMenuActionKeys.removeFieldSizes,
                  childData,
                ),
                fullPath: [...fieldPath, 'Column', 'RemoveCustomColumnSizes'],
                label: 'Remove custom column sizes',
              }),
          ].filter(Boolean) as ItemType[],
        }),
        getDropdownDivider(),
        !isChart
          ? getDropdownItem({
              label: 'Orientation',
              key: 'Orientation',
              fullPath: [...fieldPath, 'Orientation'],
              children: [
                getCheckboxDropdownSubmenuItem(
                  {
                    label: 'Horizontal',
                    fullPath: [...fieldPath, 'Orientation', 'Horizontal'],
                    key: getDropdownMenuKey<ProjectTreeData>(
                      contextMenuActionKeys.flipTableHorizontal,
                      childData,
                    ),
                  },
                  isTableHorizontal,
                ),
                getCheckboxDropdownSubmenuItem(
                  {
                    label: 'Vertical',
                    fullPath: [...fieldPath, 'Orientation', 'Vertical'],
                    key: getDropdownMenuKey<ProjectTreeData>(
                      contextMenuActionKeys.flipTableVertical,
                      childData,
                    ),
                  },
                  !isTableHorizontal,
                ),
              ],
            })
          : undefined,
        hideItem(
          fieldPath,
          isTableHeaderHidden,
          isTableFieldsHidden,
          !!isChart,
          childData,
        ),
        getDropdownDivider(),
        ...(openDetails(fieldPath, false, childData) || []),
      ].filter(Boolean) as MenuItem[];
    },
    [findContext, gridApi, viewGridData],
  );

  const createContextMenuItems = useCallback(
    (
      info: {
        event: React.MouseEvent<Element, MouseEvent>;
        node: EventDataNode<DataNode>;
      },
      childData: ProjectTreeChildData,
    ) => {
      const key = info.node.key as string;
      let menuItems: MenuItem[] = [];

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
    [getFieldActions, getSheetActions, getTableActions],
  );

  const moveToNode = useCallback(
    (
      childData: {
        fieldName?: string;
        tableName?: string;
        sheetName?: string;
      },
      tableSideEffect?: OpenTableSideEffect,
      fieldSideEffect?: OpenFieldSideEffect,
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
    ],
  );

  const onContextMenuClick = useCallback(
    (info: MenuInfo) => {
      const { action, data } = parseContextMenuKey(info.key);

      switch (action) {
        case contextMenuActionKeys.putSheet:
          worksheetAction.createWorksheetAction();
          break;
        case contextMenuActionKeys.renameSheet:
          worksheetAction.renameWorksheetAction(data.sheetName);
          break;
        case contextMenuActionKeys.deleteSheet:
          worksheetAction.deleteWorksheetAction(data.sheetName);
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
            cloneTable(data.tableName);
          }
          break;
        case contextMenuActionKeys.convertToChart:
          if (data.tableName && data.chartType) {
            setChartType(data.tableName, data.chartType);
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
              action === contextMenuActionKeys.removeKey,
            );
          }
          break;
        case contextMenuActionKeys.addDimension:
        case contextMenuActionKeys.removeDimension:
          if (data.tableName && data.fieldName) {
            changeFieldDimension(
              data.tableName,
              data.fieldName,
              action === contextMenuActionKeys.removeDimension,
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
              data.descriptionFieldName,
            );
          }
          break;
        case contextMenuActionKeys.removeDescription:
          if (data.tableName && data.fieldName) {
            changeFieldDescription(data.tableName, data.fieldName, '', true);
          }
          break;
        case contextMenuActionKeys.switchInput:
          if (data.tableName && data.fieldName) {
            onSwitchInput(data.tableName, data.fieldName);
          }
          break;
        case contextMenuActionKeys.openDetailsPanel:
          if (data.tableName) {
            openInDetailsPanel(data.tableName);
          }
          break;
        default:
          break;
      }
    },
    [
      openInDetailsPanel,
      onSwitchInput,
      worksheetAction,
      moveToNode,
      deleteTable,
      deleteField,
      renameTableCallback,
      downloadTable,
      toggleTableTitleOrHeaderVisibility,
      flipTable,
      createDerivedTable,
      cloneTable,
      setChartType,
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
    ],
  );

  return { items, onContextMenuClick, createContextMenuItems, moveToNode };
};

function hideItem(
  parentPath: string[],
  isTableHeaderHidden: boolean,
  isTableFieldsHidden: boolean,
  isChart: boolean,
  childData: ProjectTreeData,
): MenuItem {
  const hidePath = [...parentPath, 'Hide'];

  return getDropdownItem({
    label: 'Hide',
    key: 'Hide',
    fullPath: hidePath,
    children: [
      getDropdownItem({
        label: isTableHeaderHidden
          ? isChart
            ? 'Show chart title'
            : 'Show table header'
          : isChart
            ? 'Hide chart title'
            : 'Hide table header',
        fullPath: [...hidePath, 'ToggleTableNameHeader'],
        key: getDropdownMenuKey<ProjectTreeData>(
          contextMenuActionKeys.toggleTableNameHeader,
          childData,
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
        fullPath: [...hidePath, 'ToggleTableFieldsHeader'],
        key: getDropdownMenuKey<ProjectTreeData>(
          contextMenuActionKeys.toggleTableFieldsHeader,
          childData,
        ),
      }),
    ],
  });
}

function openDetails(
  parentPath: string[],
  isTableHeader: boolean,
  childData: ProjectTreeData,
): MenuItem[] {
  return [
    getDropdownItem({
      label: 'Open in Details Panel',
      fullPath: [...parentPath, 'OpenInDetailsPanel'],
      key: getDropdownMenuKey<ProjectTreeData>(
        contextMenuActionKeys.openDetailsPanel,
        childData,
      ),
    }),
    getDropdownItem({
      label: 'Open in Editor',
      fullPath: [...parentPath, 'OpenInEditor'],
      key: getDropdownMenuKey<ProjectTreeData>(
        isTableHeader
          ? contextMenuActionKeys.openTableInEditor
          : contextMenuActionKeys.openFieldInEditor,
        childData,
      ),
    }),
  ];
}
