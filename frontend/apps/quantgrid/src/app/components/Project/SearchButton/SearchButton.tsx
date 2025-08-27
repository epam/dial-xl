import { Button, Grid } from 'antd';
import cx from 'classnames';
import { useContext } from 'react';

import Icon from '@ant-design/icons';
import { SearchIcon, Shortcut, shortcutApi } from '@frontend/common';

import { ColorSchema } from '../../../common';
import { SearchWindowContext } from '../../../context';

type Props = {
  colorSchema?: ColorSchema;
};

export function SearchButton({ colorSchema = 'default' }: Props) {
  const { openSearchWindow } = useContext(SearchWindowContext);

  const { xl, md } = Grid.useBreakpoint();

  return (
    <Button
      className={cx(
        'flex items-center !justify-start text-[13px] !font-bold rounded-[3px] h-[28px] !px-3 py-0 leading-4 !shadow-none',
        'focus:!outline-0 focus-visible:!outline-0 focus:!border',
        '!text-textSecondary hover:!text-textSecondary',
        colorSchema === 'read' &&
          'bg-bgLayer4Inverted hover:!bg-bgLayer4Inverted focus:!bg-bgLayer4Inverted border-strokeTertiaryInverted hover:!border-strokeTertiaryInverted focus:!border-strokeTertiaryInverted',
        (colorSchema === 'review' || colorSchema === 'default') &&
          '!bg-bgLayer4 hover:!bg-bgLayer4 focus:!bg-bgLayer4 border-strokeTertiary hover:!border-strokeTertiary focus:!border-strokeTertiary'
      )}
      icon={
        (xl || md) && (
          <Icon
            className="text-textSecondary w-[18px]"
            component={() => <SearchIcon />}
          />
        )
      }
      onClick={openSearchWindow}
    >
      {xl ? (
        `Type ${shortcutApi.getLabel(Shortcut.SearchWindow)} to search`
      ) : md ? (
        'Search'
      ) : (
        <Icon
          className="text-textSecondary w-[18px]"
          component={() => <SearchIcon />}
        />
      )}
    </Button>
  );
}
