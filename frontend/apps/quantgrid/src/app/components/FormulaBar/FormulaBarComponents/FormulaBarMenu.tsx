import { Dropdown } from 'antd';
import { useCallback, useContext } from 'react';

import Icon from '@ant-design/icons';
import {
  DotsIcon,
  formulaBarMenuClass,
  getDropdownItem,
  MenuItem,
} from '@frontend/common';

import { AppContext } from '../../../context';

export function FormulaBarMenu() {
  const { formulaBarMode, setFormulaBarMode } = useContext(AppContext);
  const items = [
    getDropdownItem({
      key: 'formula',
      label: 'Formula mode',
    }),
    getDropdownItem({
      key: 'value',
      label: 'Value mode',
    }),
  ];

  const onClick = useCallback(
    (item: MenuItem) => {
      switch (item?.key) {
        case 'formula':
        case 'value':
          setFormulaBarMode(item.key);
          break;
        default:
          break;
      }
    },
    [setFormulaBarMode]
  );

  return (
    <div>
      <Dropdown
        autoAdjustOverflow={true}
        destroyPopupOnHide={true}
        menu={{
          items: items,
          selectable: true,
          selectedKeys: [formulaBarMode],
          onClick,
        }}
        rootClassName={formulaBarMenuClass}
        trigger={['click', 'contextMenu']}
      >
        <Icon
          className="w-[18px] text-textPrimary hover:text-textAccentPrimary"
          component={() => <DotsIcon />}
        />
      </Dropdown>
    </div>
  );
}
