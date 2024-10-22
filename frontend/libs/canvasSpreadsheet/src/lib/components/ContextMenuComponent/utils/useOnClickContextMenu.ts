import { MenuInfo } from 'rc-menu/lib/interface';
import { useCallback } from 'react';

import {
  CellPlacement,
  defaultFieldName,
  FormulasContextMenuKeyData,
  isComplexType,
  overrideComplexFieldMessage,
  overrideKeyFieldMessage,
  TableArrangeType,
} from '@frontend/common';

import { useAIPrompt } from '../../../hooks/useAIPrompt';
import { GridApi, GridCallbacks } from '../../../types';
import { swapFields } from '../../../utils';
import { GridCellEditorEventType } from '../../CellEditor';
import { GridEvent } from '../../GridApiWrapper';
import { spreadsheetMenuKeys as menuKey, totalItems } from './config';
import { ContextMenuKeyData } from './types';

type Props = {
  api: GridApi | null;
  gridCallbacks: GridCallbacks | null;
};

const arrangeTableActions: Record<string, TableArrangeType> = {
  [menuKey.tableToBack]: 'back',
  [menuKey.tableForward]: 'forward',
  [menuKey.tableToFront]: 'front',
  [menuKey.tableBackward]: 'backward',
};

export function useOnClickContextMenu({ api, gridCallbacks }: Props) {
  const { openAIPrompt } = useAIPrompt(api);

  const onClickFormulaContextItem = useCallback(
    (action: string, data: FormulasContextMenuKeyData) => {
      if (!gridCallbacks) return;

      if (action.startsWith('CreateTable') || action.startsWith('Action')) {
        gridCallbacks.onCreateTableAction?.(
          action,
          data.type,
          data.insertFormula,
          data.tableName
        );

        return;
      }
    },
    [gridCallbacks]
  );

  const onClickContextMenu = useCallback(
    (info: MenuInfo) => {
      if (!api || !gridCallbacks) return;

      const parsedKey = JSON.parse(info.key);
      const data: ContextMenuKeyData = parsedKey.data;
      const action: string = parsedKey.action;

      if ((data as any as FormulasContextMenuKeyData).insertFormula) {
        const formulaData = data as FormulasContextMenuKeyData;
        onClickFormulaContextItem(action, formulaData);

        return;
      }

      if (!(data as any).row || !(data as any).col) return;

      const { col, row } = data as CellPlacement;

      const callbacks = gridCallbacks;
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
            callbacks.onDeleteTable?.(currentCell.table.tableName);
          }
          break;
        case menuKey.deleteField:
          if (currentCell?.field?.fieldName && currentTableName) {
            callbacks.onDeleteField?.(
              currentTableName,
              currentCell.field.fieldName
            );
          }
          break;
        case menuKey.deleteRow:
          if (
            typeof currentCell?.overrideIndex !== 'undefined' &&
            currentTableName &&
            currentCell.table?.isManual
          ) {
            callbacks.onRemoveOverrideRow?.(
              currentTableName,
              currentCell.overrideIndex
            );
          }
          break;
        case menuKey.swapLeft:
          swapFields(api, gridCallbacks, 'left');
          break;
        case menuKey.swapRight:
          swapFields(api, gridCallbacks, 'right');
          break;
        case menuKey.increaseFieldWidth:
          if (currentTableName && currentFieldName) {
            callbacks.onIncreaseFieldColumnSize?.(
              currentTableName,
              currentFieldName
            );
          }
          break;
        case menuKey.decreaseFieldWidth:
          if (currentTableName && currentFieldName) {
            callbacks.onDecreaseFieldColumnSize?.(
              currentTableName,
              currentFieldName
            );
          }
          break;
        case menuKey.insertFieldToLeft:
          if (currentTableName && currentFieldName) {
            callbacks.onAddField?.(currentTableName, defaultFieldName, {
              direction: 'left',
              insertFromFieldName: currentFieldName,
              withSelection: true,
            });
          }
          break;
        case menuKey.insertFieldToRight:
          if (currentTableName && currentFieldName) {
            callbacks.onAddField?.(currentTableName, defaultFieldName, {
              direction: 'right',
              insertFromFieldName: currentFieldName,
              withSelection: true,
            });
          }
          break;
        case menuKey.addField: {
          if (currentTableName) {
            callbacks.onAddField?.(currentTableName, defaultFieldName, {
              withSelection: true,
            });
          }
          break;
        }
        case menuKey.addFieldOrRow: {
          if (currentCell?.table) {
            callbacks.onAddField?.(
              currentCell.table.tableName,
              defaultFieldName
            );
          }
          break;
        }
        case menuKey.addRow: {
          if (currentCell?.table) {
            callbacks.onAddTableRowToEnd?.(currentCell.table.tableName, '');
          }
          break;
        }
        case menuKey.createDerivedTable:
          if (currentCell?.value) {
            callbacks.onCreateDerivedTable?.(currentCell.value);
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
        case menuKey.cloneTable:
          if (currentTableName) {
            callbacks.onCloneTable?.(currentTableName);
          }
          break;
        case menuKey.toggleTableNameHeader:
          if (currentTableName) {
            callbacks.onToggleTableHeaderVisibility?.(currentTableName);
          }
          break;
        case menuKey.toggleTableFieldsHeader:
          if (currentTableName) {
            callbacks.onToggleTableFieldsVisibility?.(currentTableName);
          }
          break;
        case menuKey.flipTableToHorizontal:
        case menuKey.flipTableToVertical:
          if (currentTableName) {
            callbacks.onFlipTable?.(currentTableName);
          }
          break;
        case menuKey.addKey:
          if (currentFieldName && currentTableName) {
            callbacks.onAddKey?.(currentTableName, currentFieldName);
          }
          break;
        case menuKey.removeKey:
          if (currentFieldName && currentTableName) {
            callbacks.onRemoveKey?.(currentTableName, currentFieldName);
          }
          break;
        case menuKey.addDimension:
          if (currentFieldName && currentTableName) {
            callbacks.onAddDimension?.(currentTableName, currentFieldName);
          }
          break;
        case menuKey.removeDimension:
          if (currentFieldName && currentTableName) {
            callbacks.onRemoveDimension?.(currentTableName, currentFieldName);
          }
          break;
        case menuKey.addOverride:
        case menuKey.editOverride:
          if (currentCell?.field?.isKey) {
            callbacks.onCellEditorMessage?.(overrideKeyFieldMessage);

            break;
          }

          if (isComplexType(currentCell?.field)) {
            callbacks.onCellEditorMessage?.(overrideComplexFieldMessage);

            break;
          }

          api.cellEditorEvent$.next({
            type:
              action === menuKey.addOverride
                ? GridCellEditorEventType.AddOverride
                : GridCellEditorEventType.EditOverride,
            col,
            row,
          });

          break;
        case menuKey.removeOverride:
          if (
            currentCell?.table?.tableName &&
            currentCell?.field?.fieldName &&
            currentCell.overrideIndex !== undefined &&
            currentCell?.value
          ) {
            callbacks.onRemoveOverride?.(
              currentCell.table.tableName,
              currentCell.field?.fieldName,
              currentCell.overrideIndex,
              currentCell?.value
            );
          }
          break;
        case menuKey.addChart:
          if (currentCell?.table?.tableName) {
            callbacks.onAddChart?.(currentCell.table.tableName);
          }
          break;
        case menuKey.convertToChart:
          if (currentCell?.table?.tableName) {
            callbacks.onConvertToChart?.(currentCell.table.tableName);
          }
          break;
        case menuKey.convertToTable:
          if (currentCell?.table?.tableName) {
            callbacks.onConvertToTable?.(currentCell.table.tableName);
          }
          break;
        case menuKey.removeNote:
          if (currentCell?.table?.tableName && currentCell?.field) {
            callbacks.onRemoveNote?.(
              currentCell.table.tableName,
              currentCell.field.fieldName
            );
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
            callbacks.onOpenInEditor?.(currentTableName);
          }
          break;
        case menuKey.openFieldInEditor:
          if (currentTableName && currentFieldName) {
            callbacks.onOpenInEditor?.(currentTableName, currentFieldName);
          }
          break;
        case menuKey.openOverrideInEditor:
          if (currentTableName && currentFieldName) {
            callbacks.onOpenInEditor?.(
              currentTableName,
              currentFieldName,
              true
            );
          }
          break;
        case menuKey.promoteRow:
          if (currentTableName && currentCell?.dataIndex !== undefined) {
            callbacks.onPromoteRow?.(currentTableName, currentCell.dataIndex);
          }
          break;
        case menuKey.tableToFront:
        case menuKey.tableBackward:
        case menuKey.tableForward:
        case menuKey.tableToBack:
          if (currentTableName && arrangeTableActions[action]) {
            callbacks.onArrangeTable?.(
              currentTableName,
              arrangeTableActions[action]
            );
          }
          break;
        case menuKey.sortAsc:
          if (currentTableName && currentFieldName) {
            callbacks.onSortChange?.(currentTableName, currentFieldName, 'asc');
          }
          break;
        case menuKey.sortDesc:
          if (currentTableName && currentFieldName) {
            callbacks.onSortChange?.(
              currentTableName,
              currentFieldName,
              'desc'
            );
          }
          break;
        case menuKey.clearSort:
          if (currentTableName && currentFieldName) {
            callbacks.onSortChange?.(currentTableName, currentFieldName, null);
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
            callbacks.onRemoveTotalByIndex?.(
              currentTableName,
              currentFieldName,
              currentCell.totalIndex
            );
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
          if (totalType && currentTableName && currentFieldName) {
            callbacks.onToggleTotalByType?.(
              currentTableName,
              currentFieldName,
              totalType
            );
          }
          break;
      }
    },
    [api, gridCallbacks, onClickFormulaContextItem, openAIPrompt]
  );

  return {
    onClickContextMenu,
  };
}
