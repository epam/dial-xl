import { useMemo } from 'react';

import Icon from '@ant-design/icons';
import { getDropdownItem, MenuItem, QuestionIcon } from '@frontend/common/lib';

import { helpMenuKeys } from './constants';

export const useHelpMenuItems = (): MenuItem => {
  const helpMenuItem = useMemo(() => {
    return {
      label: 'Help',
      key: 'HelpMenu',
      icon: (
        <Icon
          className="text-text-secondary w-[18px]"
          component={() => <QuestionIcon />}
        />
      ),
      children: [
        getDropdownItem({
          label: 'Keyboard Shortcuts',
          fullPath: ['HelpMenu', 'KeyboardShortcuts'],
          key: helpMenuKeys.shortcuts,
        }),
      ],
    };
  }, []);

  return helpMenuItem;
};
