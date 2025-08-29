import cx from 'classnames';

import Icon from '@ant-design/icons';
import { ChevronDown } from '@frontend/common';

export function CollapseIcon({ isActive }: any) {
  return (
    <Icon
      className={cx('w-[18px] text-textPrimary leading-none', {
        '-rotate-90': !isActive,
        'rotate-0': isActive,
      })}
      component={() => <ChevronDown />}
    />
  );
}
