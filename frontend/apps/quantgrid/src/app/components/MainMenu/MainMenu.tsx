import { Menu } from 'antd';
import cx from 'classnames';
import type { MenuInfo } from 'rc-menu/lib/interface';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { GridEvent } from '@frontend/canvas-spreadsheet';
import {
  defaultFieldName,
  FormulasContextMenuKeyData,
  InsertChartContextMenuKeyData,
  MenuItem,
} from '@frontend/common';

import { ColorSchema, PanelName } from '../../common';
import {
  ApiContext,
  ChatOverlayContext,
  InputsContext,
  LayoutContext,
  ProjectContext,
  UndoRedoContext,
} from '../../context';
import {
  useChartEditDsl,
  useCreateTableAction,
  useCreateTableDsl,
  useFieldEditDsl,
  useGridApi,
  useProjectActions,
  useProjectMode,
  useWorksheetActions,
} from '../../hooks';
import { useAddTableRow } from '../../hooks/EditDsl/useAddTableRow';
import { getRecentProjects, RecentProject } from '../../services';
import {
  useControlStore,
  useSearchModalStore,
  useShortcutsHelpModalStore,
  useUIStore,
  useViewStore,
} from '../../store';
import { routes } from '../../types';
import { getProjectNavigateUrl } from '../../utils';
import {
  editMenuKeys,
  fileMenuKeys,
  getMenuItems,
  helpMenuKeys,
  insertMenuKeys,
  togglePanelKeys,
  viewMenuKeys,
} from './MainMenuItems';

interface Props {
  isMobile?: boolean;
  onClose?: () => void;
  colorSchema: ColorSchema;
}

