import { MenuProps } from 'antd';
import { DataNode, EventDataNode } from 'antd/es/tree';
import { MenuInfo } from 'rc-menu/lib/interface';
import { useCallback, useContext, useState } from 'react';

import {
  OpenFieldSideEffect,
  OpenTableSideEffect,
  ProjectContext,
  SpreadsheetContext,
} from '../../context';
import {
  useDSLUtils,
  useManualEditDSL,
  useOpenWorksheet,
  useProjectActions,
} from '../../hooks';

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
  createDerivedTable: 'createDerivedTable',
  convertToChart: 'convertToChart',
  convertToTable: 'convertToTable',
  addChart: 'addChart',

  selectField: 'selectField',
  deleteField: 'deleteField',
  swapLeft: 'swapLeft',
  swapRight: 'swapRight',
  renameField: 'renameField',
  editFormula: 'editFormula',
  removeKey: 'removeKey',
  addKey: 'addKey',
  removeDimension: 'removeDimension',
  addDimension: 'addDimension',
};

export type ProjectTreeChildData = {
  [keyIndex: string]: {
    fieldName?: string;
    tableName?: string;
    sheetName?: string;
  };
};

function parseContextMenuKey(key: string): {
  action: string;
  childData: {
    fieldName?: string;
    tableName?: string;
    sheetName?: string;
  };
} {
  return JSON.parse(key);
}

function getContextMenuKey(
  action: string,
  childData: {
    fieldName?: string;
    tableName?: string;
    sheetName?: string;
  }
): string {
  return JSON.stringify({
    action,
    childData,
  });
}

