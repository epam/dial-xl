import { Menu } from 'antd';
import type { MenuInfo } from 'rc-menu/lib/interface';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';

import {
  defaultFieldName,
  FormulasContextMenuKeyData,
  MenuItem,
} from '@frontend/common';
import { GridEvent } from '@frontend/spreadsheet';

import { ModalRefFunction, PanelName } from '../../common';
import {
  ApiContext,
  AppContext,
  InputsContext,
  LayoutContext,
  ProjectContext,
  SearchWindowContext,
  UndoRedoContext,
} from '../../context';
import {
  useCreateTableAction,
  useGridApi,
  useManualAddTableRowDSL,
  useManualCreateEntityDSL,
  useManualEditDSL,
  useProjectActions,
} from '../../hooks';
import { ShortcutsHelp } from '../Modals';
import {
  editMenuKeys,
  fileMenuKeys,
  getMenuItems,
  helpMenuKeys,
  insertMenuKeys,
  togglePanelKeys,
  viewMenuKeys,
} from './MainMenuItems';

export function MainMenu() {
  const {
    toggleChat,
    toggleChatWindowPlacement,
    chatWindowPlacement,
    toggleGrid,
  } = useContext(AppContext);
  const { userBucket } = useContext(ApiContext);
  const { togglePanel } = useContext(LayoutContext);
  const { clear, undo, redo } = useContext(UndoRedoContext);
  const { openSearchWindow } = useContext(SearchWindowContext);
  const gridApi = useGridApi();
  const { selectedCell, parsedSheets, projectBucket, isAIPendingChanges } =
    useContext(ProjectContext);
  const projectAction = useProjectActions();
  const { addField } = useManualEditDSL();
  const { functions } = useContext(ProjectContext);
  const { inputList } = useContext(InputsContext);
  const { onCreateTableAction } = useCreateTableAction();
  const { createManualTable } = useManualCreateEntityDSL();
  const { addTableRowToEnd, insertTableRowBefore, insertTableRowAfter } =
    useManualAddTableRowDSL();

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const openShortcutHelpModal = useRef<ModalRefFunction | null>(null);

  const openShortcutHelp = useCallback(() => {
    openShortcutHelpModal.current?.();
  }, []);

  const onClickFormulaItem = useCallback(
    (action: string, data: FormulasContextMenuKeyData) => {
      if (action.startsWith('CreateTable') || action.startsWith('Action')) {
        onCreateTableAction(
          action,
          data.type,
          data.insertFormula,
          data.tableName
        );

        return;
      }
    },
    [onCreateTableAction]
  );

  const onMenuItemClick = useCallback(
    (item: MenuInfo) => {
      const { key } = item;

      if (togglePanelKeys[key]) {
        togglePanel(togglePanelKeys[key]);

        return;
      }

      try {
        const { action, data } = JSON.parse(item.key);

        // Formulas menu usual function handler
        if (
          (data as any as FormulasContextMenuKeyData).insertFormula ||
          (data as any as FormulasContextMenuKeyData).tableName ||
          (data as any as FormulasContextMenuKeyData).type
        ) {
          const formulaData = data as FormulasContextMenuKeyData;
          onClickFormulaItem(action, formulaData);

          return;
        }
      } catch {
        // Empty catch
      }

      // Other handlers
      switch (key) {
        case fileMenuKeys.createProject:
          projectAction.createProjectAction();
          break;
        case fileMenuKeys.createWorksheet:
          projectAction.createWorksheetAction();
          break;
        case fileMenuKeys.clearProjectHistory:
          clear();
          break;
        case fileMenuKeys.deleteProject:
          projectAction.deleteProjectAction();
          break;
        case fileMenuKeys.shareProject:
          projectAction.shareProjectAction();
          break;
        case fileMenuKeys.closeProject:
          projectAction.closeProjectAction();
          break;
        case editMenuKeys.undo:
          undo();
          break;
        case editMenuKeys.redo:
          redo();
          break;
        case editMenuKeys.search:
          openSearchWindow();
          break;
        case editMenuKeys.renameWorksheet:
          projectAction.renameWorksheetAction();
          break;
        case editMenuKeys.deleteWorksheet:
          projectAction.deleteWorksheetAction();
          break;
        case editMenuKeys.renameProject:
          projectAction.renameProjectAction();
          break;
        case helpMenuKeys.shortcuts:
          openShortcutHelp();
          break;
        case insertMenuKeys.newField:
          if (selectedCell?.tableName) {
            addField(selectedCell.tableName, defaultFieldName, {
              withSelection: true,
            });
          }
          break;
        case insertMenuKeys.insertLeft:
        case insertMenuKeys.insertRight:
          if (selectedCell?.tableName && selectedCell?.fieldName) {
            addField(selectedCell.tableName, defaultFieldName, {
              direction: key === insertMenuKeys.insertLeft ? 'left' : 'right',
              insertFromFieldName: selectedCell.fieldName,
              withSelection: true,
            });
          }
          break;
        case insertMenuKeys.newRow:
          if (selectedCell?.tableName) {
            addTableRowToEnd(selectedCell.tableName, '');
          }
          break;
        case insertMenuKeys.newRowAbove:
          if (selectedCell?.tableName) {
            insertTableRowBefore(
              selectedCell.col,
              selectedCell.row,
              selectedCell.tableName,
              ''
            );
          }
          break;
        case insertMenuKeys.newRowBelow:
          if (selectedCell?.tableName) {
            insertTableRowAfter(
              selectedCell.col,
              selectedCell.row,
              selectedCell.tableName,
              ''
            );
          }
          break;
        case helpMenuKeys.toggleGrid: {
          toggleGrid();
          break;
        }
        case viewMenuKeys.resetSheetColumns: {
          if (gridApi) {
            gridApi.event?.emit({
              type: GridEvent.resetCurrentColumnSizes,
            });
          }
          break;
        }
        case viewMenuKeys.toggleChat: {
          if (chatWindowPlacement === 'panel') {
            togglePanel(PanelName.Chat);
          } else {
            toggleChat();
          }
          break;
        }
        case viewMenuKeys.ToggleChatPlacement: {
          toggleChatWindowPlacement();
          break;
        }
        default:
          break;
      }
    },
    [
      toggleGrid,
      togglePanel,
      onClickFormulaItem,
      projectAction,
      clear,
      undo,
      redo,
      openSearchWindow,
      openShortcutHelp,
      selectedCell,
      addField,
      addTableRowToEnd,
      insertTableRowBefore,
      insertTableRowAfter,
      gridApi,
      chatWindowPlacement,
      toggleChat,
      toggleChatWindowPlacement,
    ]
  );

  const handleCreateTableBySize = useCallback(
    (cols: number, rows: number) => {
      const colsItems = new Array(cols).fill('');
      const rowsItems = new Array(rows).fill(colsItems);
      createManualTable(
        selectedCell?.col ?? 1,
        selectedCell?.row ?? 1,
        rowsItems
      );
    },
    [createManualTable, selectedCell?.col, selectedCell?.row]
  );

  useEffect(() => {
    const gridCell =
      selectedCell && gridApi?.getCell(selectedCell.col, selectedCell.row);

    setMenuItems(
      getMenuItems({
        selectedCell: gridCell,
        functions,
        parsedSheets,
        inputFiles: inputList,
        isYourProject: userBucket === projectBucket,
        isAIPendingChanges,
        onCreateTable: handleCreateTableBySize,
      })
    );
  }, [
    functions,
    gridApi,
    handleCreateTableBySize,
    inputList,
    isAIPendingChanges,
    parsedSheets,
    projectBucket,
    selectedCell,
    userBucket,
  ]);

  return (
    <div className="select-none" id="mainProjectMenu">
      <Menu
        className="bg-bgLayer3 h-[39px] leading-[40px]"
        items={menuItems}
        mode="horizontal"
        selectable={false}
        onClick={onMenuItemClick}
      />
      <ShortcutsHelp openShortcutHelpModal={openShortcutHelpModal} />
    </div>
  );
}
