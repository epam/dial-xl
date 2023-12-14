import cx from 'classnames';
import Fuse from 'fuse.js';

import {
  DatabaseOutlined,
  FileOutlined,
  FolderOutlined,
  TableOutlined,
} from '@ant-design/icons';

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
        return <FolderOutlined />;
      }
      case 'sheet': {
        return <FileOutlined />;
      }
      case 'table': {
        return <TableOutlined />;
      }
      case 'field': {
        return <DatabaseOutlined />;
      }
    }
  };

  return (
    <div className={cx('flex items-center', className)} onClick={onClick}>
      <div className={'mr-2 h-full flex items-center'}>{icon()}</div>
      <div
        dangerouslySetInnerHTML={{
          __html: getBoldStr(
            result.item.name,
            result.matches?.[0].indices || []
          ),
        }}
      ></div>
      {result.item.path && (
        <span className={'ml-auto text-xs opacity-20'}>
          {path2str(result.item.path)}
        </span>
      )}
    </div>
  );
}
