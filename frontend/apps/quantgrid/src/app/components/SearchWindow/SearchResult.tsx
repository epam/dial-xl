import cx from 'classnames';
import Fuse from 'fuse.js';

import Icon from '@ant-design/icons';
import { ColumnsIcon, FileIcon, QGLogo, TableIcon } from '@frontend/common';

import { ISearchResult, path2str } from './search';

type Props = {
  result: Fuse.FuseResult<ISearchResult>;
  className?: string;
  onClick?: () => void;
};

function getBoldStr(source: string, intervals: ReadonlyArray<Fuse.RangeTuple>) {
  let result = '';
  let currentIndex = 0;

  intervals.forEach(([start, end]) => {
    result += source.slice(currentIndex, start);
    result += `<b>${source.slice(start, end + 1)}</b>`;
    currentIndex = end + 1;
  });

  result += source.slice(currentIndex);

  return result;
}

export function SearchResult({ className, result, onClick }: Props) {
  const icon = () => {
    switch (result.item.type) {
      case 'project': {
        return (
          <Icon
            className="size-[18px] stroke-transparent"
            component={() => <QGLogo />}
          />
        );
      }
      case 'sheet': {
        return <Icon className="w-[18px]" component={() => <FileIcon />} />;
      }
      case 'table': {
        return <Icon className="w-[18px]" component={() => <TableIcon />} />;
      }
      case 'field': {
        return (
          <Icon className="size-[18px]" component={() => <ColumnsIcon />} />
        );
      }
    }
  };

  return (
    <div className={cx('flex items-center', className)} onClick={onClick}>
      <div className={'mr-2 h-full flex items-center'}>{icon()}</div>
      <div
        className="text-textPrimary text-[13px] mr-2"
        dangerouslySetInnerHTML={{
          __html: getBoldStr(
            result.item.name,
            result.matches?.[0].indices || []
          ),
        }}
      ></div>
      {result.item.path && (
        <span
          className={
            'ml-auto text-[11px] text-textSecondary overflow-hidden break-words'
          }
        >
          {path2str(result.item.path)}
        </span>
      )}
    </div>
  );
}
