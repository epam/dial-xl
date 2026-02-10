import cx from 'classnames';
import { useContext, useMemo } from 'react';

import { UndoRedoContext } from '../../../context';
import { formatTimeAgo } from './formatTimeAgo';

export function History() {
  const { history, undo, revertedIndex } = useContext(UndoRedoContext);

  const reversedHistory = useMemo(() => [...history].reverse(), [history]);

  return (
    <div className="p-1 h-full w-full overflow-auto bg-bg-layer-3 thin-scrollbar">
      {reversedHistory.map(({ title, time }, index) => {
        const reversedIndex = history.length - 1 - index;

        const isRevertedIndex =
          revertedIndex !== null && reversedIndex > revertedIndex;

        const isUndoIndex =
          revertedIndex !== null && revertedIndex === reversedIndex;

        const isTopHistory = index === 0;

        return (
          <div
            className={cx(
              'p-1 rounded-[3px] flex cursor-pointer hover:bg-bg-accent-primary-alpha',
              {
                'bg-bg-accent-primary-alpha': isUndoIndex,
                'bg-bg-layer-4': isRevertedIndex,
                'bg-bg-accent-primary-alpha border-l-2 border-l-stroke-accent-primary':
                  isTopHistory && !isRevertedIndex,
              }
            )}
            key={title + new Date(time).toLocaleString() + index}
            title={title + '\n' + new Date(time).toLocaleString()}
            onClick={() => !isTopHistory && undo({ undoIndex: reversedIndex })}
          >
            <p className="ml-auto text-[13px] mr-1 text-text-secondary">{`[${reversedIndex}]`}</p>
            <p className="text-[13px] text-ellipsis text-text-primary inline-block overflow-hidden w-full whitespace-nowrap mr-1">
              {title}
            </p>
            <p
              className={'text-[11px] text-text-secondary text-right min-w-max'}
            >
              {formatTimeAgo(time)}
            </p>
          </div>
        );
      })}

      {!history.length && (
        <div className="mx-auto max-w-max text-[13px] text-text-primary">
          There is no history changes
        </div>
      )}
    </div>
  );
}
