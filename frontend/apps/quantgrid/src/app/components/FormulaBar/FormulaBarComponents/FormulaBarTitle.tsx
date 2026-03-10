import cx from 'classnames';

import { useFormulaBarStore } from '../../../store';

type Prop = {
  text: string;
};

export function FormulaBarTitle({ text }: Prop) {
  const formulaBarExpanded = useFormulaBarStore((s) => s.formulaBarExpanded);

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
          },
        )}
      >
        {text}
      </span>
    </div>
  );
}
