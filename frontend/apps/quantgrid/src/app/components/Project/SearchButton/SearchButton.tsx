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
        'flex items-center justify-start! text-[13px] font-bold! rounded-[3px] h-[28px] px-3! py-0 leading-4 shadow-none!',
        'focus:outline-0! focus-visible:outline-0! focus:border!',
        'text-text-secondary! hover:text-text-secondary!',
        colorSchema === 'read' &&
          'bg-bg-layer-4-inverted hover:!bg-bg-layer-4-inverted focus:!bg-bg-layer-4-inverted border-stroke-tertiary-inverted hover:border-stroke-tertiary-inverted! focus:border-stroke-tertiary-inverted!',
        (colorSchema === 'review' || colorSchema === 'default') &&
          'bg-bg-layer-4! hover:bg-bg-layer-4! focus:bg-bg-layer-4! border-stroke-tertiary hover:border-stroke-tertiary! focus:border-stroke-tertiary!'
      )}
      icon={
        (xl || md) && (
          <Icon
            className="text-text-secondary w-[18px]"
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
          className="text-text-secondary w-[18px]"
          component={() => <SearchIcon />}
        />
      )}
    </Button>
  );
}
