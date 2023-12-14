import cx from 'classnames';
import { useContext, useMemo } from 'react';

import { UndoRedoContext } from '../../context';
import { formatTimeAgo } from './formatTimeAgo';
import styles from './UndoRedo.module.scss';

export function UndoRedo() {
  const { history, undo, revertedIndex } = useContext(UndoRedoContext);

  const reversedHistory = useMemo(() => [...history].reverse(), [history]);

  return (
    <div className="p-1 h-full w-full overflow-auto">
      {reversedHistory.map(({ title, time }, index) => {
        const reversedIndex = history.length - 1 - index;

        const isRevertedIndex =
          revertedIndex !== null && reversedIndex > revertedIndex;

        const isUndoIndex =
          revertedIndex !== null && revertedIndex === reversedIndex;

        const isTopHistory = index === 0;
        const isBottomHistory = index === history.length - 1;

        return (
          <div
            className={cx('p-1 rounded-sm border-b flex cursor-pointer', {
              [styles.hoverHistory]: !isRevertedIndex,
              'border-t': isBottomHistory,
              'bg-green-200': isUndoIndex,
              'bg-gray-300': isRevertedIndex,
              'bg-yellow-200': isTopHistory,
            })}
            key={title + new Date(time).toLocaleString() + index}
            title={title + '\n' + new Date(time).toLocaleString()}
            onClick={() => !isTopHistory && undo(reversedIndex)}
          >
            <p className="ml-auto text-sm mr-1 text-blue-400">{`[${reversedIndex}]`}</p>
            <p className="text-sm text-ellipsis inline-block overflow-hidden w-full whitespace-nowrap mr-1">
              {title}
            </p>
            <p className={'text-xs text-slate-500 text-right min-w-max'}>
              {formatTimeAgo(time)}
            </p>
          </div>
        );
      })}

      {!history.length && (
        <div className="mx-auto max-w-max">There is no history changes </div>
      )}
    </div>
  );
}