export function MainMenu({
  onClose,
  isMobile = false,
  colorSchema = 'default',
}: Props) {
  const { toggleChat, toggleChatWindowPlacement, chatWindowPlacement } =
    useUIStore(
      useShallow((s) => ({
        toggleChat: s.toggleChat,
        toggleChatWindowPlacement: s.toggleChatWindowPlacement,
        chatWindowPlacement: s.chatWindowPlacement,
      }))
    );
  const selectedCell = useViewStore((s) => s.selectedCell);
  const { userBucket } = useContext(ApiContext);
  const {
    togglePanel,
    openPanel,
    panelsSplitEnabled,
    updateSplitPanelsEnabled,
    collapsedPanelsTextHidden,
    updateCollapsedPanelsTextHidden,
  } = useContext(LayoutContext);
  const { clear, undo, redo } = useContext(UndoRedoContext);
  const openSearchModal = useSearchModalStore((s) => s.open);
  const openShortcutsHelpModal = useShortcutsHelpModalStore((s) => s.open);
  const openControlCreateWizard = useControlStore(
    (s) => s.openControlCreateWizard
  );
  const gridApi = useGridApi();
  const {
    functions,
    parsedSheets,
    projectBucket,
    isProjectShareable,
    isProjectReadonlyByUser,
    projectPermissions,
    setIsProjectReadonlyByUser,
  } = useContext(ProjectContext);
  const { isAIPendingChanges, answerIsGenerating } =
    useContext(ChatOverlayContext);
  const projectAction = useProjectActions();
  const worksheetAction = useWorksheetActions();
  const { inputList } = useContext(InputsContext);
  const { onCreateTableAction } = useCreateTableAction();
  const { createManualTable } = useCreateTableDsl();
  const { addTableRowToEnd, insertTableRowBefore, insertTableRowAfter } =
    useAddTableRow();
  const { addField } = useFieldEditDsl();
  const { addChart } = useChartEditDsl();

  const {
    isReadOnlyMode,
    isCSVViewMode,
    isDefaultMode,
    isAIPreviewMode,
    isAIPendingMode,
  } = useProjectMode();

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  // Key is used to redraw the menu when the mode changes
  // Without it, the menu can be collapsed under 3 dots when the mode changes
  const menuVariantKey = useMemo(
    () => 'menu-key-' + new Date().getTime(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      isReadOnlyMode,
      isAIPreviewMode,
      isCSVViewMode,
      isDefaultMode,
      isAIPendingMode,
    ]
  );

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

        if (
          (data as any as InsertChartContextMenuKeyData).chartType &&
          (data as any as InsertChartContextMenuKeyData).tableName
        ) {
          const { chartType, tableName } =
            data as InsertChartContextMenuKeyData;

          addChart(tableName, chartType, selectedCell?.col, selectedCell?.row);

          return;
        }

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

        if (action === fileMenuKeys.openProject) {
          const recentProject = data as RecentProject;

          window.open(
            getProjectNavigateUrl({
              projectBucket: recentProject.projectBucket,
              projectName: recentProject.projectName,
              projectPath: recentProject.projectPath,
              projectSheetName: recentProject.sheetName,
            }),
            '_blank'
          );
        }
      } catch {
        // Empty catch
      }

      // Other handlers
      switch (key) {
        case fileMenuKeys.createProject:
          projectAction.createProjectAction();
          break;
        case fileMenuKeys.makeReadonly:
          setIsProjectReadonlyByUser(!isProjectReadonlyByUser);
          break;
        case fileMenuKeys.createWorksheet:
          worksheetAction.createWorksheetAction();
          break;
        case fileMenuKeys.clearProjectHistory:
          clear();
          break;
        case fileMenuKeys.deleteProject:
          projectAction.deleteCurrentProjectAction();
          break;
        case fileMenuKeys.shareProject:
          projectAction.shareProjectAction();
          break;
        case fileMenuKeys.cloneProject:
          projectAction.cloneCurrentProjectAction();
          break;
        case fileMenuKeys.downloadProject:
          projectAction.downloadCurrentProjectAction();
          break;
        case fileMenuKeys.closeProject:
          projectAction.closeProjectAction();
          break;
        case fileMenuKeys.viewAllProjects:
          window.open(routes.home, '_blank');
          break;
        case editMenuKeys.undo:
          undo();
          break;
        case editMenuKeys.redo:
          redo();
          break;
        case editMenuKeys.search:
          openSearchModal();
          break;
        case editMenuKeys.renameWorksheet:
          worksheetAction.renameWorksheetAction();
          break;
        case editMenuKeys.deleteWorksheet:
          worksheetAction.deleteWorksheetAction();
          break;
        case editMenuKeys.renameProject:
          projectAction.renameProjectAction();
          break;
        case helpMenuKeys.shortcuts:
          openShortcutsHelpModal();
          break;
        case insertMenuKeys.newField:
          if (selectedCell?.tableName) {
            addField(selectedCell.tableName, defaultFieldName, {
              withSelection: true,
            });
          }
          break;
        case insertMenuKeys.control:
          openControlCreateWizard();
          openPanel(PanelName.Details);

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
        case viewMenuKeys.togglePanelLabels: {
          updateCollapsedPanelsTextHidden(!collapsedPanelsTextHidden);
          break;
        }
        case viewMenuKeys.toggleSplitPanels: {
          updateSplitPanelsEnabled(!panelsSplitEnabled);
          break;
        }
        default:
          break;
      }
    },
    [
      addChart,
      openPanel,
      togglePanel,
      onClickFormulaItem,
      projectAction,
      worksheetAction,
      setIsProjectReadonlyByUser,
      isProjectReadonlyByUser,
      clear,
      undo,
      redo,
      openSearchModal,
      selectedCell?.tableName,
      selectedCell?.fieldName,
      selectedCell?.col,
      selectedCell?.row,
      addField,
      addTableRowToEnd,
      insertTableRowBefore,
      insertTableRowAfter,
      gridApi,
      chatWindowPlacement,
      toggleChat,
      toggleChatWindowPlacement,
      updateCollapsedPanelsTextHidden,
      collapsedPanelsTextHidden,
      updateSplitPanelsEnabled,
      panelsSplitEnabled,
      openShortcutsHelpModal,
      openControlCreateWizard,
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
    [selectedCell?.col, selectedCell?.row, createManualTable]
  );

  useEffect(() => {
    const gridCell =
      selectedCell && gridApi?.getCell(selectedCell.col, selectedCell.row);
    const recentProjects = getRecentProjects();

    setMenuItems(
      getMenuItems({
        selectedCell: gridCell,
        functions,
        parsedSheets,
        inputFiles: inputList,
        isYourProject: userBucket === projectBucket,
        isProjectShareable,
        isAIPendingChanges,
        recentProjects,
        collapsedPanelsTextHidden,
        panelsSplitEnabled,
        isMobile,
        onCreateTable: handleCreateTableBySize,
        isReadOnlyMode,
        isCSVViewMode,
        isDefaultMode,
        isAIPreviewMode,
        isProjectReadonlyByUser,
        permissions: projectPermissions,
        answerIsGenerating,
      })
    );
  }, [
    collapsedPanelsTextHidden,
    functions,
    gridApi,
    handleCreateTableBySize,
    inputList,
    isAIPendingChanges,
    panelsSplitEnabled,
    parsedSheets,
    projectBucket,
    selectedCell,
    userBucket,
    isMobile,
    isProjectShareable,
    isReadOnlyMode,
    isCSVViewMode,
    isDefaultMode,
    isAIPreviewMode,
    isProjectReadonlyByUser,
    projectPermissions,
    answerIsGenerating,
  ]);

  return (
    <div
      className="select-none"
      id="mainProjectMenu"
      style={{ minWidth: 0, flex: 'auto' }}
    >
      <Menu
        className={cx('bg-transparent h-[39px] leading-[40px]', colorSchema)}
        items={menuItems}
        key={menuVariantKey}
        mode={isMobile ? 'inline' : 'horizontal'}
        selectable={false}
        onClick={(e) => {
          onMenuItemClick(e);
          onClose?.();
        }}
      />
    </div>
  );
}
