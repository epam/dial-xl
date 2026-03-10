import { useMemo } from 'react';

import { GridCell } from '@frontend/canvas-spreadsheet';
import {
  CommonMetadata,
  FunctionInfo,
  MenuItem,
  ResourcePermission,
} from '@frontend/common';
import { ParsedSheets } from '@frontend/parser';

import { RecentProject } from '../../services';
import { useEditMenuItems } from './useEditMenuItems';
import { useFileMenuItems } from './useFileMenuItems';
import { useHelpMenuItems } from './useHelpMenuItems';
import { useInsertMenuItems } from './useInsertMenuItems';
import { useViewMenuItems } from './useViewMenuItems';

export function useMainMenuItems({
  openKeys,
  selectedCell,
  functions,
  parsedSheets,
  inputFiles,
  isYourProject,
  isProjectShareable,
  isAIPendingChanges,
  recentProjects,
  panelsSplitEnabled,
  collapsedPanelsTextHidden,
  isMobile,
  permissions,
  onCreateTable,
  isReadOnlyMode,
  isCSVViewMode,
  isDefaultMode,
  isAIPreviewMode,
  isProjectReadonlyByUser,
  answerIsGenerating,
}: {
  openKeys: string[];
  selectedCell: GridCell | null | undefined;
  functions: FunctionInfo[];
  parsedSheets: ParsedSheets;
  inputFiles: CommonMetadata[] | null;
  isYourProject: boolean;
  isProjectShareable: boolean;
  permissions: ResourcePermission[];
  isAIPendingChanges: boolean;
  recentProjects: RecentProject[];
  panelsSplitEnabled: boolean;
  collapsedPanelsTextHidden: boolean;
  isMobile: boolean;
  onCreateTable: (cols: number, rows: number) => void;
  isReadOnlyMode: boolean;
  isCSVViewMode: boolean;
  isDefaultMode: boolean;
  isAIPreviewMode: boolean;
  isProjectReadonlyByUser: boolean;
  answerIsGenerating: boolean;
}) {
  const shortMenu = isReadOnlyMode || isAIPreviewMode || isCSVViewMode;
  const fullMenu = isDefaultMode;

  const showFileMenu = shortMenu || fullMenu;
  const showEditMenu = fullMenu;
  const showViewMenu = (shortMenu || fullMenu) && !isMobile;
  const showInsertMenu = fullMenu;
  const showHelpMenu = (shortMenu || fullMenu) && !isMobile;

  const isFileMenuOpen = useMemo(
    () => openKeys.includes('FileMenu'),
    [openKeys],
  );
  const isEditMenuOpen = useMemo(
    () => openKeys.includes('EditMenu'),
    [openKeys],
  );
  const isViewMenuOpen = useMemo(
    () => openKeys.includes('ViewMenu'),
    [openKeys],
  );
  const isInsertMenuOpen = useMemo(
    () => openKeys.includes('InsertMenu'),
    [openKeys],
  );

  const fileMenuItem = useFileMenuItems({
    isOpen: isFileMenuOpen,
    isDefaultMode,
    recentProjects,
    permissions,
    isYourProject,
    isProjectShareable,
    isProjectReadonlyByUser,
    isAIPendingChanges,
  });

  const editMenuItem = useEditMenuItems({
    isOpen: isEditMenuOpen,
    isAIPendingChanges,
    isDefaultMode,
    answerIsGenerating,
  });

  const viewMenuItem = useViewMenuItems({
    isOpen: isViewMenuOpen,
    collapsedPanelsTextHidden,
    panelsSplitEnabled,
  });
  const insertMenuItem = useInsertMenuItems({
    isOpen: isInsertMenuOpen,
    functions,
    inputFiles: inputFiles || [],
    onCreateTable,
    selectedCell,
    parsedSheets,
  });

  const helpMenuItem = useHelpMenuItems();

  return useMemo(() => {
    return [
      !showFileMenu ? undefined : fileMenuItem,
      !showEditMenu ? undefined : editMenuItem,
      !showViewMenu ? undefined : viewMenuItem,
      !showInsertMenu ? undefined : insertMenuItem,
      !showHelpMenu ? undefined : helpMenuItem,
    ].filter(Boolean) as MenuItem[];
  }, [
    editMenuItem,
    fileMenuItem,
    helpMenuItem,
    insertMenuItem,
    showEditMenu,
    showFileMenu,
    showHelpMenu,
    showInsertMenu,
    showViewMenu,
    viewMenuItem,
  ]);
}
