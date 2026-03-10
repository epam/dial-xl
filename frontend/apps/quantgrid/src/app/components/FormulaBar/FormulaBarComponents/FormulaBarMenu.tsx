import { Dropdown } from 'antd';
import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import Icon from '@ant-design/icons';
import {
  DotsIcon,
  formulaBarMenuClass,
  getDropdownItem,
  MenuItem,
} from '@frontend/common';

import { useFormulaBarStore } from '../../../store';

const formulaBarMenuPath = ['FormulaBarMenu'];

export function FormulaBarMenu() {
  const { formulaBarMode, setFormulaBarMode } = useFormulaBarStore(
    useShallow((s) => ({
      formulaBarMode: s.formulaBarMode,
      setFormulaBarMode: s.setFormulaBarMode,
    })),
  );

  const items = useMemo(
    () => [
      getDropdownItem({
        key: 'formula',
        fullPath: [...formulaBarMenuPath, 'FormulaMode'],
        label: 'Formula mode',
      }),
      getDropdownItem({
        key: 'value',
        fullPath: [...formulaBarMenuPath, 'ValueMode'],
        label: 'Value mode',
      }),
    ],
    [],
  );

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
    [setFormulaBarMode],
  );

  return (
    <div>
      <Dropdown
        autoAdjustOverflow={true}
        destroyOnHidden={true}
        menu={{
          items: items,
          selectable: true,
          selectedKeys: [formulaBarMode],
          onClick: onClick as any,
        }}
        rootClassName={formulaBarMenuClass}
        trigger={['click', 'contextMenu']}
      >
        <Icon
          className="w-[18px] text-text-primary hover:text-text-accent-primary"
          component={() => <DotsIcon />}
        />
      </Dropdown>
    </div>
  );
}
