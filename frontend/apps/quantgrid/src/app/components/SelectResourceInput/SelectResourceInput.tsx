import { useCallback, useContext, useMemo, useState } from 'react';

import Icon from '@ant-design/icons';
import { CloseIcon, publicBucket } from '@frontend/common';

import { ApiContext } from '../../context';
import { constructPath } from '../../utils';
import { SelectFile, SelectFolder } from '../Modals';

interface Props {
  isSelectFolder?: boolean;
  path: string | null | undefined;
  bucket: string | undefined;
  name?: string;
  inputLabel?: string;
  changeLabel?: string;
  fileExtensions?: string[];
  onSelect: (
    bucket: string,
    path: string | null | undefined,
    name: string | undefined
  ) => void;
  onReset?: () => void;
}

export const SelectResourceInput = ({
  isSelectFolder = true,
  path,
  bucket,
  name,
  inputLabel = 'Upload to',
  changeLabel = 'Change',
  fileExtensions,
  onSelect,
  onReset,
}: Props) => {
  const { userBucket } = useContext(ApiContext);
  const [isSelectOpen, setIsSelectOpen] = useState(false);

  const rootFolderLabel = useMemo(() => {
    return bucket === userBucket
      ? 'My Files'
      : bucket === publicBucket
      ? 'Public'
      : bucket
      ? 'Shared with me'
      : undefined;
  }, [bucket, userBucket]);

  const pathLabel = useMemo(() => {
    return bucket === publicBucket && path
      ? path.split('/').slice(1).join('/')
      : path;
  }, [bucket, path]);

  const handleSelect = useCallback(
    (bucket: string, parentPath: string | null | undefined, name?: string) => {
      onSelect(bucket, parentPath, name);

      setIsSelectOpen(false);
    },
    [onSelect]
  );

  if (!userBucket) return;

  return (
    <>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-text-secondary">{inputLabel}</span>
        <div
          className="hover:cursor-pointer p-2 border border-stroke-primary rounded-sm flex items-center justify-between gap-5 hover:border-stroke-accent-primary"
          title={constructPath([rootFolderLabel, pathLabel, name])}
          onClick={() => setIsSelectOpen(true)}
        >
          <span className="text-ellipsis text-nowrap shrink overflow-hidden text-text-primary">
            {constructPath([rootFolderLabel, pathLabel, name])}
          </span>
          <div className="flex items-center gap-2">
            <button className="text-text-accent-primary cursor-pointer">
              {changeLabel}
            </button>
            {onReset && (
              <button
                className="cursor-pointer flex items-center"
                onClick={(e) => {
                  onReset();
                  e.stopPropagation();
                }}
              >
                <Icon
                  className="text-text-secondary hover:text-text-accent-primary size-5"
                  component={() => <CloseIcon />}
                ></Icon>
              </button>
            )}
          </div>
        </div>
      </div>
      {isSelectOpen &&
        (isSelectFolder ? (
          <SelectFolder
            initialBucket={bucket ?? userBucket}
            initialPath={path}
            onCancel={() => setIsSelectOpen(false)}
            onOk={handleSelect}
          />
        ) : (
          <SelectFile
            fileExtensions={fileExtensions ?? []}
            initialBucket={bucket ?? userBucket}
            initialPath={path}
            modalTitle="Select logo"
            okButtonText="Select"
            onCancel={() => setIsSelectOpen(false)}
            onOk={(parentPath, bucket, name) =>
              handleSelect(bucket, parentPath, name)
            }
          />
        ))}
    </>
  );
};
