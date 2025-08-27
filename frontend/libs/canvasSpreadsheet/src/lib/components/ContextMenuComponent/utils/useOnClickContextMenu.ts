import { MenuInfo } from 'rc-menu/lib/interface';
import { useCallback } from 'react';

import {
  CellPlacement,
  defaultFieldName,
  FormulasContextMenuKeyData,
  InsertChartContextMenuKeyData,
  TableArrangeType,
} from '@frontend/common';

import { useAIPrompt } from '../../../hooks/useAIPrompt';
import { GridApi, GridCallbacks } from '../../../types';
import { getCellContext } from '../../../utils';
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

      if (
        (data as any as FormulasContextMenuKeyData).insertFormula ||
        (data as any as FormulasContextMenuKeyData).type === 'pivot'
      ) {
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
        case menuKey.swapRight:
          if (currentTableName && currentFieldName) {
            callbacks.onSwapFields?.(
              currentTableName,
              currentFieldName,
              action === menuKey.swapLeft ? 'left' : 'right'
            );
          }
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
        case menuKey.fieldsAutoFit:
          if (currentTableName) {
            callbacks.onAutoFitFields?.(currentTableName);
          }
          break;
        case menuKey.removeFieldSizes:
          if (currentTableName) {
            callbacks.onRemoveFieldSizes?.(currentTableName);
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
          // Get cell context, because it is a menu item for the empty cell
          const contextCell = getCellContext(api.getCell, col, row);

          if (contextCell?.table) {
            callbacks.onAddField?.(
              contextCell.table.tableName,
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
        case menuKey.downloadTable:
          if (currentCell?.table) {
            callbacks.onDownloadTable?.(currentCell.table.tableName);
          }
          break;
        case menuKey.cloneTable:
          if (currentTableName) {
            callbacks.onCloneTable?.(currentTableName);
          }
          break;
        case menuKey.toggleTableNameHeader:
          if (currentTableName) {
            callbacks.onToggleTableTitleOrHeaderVisibility?.(
              currentTableName,
              true
            );
          }
          break;
        case menuKey.toggleTableFieldsHeader:
          if (currentTableName) {
            callbacks.onToggleTableTitleOrHeaderVisibility?.(
              currentTableName,
              false
            );
          }
          break;
        case menuKey.flipTableToHorizontal:
        case menuKey.flipTableToVertical:
          if (currentTableName) {
            callbacks.onFlipTable?.(currentTableName);
          }
          break;
        case menuKey.addKey:
        case menuKey.removeKey:
          if (currentFieldName && currentTableName) {
            callbacks.onChangeFieldKey?.(
              currentTableName,
              currentFieldName,
              action === menuKey.removeKey
            );
          }
          break;
        case menuKey.addIndex:
        case menuKey.removeIndex:
          if (currentFieldName && currentTableName) {
            callbacks.onChangeFieldIndex?.(
              currentTableName,
              currentFieldName,
              action === menuKey.removeIndex
            );
          }
          break;
        case menuKey.addDescription:
          if (currentTableName && currentFieldName && (data as any).fieldName) {
            callbacks.onChangeDescription?.(
              currentTableName,
              currentFieldName,
              (data as any).fieldName
            );
          }
          break;
        case menuKey.removeDescription:
          if (currentTableName && currentFieldName) {
            callbacks.onChangeDescription?.(
              currentTableName,
              currentFieldName,
              '',
              true
            );
          }
          break;
        case menuKey.addDimension:
        case menuKey.removeDimension:
          if (currentFieldName && currentTableName) {
            callbacks.onChangeFieldDimension?.(
              currentTableName,
              currentFieldName,
              action === menuKey.removeDimension
            );
          }
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
          if (currentCell?.table?.tableName && (data as any).chartType) {
            callbacks.onAddChart?.(
              currentCell.table.tableName,
              (data as any).chartType
            );
          }
          break;
        case menuKey.convertToChart:
          if (currentCell?.table?.tableName && (data as any).chartType) {
            callbacks.onConvertToChart?.(
              currentCell.table.tableName,
              (data as any).chartType
            );
          }
          break;
        case menuKey.convertToTable:
          if (currentCell?.table?.tableName) {
            callbacks.onConvertToTable?.(currentCell.table.tableName);
          }
          break;
        case menuKey.removeNote:
          if (currentCell?.table?.tableName) {
            callbacks.onRemoveNote?.(
              currentCell.table.tableName,
              currentCell.field?.fieldName
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
        case menuKey.allTotals:
          if (currentTableName && currentFieldName) {
            callbacks.onAddAllFieldTotals?.(currentTableName, currentFieldName);
          }
          break;
        case menuKey.allTotalsSeparateTable:
          if (currentTableName) {
            callbacks.onAddAllTableTotals?.(currentTableName);
          }
          break;
        case menuKey.insertChart:
          if ((data as any as InsertChartContextMenuKeyData).chartType) {
            const { chartType } = data as InsertChartContextMenuKeyData;

            callbacks.onInsertChart?.(chartType);
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
