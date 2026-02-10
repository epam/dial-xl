import { MenuInfo } from 'rc-menu/lib/interface';
import { RefObject, useCallback } from 'react';

import {
  CellPlacement,
  defaultFieldName,
  FormulasContextMenuKeyData,
  InsertChartContextMenuKeyData,
  TableArrangeType,
} from '@frontend/common';

import { useAIPrompt } from '../../../hooks/useAIPrompt';
import { GridApi } from '../../../types';
import { getCellContext, GridEventBus } from '../../../utils';
import { GridCellEditorEventType } from '../../CellEditor';
import { GridEvent } from '../../GridApiWrapper';
import { spreadsheetMenuKeys as menuKey, totalItems } from './config';
import { ContextMenuKeyData } from './types';

type Props = {
  apiRef: RefObject<GridApi | null>;
  eventBus: GridEventBus;
};

const arrangeTableActions: Record<string, TableArrangeType> = {
  [menuKey.tableToBack]: 'back',
  [menuKey.tableForward]: 'forward',
  [menuKey.tableToFront]: 'front',
  [menuKey.tableBackward]: 'backward',
};

export function useOnClickContextMenu({ apiRef, eventBus }: Props) {
  const { openAIPrompt } = useAIPrompt(apiRef.current);

  const onClickFormulaContextItem = useCallback(
    (action: string, data: FormulasContextMenuKeyData) => {
      if (action.startsWith('CreateTable') || action.startsWith('Action')) {
        eventBus.emit({
          type: 'tables/create-action',
          payload: {
            action,
            type: data.type,
            insertFormula: data.insertFormula,
            tableName: data.tableName,
          },
        });

        return;
      }
    },
    [eventBus]
  );

  const onClickContextMenu = useCallback(
    (info: MenuInfo) => {
      const api = apiRef.current;
      if (!api) return;

      const parsedKey = JSON.parse(info.key);
      const data: ContextMenuKeyData = parsedKey.data;
      const action: string = parsedKey.action;

      if (action.startsWith('CreateChart')) {
        const { chartType, tableName, col, row } =
          data as InsertChartContextMenuKeyData;

        if (col === undefined || row === undefined) return;

        eventBus.emit({
          type: 'charts/insert',
          payload: {
            tableName,
            chartType,
            col,
            row,
          },
        });

        return;
      }

      if (action === 'CreateControl') {
        eventBus.emit({
          type: 'tables/create-action',
          payload: {
            action,
            type: undefined,
            insertFormula: undefined,
            tableName: undefined,
          },
        });

        return;
      }

      if (
        (data as any as FormulasContextMenuKeyData).insertFormula ||
        (data as any as FormulasContextMenuKeyData).type === 'pivot'
      ) {
        const formulaData = data as FormulasContextMenuKeyData;
        onClickFormulaContextItem(action, formulaData);

        return;
      }

      if (action.startsWith('Action')) {
        onClickFormulaContextItem(action, data as FormulasContextMenuKeyData);
      }

      if (!(data as any).row || !(data as any).col) return;

      const { col, row } = data as CellPlacement;

      const currentCell = api.getCell(col, row);

      const currentFieldName = currentCell?.field?.fieldName;
      const currentTableName = currentCell?.table?.tableName;
      const totalType = totalItems.find((t) => t.key === action)?.type;

      switch (action) {
        case menuKey.askAI:
          openAIPrompt();
          break;
        case menuKey.renameTable:
        case menuKey.renameField:
          api.cellEditorEvent$.next({
            type: GridCellEditorEventType.Rename,
            col,
            row,
          });
          break;
        case menuKey.editFormula:
          api.cellEditorEvent$.next({
            type: GridCellEditorEventType.Edit,
            col,
            row,
          });
          break;
        case menuKey.deleteTable:
          if (currentCell?.table?.tableName) {
            eventBus.emit({
              type: 'tables/delete',
              payload: {
                tableName: currentCell.table.tableName,
              },
            });
          }
          break;
        case menuKey.deleteField:
          if (currentCell?.field?.fieldName && currentTableName) {
            eventBus.emit({
              type: 'fields/delete',
              payload: {
                tableName: currentTableName,
                fieldName: currentCell.field.fieldName,
              },
            });
          }
          break;
        case menuKey.deleteRow:
          if (
            typeof currentCell?.overrideIndex !== 'undefined' &&
            currentTableName &&
            currentCell.table?.isManual
          ) {
            eventBus.emit({
              type: 'overrides/remove-row',
              payload: {
                tableName: currentTableName,
                overrideIndex: currentCell.overrideIndex,
              },
            });
          }
          break;
        case menuKey.swapLeft:
        case menuKey.swapRight:
          if (currentTableName && currentFieldName) {
            eventBus.emit({
              type: 'fields/swap',
              payload: {
                tableName: currentTableName,
                fieldName: currentFieldName,
                direction: action === menuKey.swapLeft ? 'left' : 'right',
              },
            });
          }
          break;
        case menuKey.increaseFieldWidth:
          if (currentTableName && currentFieldName) {
            eventBus.emit({
              type: 'fields/increase-size',
              payload: {
                tableName: currentTableName,
                fieldName: currentFieldName,
              },
            });
          }
          break;
        case menuKey.decreaseFieldWidth:
          if (currentTableName && currentFieldName) {
            eventBus.emit({
              type: 'fields/decrease-size',
              payload: {
                tableName: currentTableName,
                fieldName: currentFieldName,
              },
            });
          }
          break;
        case menuKey.fieldsAutoFit:
          if (currentTableName) {
            eventBus.emit({
              type: 'fields/auto-fit',
              payload: {
                tableName: currentTableName,
              },
            });
          }
          break;
        case menuKey.removeFieldSizes:
          if (currentTableName) {
            eventBus.emit({
              type: 'fields/remove-sizes',
              payload: {
                tableName: currentTableName,
              },
            });
          }
          break;
        case menuKey.insertFieldToLeft:
          if (currentTableName && currentFieldName) {
            eventBus.emit({
              type: 'fields/add',
              payload: {
                tableName: currentTableName,
                fieldText: defaultFieldName,
                insertOptions: {
                  direction: 'left',
                  insertFromFieldName: currentFieldName,
                  withSelection: true,
                },
              },
            });
          }
          break;
        case menuKey.insertFieldToRight:
          if (currentTableName && currentFieldName) {
            eventBus.emit({
              type: 'fields/add',
              payload: {
                tableName: currentTableName,
                fieldText: defaultFieldName,
                insertOptions: {
                  direction: 'right',
                  insertFromFieldName: currentFieldName,
                  withSelection: true,
                },
              },
            });
          }
          break;
        case menuKey.addField: {
          if (currentTableName) {
            eventBus.emit({
              type: 'fields/add',
              payload: {
                tableName: currentTableName,
                fieldText: defaultFieldName,
                insertOptions: {
                  withSelection: true,
                },
              },
            });
          }
          break;
        }
        case menuKey.addFieldOrRow: {
          // Get cell context, because it is a menu item for the empty cell
          const contextCell = getCellContext(api.getCell, col, row);

          if (contextCell?.table) {
            eventBus.emit({
              type: 'fields/add',
              payload: {
                tableName: contextCell.table.tableName,
                fieldText: defaultFieldName,
              },
            });
          }
          break;
        }
        case menuKey.addRow: {
          if (currentCell?.table) {
            eventBus.emit({
              type: 'tables/add-row-to-end',
              payload: {
                tableName: currentCell.table.tableName,
                value: '',
              },
            });
          }
          break;
        }
        case menuKey.createDerivedTable:
          if (currentCell?.table) {
            eventBus.emit({
              type: 'tables/create-derived',
              payload: {
                tableName: currentCell.table.tableName,
              },
            });
          }
          break;
        case menuKey.moveTable:
          if (currentCell?.table) {
            api.event.emit({
              type: GridEvent.selectAll,
              tableName: currentCell.table.tableName,
            });
          }
          break;
        case menuKey.downloadTable:
          if (currentCell?.table) {
            eventBus.emit({
              type: 'tables/download',
              payload: {
                tableName: currentCell.table.tableName,
              },
            });
          }
          break;
        case menuKey.cloneTable:
          if (currentTableName) {
            eventBus.emit({
              type: 'tables/clone',
              payload: {
                tableName: currentTableName,
              },
            });
          }
          break;
        case menuKey.toggleTableNameHeader:
          if (currentTableName) {
            eventBus.emit({
              type: 'tables/toggle-title-or-header-visibility',
              payload: {
                tableName: currentTableName,
                toggleTableHeader: true,
              },
            });
          }
          break;
        case menuKey.toggleTableFieldsHeader:
          if (currentTableName) {
            eventBus.emit({
              type: 'tables/toggle-title-or-header-visibility',
              payload: {
                tableName: currentTableName,
                toggleTableHeader: false,
              },
            });
          }
          break;
        case menuKey.flipTableToHorizontal:
        case menuKey.flipTableToVertical:
          if (currentTableName) {
            eventBus.emit({
              type: 'tables/flip',
              payload: {
                tableName: currentTableName,
              },
            });
          }
          break;
        case menuKey.addKey:
        case menuKey.removeKey:
          if (currentFieldName && currentTableName) {
            eventBus.emit({
              type: 'fields/change-key',
              payload: {
                tableName: currentTableName,
                fieldName: currentFieldName,
                isRemove: action === menuKey.removeKey,
              },
            });
          }
          break;
        case menuKey.addIndex:
        case menuKey.removeIndex:
          if (currentFieldName && currentTableName) {
            eventBus.emit({
              type: 'fields/change-index',
              payload: {
                tableName: currentTableName,
                fieldName: currentFieldName,
                isRemove: action === menuKey.removeIndex,
              },
            });
          }
          break;
        case menuKey.addDescription:
          if (currentTableName && currentFieldName && (data as any).fieldName) {
            eventBus.emit({
              type: 'tables/change-description',
              payload: {
                tableName: currentTableName,
                fieldName: currentFieldName,
                descriptionFieldName: (data as any).fieldName,
              },
            });
          }
          break;
        case menuKey.removeDescription:
          if (currentTableName && currentFieldName) {
            eventBus.emit({
              type: 'tables/change-description',
              payload: {
                tableName: currentTableName,
                fieldName: currentFieldName,
                descriptionFieldName: '',
                isRemove: true,
              },
            });
          }
          break;
        case menuKey.addDimension:
        case menuKey.removeDimension:
          if (currentFieldName && currentTableName) {
            eventBus.emit({
              type: 'fields/change-dimension',
              payload: {
                tableName: currentTableName,
                fieldName: currentFieldName,
                isRemove: action === menuKey.removeDimension,
              },
            });
          }
          break;
        case menuKey.removeOverride:
          if (
            currentCell?.table?.tableName &&
            currentCell?.field?.fieldName &&
            currentCell.overrideIndex !== undefined &&
            currentCell?.value
          ) {
            eventBus.emit({
              type: 'overrides/remove',
              payload: {
                tableName: currentCell.table.tableName,
                fieldName: currentCell.field.fieldName,
                overrideIndex: currentCell.overrideIndex,
                value: currentCell.value,
              },
            });
          }
          break;
        case menuKey.addChart:
          if (currentCell?.table?.tableName && (data as any).chartType) {
            eventBus.emit({
              type: 'charts/add',
              payload: {
                tableName: currentCell.table.tableName,
                chartType: (data as any).chartType,
              },
            });
          }
          break;
        case menuKey.convertToChart:
          if (currentCell?.table?.tableName && (data as any).chartType) {
            eventBus.emit({
              type: 'tables/convert-to-chart',
              payload: {
                tableName: currentCell.table.tableName,
                chartType: (data as any).chartType,
              },
            });
          }
          break;
        case menuKey.convertToTable:
          if (currentCell?.table?.tableName) {
            eventBus.emit({
              type: 'tables/convert-to-table',
              payload: {
                tableName: currentCell.table.tableName,
              },
            });
          }
          break;
        case menuKey.removeNote:
          if (currentCell?.table?.tableName) {
            eventBus.emit({
              type: 'notes/remove',
              payload: {
                tableName: currentCell.table.tableName,
                fieldName: currentCell.field?.fieldName,
              },
            });
          }
          break;
        case menuKey.addNote:
        case menuKey.editNote:
          api.event.emit({
            type: GridEvent.openNote,
            col,
            row,
          });
          break;
        case menuKey.openTableInEditor:
          if (currentTableName) {
            eventBus.emit({
              type: 'system/open-in-editor',
              payload: { tableName: currentTableName },
            });
          }
          break;
        case menuKey.openFieldInEditor:
          if (currentTableName && currentFieldName) {
            eventBus.emit({
              type: 'system/open-in-editor',
              payload: {
                tableName: currentTableName,
                fieldName: currentFieldName,
              },
            });
          }
          break;
        case menuKey.openDetailsPanel:
          if (currentTableName) {
            eventBus.emit({
              type: 'system/open-details-panel',
              payload: {
                tableName: currentTableName,
              },
            });
          }
          break;
        case menuKey.openOverrideInEditor:
          if (currentTableName && currentFieldName) {
            eventBus.emit({
              type: 'system/open-in-editor',
              payload: {
                tableName: currentTableName,
                fieldName: currentFieldName,
                openOverride: true,
              },
            });
          }
          break;
        case menuKey.promoteRow:
          if (currentTableName && currentCell?.dataIndex !== undefined) {
            eventBus.emit({
              type: 'tables/promote-row',
              payload: {
                tableName: currentTableName,
                dataIndex: currentCell.dataIndex,
              },
            });
          }
          break;
        case menuKey.tableToFront:
        case menuKey.tableBackward:
        case menuKey.tableForward:
        case menuKey.tableToBack:
          if (currentTableName && arrangeTableActions[action]) {
            eventBus.emit({
              type: 'tables/arrange',
              payload: {
                tableName: currentTableName,
                arrangeType: arrangeTableActions[action],
              },
            });
          }
          break;
        case menuKey.sortAsc:
          if (currentTableName && currentFieldName) {
            eventBus.emit({
              type: 'sort/change',
              payload: {
                tableName: currentTableName,
                fieldName: currentFieldName,
                order: 'asc',
              },
            });
          }
          break;
        case menuKey.sortDesc:
          if (currentTableName && currentFieldName) {
            eventBus.emit({
              type: 'sort/change',
              payload: {
                tableName: currentTableName,
                fieldName: currentFieldName,
                order: 'desc',
              },
            });
          }
          break;
        case menuKey.clearSort:
          if (currentTableName && currentFieldName) {
            eventBus.emit({
              type: 'sort/change',
              payload: {
                tableName: currentTableName,
                fieldName: currentFieldName,
                order: null,
              },
            });
          }
          break;
        case menuKey.addTotal:
        case menuKey.editTotal:
          api.cellEditorEvent$.next({
            type:
              action === menuKey.addTotal
                ? GridCellEditorEventType.AddTotal
                : GridCellEditorEventType.EditTotal,
            col,
            row,
          });
          break;
        case menuKey.removeTotal:
          if (currentTableName && currentFieldName && currentCell?.totalIndex) {
            eventBus.emit({
              type: 'totals/remove-by-index',
              payload: {
                tableName: currentTableName,
                fieldName: currentFieldName,
                index: currentCell.totalIndex,
              },
            });
          }
          break;
        case menuKey.customTotal:
        case menuKey.sumTotal:
        case menuKey.avgTotal:
        case menuKey.countTotal:
        case menuKey.stdevTotal:
        case menuKey.medianTotal:
        case menuKey.modeTotal:
        case menuKey.maxTotal:
        case menuKey.minTotal:
        case menuKey.countUniqueTotal:
          if (totalType && currentTableName && currentFieldName) {
            eventBus.emit({
              type: 'totals/toggle-by-type',
              payload: {
                tableName: currentTableName,
                fieldName: currentFieldName,
                type: totalType,
              },
            });
          }
          break;
        case menuKey.allTotals:
          if (currentTableName && currentFieldName) {
            eventBus.emit({
              type: 'totals/add-all-field-totals',
              payload: {
                tableName: currentTableName,
                fieldName: currentFieldName,
              },
            });
          }
          break;
        case menuKey.allTotalsSeparateTable:
          if (currentTableName) {
            eventBus.emit({
              type: 'totals/add-all-table-totals',
              payload: {
                tableName: currentTableName,
              },
            });
          }
          break;
        case menuKey.switchInput:
          if (currentTableName && currentFieldName) {
            eventBus.emit({
              type: 'tables/switch-input',
              payload: {
                tableName: currentTableName,
                fieldName: currentFieldName,
              },
            });
          }
          break;
        case menuKey.syncImport:
          if (currentTableName && currentFieldName) {
            eventBus.emit({
              type: 'tables/sync-single-import-field',
              payload: {
                tableName: currentTableName,
                fieldName: currentFieldName,
              },
            });
          }
          break;
        case menuKey.aiRegenerate:
          if (
            currentTableName &&
            currentFieldName &&
            currentCell?.overrideValue &&
            currentCell.overrideIndex !== undefined &&
            typeof currentCell.overrideValue === 'string'
          ) {
            eventBus.emit({
              type: 'overrides/ai-regenerate',
              payload: {
                tableName: currentTableName,
                fieldName: currentFieldName,
                overrideIndex: currentCell.overrideIndex,
              },
            });
          } else if (currentTableName && currentFieldName) {
            eventBus.emit({
              type: 'fields/ai-regenerate',
              payload: {
                tableName: currentTableName,
                fieldName: currentFieldName,
              },
            });
          }
          break;
        case menuKey.createDropdownControlFromField:
          if (currentTableName && currentFieldName) {
            eventBus.emit({
              type: 'fields/create-control-from-field',
              payload: {
                tableName: currentTableName,
                fieldName: currentFieldName,
                type: 'dropdown',
              },
            });
          }
          break;
        case menuKey.createCheckboxControlFromField:
          if (currentTableName && currentFieldName) {
            eventBus.emit({
              type: 'fields/create-control-from-field',
              payload: {
                tableName: currentTableName,
                fieldName: currentFieldName,
                type: 'checkbox',
              },
            });
          }
          break;
      }
    },
    [apiRef, onClickFormulaContextItem, eventBus, openAIPrompt]
  );

  return {
    onClickContextMenu,
  };
}
