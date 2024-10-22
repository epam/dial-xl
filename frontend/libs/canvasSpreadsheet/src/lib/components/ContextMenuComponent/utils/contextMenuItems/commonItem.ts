import {
  getDropdownItem,
  getDropdownMenuKey,
  MenuItem,
} from '@frontend/common';

import { spreadsheetMenuKeys as menuKey } from '../config';
import { ContextMenuKeyData } from '../types';

export function arrangeTableItems(col: number, row: number): MenuItem {
  return getDropdownItem({
    label: 'Arrange',
    key: 'Arrange',
    children: [
      getDropdownItem({
        label: 'Bring Forward',
        key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.tableForward, {
          col,
          row,
        }),
      }),
      getDropdownItem({
        label: 'Bring to Front',
        key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.tableToFront, {
          col,
          row,
        }),
      }),
      getDropdownItem({
        label: 'Send Backward',
        key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.tableBackward, {
          col,
          row,
        }),
      }),
      getDropdownItem({
        label: 'Send To Back',
        key: getDropdownMenuKey<ContextMenuKeyData>(menuKey.tableToBack, {
          col,
          row,
        }),
      }),
    ],
  });
}
