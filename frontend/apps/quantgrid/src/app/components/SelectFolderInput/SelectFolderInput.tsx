import { useCallback, useContext, useMemo, useState } from 'react';

import { publicBucket } from '@frontend/common';

import { ApiContext } from '../../context';
import { SelectFolder } from '../Modals';

interface Props {
  path: string | null | undefined;
  bucket: string;
  inputLabel?: string;
  changeLabel?: string;
  onSelectFolder: (path: string | null | undefined, bucket: string) => void;
}

export const SelectFolderInput = ({
  path,
  bucket,
  inputLabel = 'Upload to',
  changeLabel = 'Change',
  onSelectFolder,
}: Props) => {
  const { userBucket } = useContext(ApiContext);
  const [isSelectFolderOpen, setIsSelectFolderOpen] = useState(false);

  const rootFolderLabel = useMemo(() => {
    return bucket === userBucket
      ? 'Home'
      : bucket === publicBucket
      ? 'Public'
      : 'Shared with me';
  }, [bucket, userBucket]);

  const pathLabel = useMemo(() => {
    return bucket === publicBucket && path
      ? path.split('/').slice(1).join('/')
      : path;
  }, [bucket, path]);

  const handleSelectFolder = useCallback(
    (parentPath: string | null | undefined, bucket: string) => {
      onSelectFolder(parentPath, bucket);

      setIsSelectFolderOpen(false);
    },
    [onSelectFolder]
  );

  return (
    <>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-textSecondary">{inputLabel}</span>
        <div
          className="hover:cursor-pointer p-2 border border-strokePrimary rounded flex items-center justify-between gap-5 hover:border-strokeAccentPrimary"
          title={`${rootFolderLabel}${path ? `/${path}` : ''}`}
          onClick={() => setIsSelectFolderOpen(true)}
        >
          <span className="overflow-ellipsis text-nowrap shrink overflow-hidden text-textPrimary">
            {[rootFolderLabel, pathLabel].filter(Boolean).join('/')}
          </span>
          <span className="text-textAccentPrimary">{changeLabel}</span>
        </div>
      </div>
      {isSelectFolderOpen && (
        <SelectFolder
          initialBucket={bucket}
          initialPath={path}
          onCancel={() => setIsSelectFolderOpen(false)}
          onOk={handleSelectFolder}
        />
      )}
    </>
  );
};
