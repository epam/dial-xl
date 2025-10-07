import cx from 'classnames';
import { useContext } from 'react';

import { AppContext } from '../../../context';

type Prop = {
  text: string;
};

export function FormulaBarTitle({ text }: Prop) {
  const { formulaBarExpanded } = useContext(AppContext);

  return (
    <div
      className={cx('h-full flex', {
        'items-center': !formulaBarExpanded,
        'items-start': formulaBarExpanded,
      })}
    >
      <span
        className={cx(
          'text-[13px] px-2 select-none text-text-secondary text-ellipsis inline-block overflow-hidden whitespace-nowrap',
          {
            'pt-2 leading-none': formulaBarExpanded,
            'leading-6': !formulaBarExpanded,
          }
        )}
      >
        {text}
      </span>
    </div>
  );
}
