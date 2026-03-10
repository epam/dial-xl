import { useMemo } from 'react';

import Icon from '@ant-design/icons';
import {
  disabledTooltips,
  EditIcon,
  getDropdownDivider,
  getDropdownItem,
  MenuItem,
  Shortcut,
  shortcutApi,
} from '@frontend/common/lib';

import { editMenuKeys, fileMenuKeys } from './constants';

export const useEditMenuItems = ({
  isAIPendingChanges,
  isDefaultMode,
  answerIsGenerating,
  isOpen,
}: {
  isAIPendingChanges: boolean;
  isDefaultMode: boolean;
  answerIsGenerating: boolean;
  isOpen: boolean;
}): MenuItem => {
  const editMenuItem = useMemo(() => {
    const editMenuPath = ['EditMenu'];

    return {
      label: 'Edit',
      key: 'EditMenu',
      icon: (
        <Icon
          className="w-[18px] text-text-secondary"
          component={() => <EditIcon />}
        />
      ),
      children: isOpen
        ? [
            getDropdownItem({
              label: 'Undo',
              fullPath: [...editMenuPath, 'Undo'],
              key: editMenuKeys.undo,
              shortcut: shortcutApi.getLabel(Shortcut.UndoAction),
              disabled: isAIPendingChanges,
              tooltip: isAIPendingChanges
                ? disabledTooltips.pendingAIChanges
                : undefined,
            }),
            getDropdownItem({
              label: 'Redo',
              fullPath: [...editMenuPath, 'Redo'],
              key: editMenuKeys.redo,
              shortcut: shortcutApi.getLabel(Shortcut.RedoAction),
              disabled: isAIPendingChanges,
              tooltip: isAIPendingChanges
                ? disabledTooltips.pendingAIChanges
                : undefined,
            }),
            getDropdownItem({
              label: 'Clear project history',
              fullPath: [...editMenuPath, 'ClearProjectHistory'],
              key: fileMenuKeys.clearProjectHistory,
            }),
            getDropdownDivider(),
            getDropdownItem({
              label: 'Search',
              fullPath: [...editMenuPath, 'Search'],
              key: editMenuKeys.search,
              shortcut: shortcutApi.getLabel(Shortcut.SearchWindow),
            }),
            getDropdownDivider(),
            getDropdownItem({
              label: 'Rename Worksheet',
              fullPath: [...editMenuPath, 'RenameWorksheet'],
              key: editMenuKeys.renameWorksheet,
              disabled: !isDefaultMode || answerIsGenerating,
              tooltip: !isDefaultMode
                ? disabledTooltips.notAllowedChanges
                : answerIsGenerating
                  ? disabledTooltips.answerIsGenerating
                  : undefined,
            }),
            getDropdownItem({
              label: 'Delete Worksheet',
              fullPath: [...editMenuPath, 'DeleteWorksheet'],
              key: editMenuKeys.deleteWorksheet,
              disabled: !isDefaultMode || answerIsGenerating,
              tooltip: !isDefaultMode
                ? disabledTooltips.notAllowedChanges
                : answerIsGenerating
                  ? disabledTooltips.answerIsGenerating
                  : undefined,
            }),
          ]
        : [],
    };
  }, [isOpen, answerIsGenerating, isAIPendingChanges, isDefaultMode]);

  return editMenuItem;
};
