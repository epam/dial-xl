import { MenuInfo } from 'rc-menu/lib/interface';
import { MutableRefObject, useCallback } from 'react';

import { overrideKeyFieldMessage } from '@frontend/common';

import {
  Grid,
  GridCellEditorEventType,
  GridSelectionShortcutType,
} from '../../grid';
import { GridService } from '../../services';
import { GridCallbacks } from '../../types';
import { focusSpreadsheet, swapFields } from '../../utils';
import { spreadsheetMenuKeys } from './contextMenuUtils';

type Props = {
  gridServiceRef: MutableRefObject<GridService | null>;
  gridCallbacksRef: MutableRefObject<GridCallbacks>;
  api: Grid | null;
};
export function useOnClickContextMenu({
  gridServiceRef,
  gridCallbacksRef,
  api,
}: Props) {
  const onClickContextMenu = useCallback(
    (info: MenuInfo) => {
      if (!api) return;

      const { action, col, row } = JSON.parse(info.key);

      const currentCell = gridServiceRef.current?.getCellValue(row, col);
      const headerCell = gridServiceRef.current?.getCellValue(row - 1, col);

      switch (action) {
        case spreadsheetMenuKeys.renameTable:
        case spreadsheetMenuKeys.renameField:
          api.cellEditorEvent$.next({
            type: GridCellEditorEventType.Rename,
            col,
            row,
          });
          break;
        case spreadsheetMenuKeys.editFormula:
          api.cellEditorEvent$.next({
            type: GridCellEditorEventType.Edit,
            col,
            row,
          });
          break;
        case spreadsheetMenuKeys.deleteTable:
          if (currentCell?.value) {
            gridCallbacksRef.current.onDeleteTable?.(currentCell.value);
          }
          break;
        case spreadsheetMenuKeys.deleteField:
          if (currentCell?.value && headerCell?.value) {
            gridCallbacksRef.current.onDeleteField?.(
              headerCell.value,
              currentCell.value
            );
          }
          break;
        case spreadsheetMenuKeys.swapLeft:
          swapFields(api, gridServiceRef, gridCallbacksRef, 'left');
          break;
        case spreadsheetMenuKeys.swapRight:
          swapFields(api, gridServiceRef, gridCallbacksRef, 'right');
          break;
        case spreadsheetMenuKeys.createDerivedTable:
          if (currentCell?.value) {
            gridCallbacksRef.current.onCreateDerivedTable?.(currentCell.value);
          }
          break;
        case spreadsheetMenuKeys.moveTable:
          if (currentCell?.table) {
            const { startCol, startRow } = currentCell.table;
            api.updateSelection({
              startCol,
              startRow,
              endCol: startCol,
              endRow: startRow,
            });
            focusSpreadsheet();
            api.sendSelectionEvent({
              type: GridSelectionShortcutType.SelectAll,
            });
          }
          break;
        case spreadsheetMenuKeys.addKey:
          if (currentCell?.value && headerCell?.value) {
            gridCallbacksRef.current.onAddKey?.(
              headerCell.value,
              currentCell.value
            );
          }
          break;
        case spreadsheetMenuKeys.removeKey:
          if (currentCell?.value && headerCell?.value) {
            gridCallbacksRef.current.onRemoveKey?.(
              headerCell.value,
              currentCell.value
            );
          }
          break;
        case spreadsheetMenuKeys.addDimension:
          if (currentCell?.value && headerCell?.value) {
            gridCallbacksRef.current.onAddDimension?.(
              headerCell.value,
              currentCell.value
            );
          }
          break;
        case spreadsheetMenuKeys.removeDimension:
          if (currentCell?.value && headerCell?.value) {
            gridCallbacksRef.current.onRemoveDimension?.(
              headerCell.value,
              currentCell.value
            );
          }
          break;
        case spreadsheetMenuKeys.addOverride:
        case spreadsheetMenuKeys.editOverride:
          if (currentCell?.field?.isKey) {
            gridCallbacksRef.current.onCellEditorMessage?.(
              overrideKeyFieldMessage
            );
          } else {
            const type =
              action === spreadsheetMenuKeys.addOverride
                ? GridCellEditorEventType.AddOverride
                : GridCellEditorEventType.EditOverride;
            api.cellEditorEvent$.next({
              type,
              col,
              row,
            });
          }
          break;
        case spreadsheetMenuKeys.removeOverride:
          if (
            currentCell?.table?.tableName &&
            currentCell?.field?.fieldName &&
            currentCell.overrideIndex !== undefined &&
            currentCell?.value
          ) {
            gridCallbacksRef.current.onRemoveOverride?.(
              currentCell.table.tableName,
              currentCell.field?.fieldName,
              currentCell.overrideIndex,
              currentCell?.value
            );
          }
          break;
        case spreadsheetMenuKeys.addChart:
          if (currentCell?.table?.tableName) {
            gridCallbacksRef.current.onAddChart?.(currentCell.table.tableName);
          }
          break;
        case spreadsheetMenuKeys.convertToChart:
          if (currentCell?.table?.tableName) {
            gridCallbacksRef.current.onConvertToChart?.(
              currentCell.table.tableName
            );
          }
          break;
        case spreadsheetMenuKeys.convertToTable:
          if (currentCell?.table?.tableName) {
            gridCallbacksRef.current.onConvertToTable?.(
              currentCell.table.tableName
            );
          }
          break;
      }
    },
    [api, gridCallbacksRef, gridServiceRef]
  );

  return {
    onClickContextMenu,
  };
}