export const useProjectTreeContextMenu = () => {
  const projectAction = useProjectActions();
  const openWorksheet = useOpenWorksheet();
  const { projectName } = useContext(ProjectContext);
  const { openField, openTable } = useContext(SpreadsheetContext);
  const {
    addChart,
    deleteTable,
    deleteField,
    convertToTable,
    convertToChart,
    createDerivedTable,
    addKey,
    removeKey,
    removeDimension,
    addDimension,
    swapFieldsHandler,
  } = useManualEditDSL();
  const { findContext } = useDSLUtils();

  const [items, setItems] = useState<MenuProps['items']>([]);

  const createContextMenuItems = useCallback(
    (
      info: {
        event: React.MouseEvent<Element, MouseEvent>;
        node: EventDataNode<DataNode>;
      },
      childData: ProjectTreeChildData
    ) => {
      const { key } = info.node;
      const menuItems: MenuProps['items'] = [];

      // Project actions, deep = 2
      if (key.toString().split('-').length === 2) {
        menuItems.push({
          key: getContextMenuKey(contextMenuActionKeys.putSheet, {}),
          label: 'Create Worksheet',
        });
        menuItems.push({
          key: getContextMenuKey(contextMenuActionKeys.renameProject, {}),
          label: 'Rename Project',
        });
        menuItems.push({
          key: getContextMenuKey(contextMenuActionKeys.deleteProject, {}),
          label: 'Delete Project',
        });
      }

      // Sheet actions, deep = 3
      if (key.toString().split('-').length === 3) {
        menuItems.push({
          key: getContextMenuKey(
            contextMenuActionKeys.selectWorksheet,
            childData[key]
          ),
          label: 'Select Worksheet',
        });
        menuItems.push({
          key: getContextMenuKey(
            contextMenuActionKeys.renameSheet,
            childData[key]
          ),
          label: 'Rename Worksheet',
        });
        menuItems.push({
          key: getContextMenuKey(
            contextMenuActionKeys.deleteSheet,
            childData[key]
          ),
          label: 'Delete Worksheet',
        });
      }

      // Table actions, deep = 4
      if (key.toString().split('-').length === 4) {
        const { tableName } = childData[key];

        let isChart = undefined;

        if (tableName) {
          const context = findContext(tableName);

          if (context) {
            isChart = context.table.isChart();
          }
        }

        menuItems.push({
          key: getContextMenuKey(
            contextMenuActionKeys.selectTable,
            childData[key]
          ),
          label: 'Select table',
        });
        menuItems.push({
          key: getContextMenuKey(
            contextMenuActionKeys.moveTable,
            childData[key]
          ),
          label: 'Move table',
        });
        menuItems.push({ type: 'divider' });
        menuItems.push({
          key: getContextMenuKey(
            contextMenuActionKeys.createDerivedTable,
            childData[key]
          ),
          label: 'Create derived table',
        });
        menuItems.push({
          key: getContextMenuKey(
            contextMenuActionKeys.renameTable,
            childData[key]
          ),
          label: 'Rename table',
        });
        menuItems.push({
          key: getContextMenuKey(
            contextMenuActionKeys.deleteTable,
            childData[key]
          ),
          label: 'Delete table',
        });

        menuItems.push({ type: 'divider' });

        menuItems.push({
          key: getContextMenuKey(
            isChart
              ? contextMenuActionKeys.convertToTable
              : contextMenuActionKeys.convertToChart,
            childData[key]
          ),
          label: isChart ? 'Convert to table' : 'Convert to chart',
        });

        if (!isChart) {
          menuItems.push({
            key: getContextMenuKey(
              contextMenuActionKeys.addChart,
              childData[key]
            ),
            label: 'Add chart',
          });
        }
      }

      // Field actions, deep = 5
      if (key.toString().split('-').length === 5) {
        const { tableName, fieldName } = childData[key];

        let isKey = undefined;
        let isDim = undefined;
        let isManual = undefined;
        let isDynamic = undefined;

        if (tableName && fieldName) {
          const context = findContext(tableName, fieldName);

          if (context) {
            isKey = context.field?.isKey;
            isDim = context.field?.isDim;
            isDynamic = context.field?.isDynamic;
            isManual = context.table.isManual();
          }
        }
        menuItems.push({
          key: getContextMenuKey(
            contextMenuActionKeys.selectField,
            childData[key]
          ),
          label: 'Select field',
        });
        menuItems.push({
          key: getContextMenuKey(
            contextMenuActionKeys.swapLeft,
            childData[key]
          ),
          label: 'Swap left',
        });
        menuItems.push({
          key: getContextMenuKey(
            contextMenuActionKeys.swapRight,
            childData[key]
          ),
          label: 'Swap right',
        });
        menuItems.push({ type: 'divider' });
        menuItems.push({
          key: getContextMenuKey(
            contextMenuActionKeys.renameField,
            childData[key]
          ),
          label: 'Rename field',
          disabled: isDynamic,
        });
        menuItems.push({
          key: getContextMenuKey(
            contextMenuActionKeys.editFormula,
            childData[key]
          ),
          label: 'Edit formula',
        });
        menuItems.push({
          key: getContextMenuKey(
            contextMenuActionKeys.deleteField,
            childData[key]
          ),
          label: 'Delete field',
        });

        if (isKey !== undefined) {
          menuItems.push({ type: 'divider' });
          const action = isKey
            ? contextMenuActionKeys.removeKey
            : contextMenuActionKeys.addKey;
          menuItems.push({
            key: getContextMenuKey(action, childData[key]),
            label: isKey ? 'Remove key' : 'Add key',
            disabled: isDynamic,
          });
        }

        if (isDim !== undefined && !isManual) {
          const action = isDim
            ? contextMenuActionKeys.removeDimension
            : contextMenuActionKeys.addDimension;
          menuItems.push({
            key: getContextMenuKey(action, childData[key]),
            label: isDim ? 'Remove dimension' : 'Add dimension',
            disabled: isDynamic,
          });
        }
      }

      setItems(menuItems);
    },
    [findContext]
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
        openField(sheetName, tableName, fieldName, fieldSideEffect);

        return;
      }

      if (tableName && sheetName) {
        openTable(sheetName, tableName, tableSideEffect);

        return;
      }

      if (sheetName && projectName) {
        openWorksheet(projectName, sheetName);

        return;
      }
    },
    [openField, openTable, openWorksheet, projectName]
  );

  const onContextMenuClick = useCallback(
    (info: MenuInfo) => {
      const { action, childData } = parseContextMenuKey(info.key);

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
          projectAction.renameWorksheetAction(childData.sheetName);
          break;
        case contextMenuActionKeys.deleteSheet:
          projectAction.deleteWorksheetAction(childData.sheetName);
          break;
        case contextMenuActionKeys.deleteTable:
          if (childData.tableName) {
            deleteTable(childData.tableName);
          }
          break;
        case contextMenuActionKeys.deleteField:
          if (childData.tableName && childData.fieldName) {
            deleteField(childData.tableName, childData.fieldName);
          }
          break;
        case contextMenuActionKeys.renameTable:
          moveToNode(childData, 'rename');
          break;
        case contextMenuActionKeys.moveTable:
          moveToNode(childData, 'move');
          break;
        case contextMenuActionKeys.createDerivedTable:
          if (childData.tableName) {
            createDerivedTable(childData.tableName);
          }
          break;
        case contextMenuActionKeys.convertToChart:
          if (childData.tableName) {
            convertToChart(childData.tableName);
          }
          break;
        case contextMenuActionKeys.convertToTable:
          if (childData.tableName) {
            convertToTable(childData.tableName);
          }
          break;
        case contextMenuActionKeys.addChart:
          if (childData.tableName) {
            addChart(childData.tableName);
          }
          break;
        case contextMenuActionKeys.swapRight:
          if (childData.tableName && childData.fieldName) {
            swapFieldsHandler(
              childData.tableName,
              childData.fieldName,
              'right'
            );
          }
          break;
        case contextMenuActionKeys.swapLeft:
          if (childData.tableName && childData.fieldName) {
            swapFieldsHandler(childData.tableName, childData.fieldName, 'left');
          }
          break;
        case contextMenuActionKeys.renameField:
          moveToNode(childData, undefined, 'rename');
          break;
        case contextMenuActionKeys.editFormula:
          moveToNode(childData, undefined, 'editFormula');
          break;
        case contextMenuActionKeys.addKey:
          if (childData.tableName && childData.fieldName) {
            addKey(childData.tableName, childData.fieldName);
          }
          break;
        case contextMenuActionKeys.removeKey:
          if (childData.tableName && childData.fieldName) {
            removeKey(childData.tableName, childData.fieldName);
          }
          break;
        case contextMenuActionKeys.addDimension:
          if (childData.tableName && childData.fieldName) {
            addDimension(childData.tableName, childData.fieldName);
          }
          break;
        case contextMenuActionKeys.removeDimension:
          if (childData.tableName && childData.fieldName) {
            removeDimension(childData.tableName, childData.fieldName);
          }
          break;
        case contextMenuActionKeys.selectField:
        case contextMenuActionKeys.selectTable:
        case contextMenuActionKeys.selectWorksheet: {
          moveToNode(childData);

          return;
        }
      }
    },
    [
      projectAction,
      moveToNode,
      deleteTable,
      deleteField,
      createDerivedTable,
      convertToChart,
      convertToTable,
      addChart,
      swapFieldsHandler,
      addKey,
      removeKey,
      addDimension,
      removeDimension,
    ]
  );

  return { items, onContextMenuClick, createContextMenuItems, moveToNode };
};
