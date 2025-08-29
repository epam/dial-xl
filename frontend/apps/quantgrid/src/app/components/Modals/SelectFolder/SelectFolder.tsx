import { Button, Input, Modal, Spin } from 'antd';
import classNames from 'classnames';
import cx from 'classnames';
import Fuse from 'fuse.js';
import {
  ChangeEvent,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import Icon from '@ant-design/icons';
import {
  CheckIcon,
  CloseIcon,
  FilesMetadata,
  FolderIcon,
  FolderPlusIcon,
  getDropdownItem,
  HomeIcon,
  inputClasses,
  MetadataNodeType,
  modalFooterButtonClasses,
  primaryButtonClasses,
  publicBucket,
  secondaryButtonClasses,
} from '@frontend/common';

import { ApiContext } from '../../../context';
import { useApiRequests } from '../../../hooks';
import { createUniqueName } from '../../../services';
import { Breadcrumb } from '../../../types/breadcrumbs';
import { isEntityNameInvalid } from '../../../utils';
import { Breadcrumbs } from '../../Breadcrumbs/Breadcrumbs';

type Folder = Pick<FilesMetadata, 'name' | 'parentPath'> & {
  bucket: string | undefined;
};

const fuseOptions: Fuse.IFuseOptions<any> = {
  includeScore: true,
  includeMatches: true,
  threshold: 0.2,
  keys: ['name'],
};

type Props = {
  initialPath: string | null | undefined;
  initialBucket: string;
  onOk: (parentPath: string | null | undefined, bucket: string) => void;
  onCancel: () => void;
};

export function SelectFolder({
  initialPath,
  initialBucket,
  onOk,
  onCancel,
}: Props) {
  const { userBucket } = useContext(ApiContext);
  const { getFiles, getSharedWithMeFiles, createFolder } = useApiRequests();

  const [isOpen, setIsOpen] = useState(true);

  const [currentPath, setCurrentPath] = useState<string | null | undefined>(
    initialPath
  );
  const [currentBucket, setCurrentBucket] = useState<string | undefined>(
    initialBucket
  );
  const [storageFolders, setStorageFolders] = useState<Folder[]>([]);
  const [displayedFolders, setDisplayedFolders] = useState<Folder[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<Folder | undefined>();
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [renamingNewFolder, setRenamingNewFolder] = useState<
    Folder | undefined
  >();
  const [renameValue, setRenameValue] = useState('');

  const canCreateNewFolder = useMemo(() => {
    if (!currentPath) return true;

    return currentPath.split('/').length < 4;
  }, [currentPath]);

  const onNewFolderInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (isEntityNameInvalid(event.target.value)) return;

      setRenameValue(event.target.value);
    },
    []
  );

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => {
      onCancel();
    }, 200);
  }, [onCancel]);

  const handleGetFolders = useCallback(async () => {
    setIsLoading(true);

    let files: FilesMetadata[];
    if (currentBucket) {
      files =
        (await getFiles({
          path: `${currentBucket}/${currentPath ? currentPath + '/' : ''}`,
          suppressErrors: true,
        })) ?? [];
    } else {
      files = (await getSharedWithMeFiles()) ?? [];
    }

    setIsLoading(false);

    let folders: Folder[] = [];
    folders = folders.concat(
      files.filter((file) => file.nodeType === MetadataNodeType.FOLDER)
    );

    setStorageFolders(folders);
  }, [currentBucket, getFiles, currentPath, getSharedWithMeFiles]);

  const handleNavigateToFolder = useCallback((folder: Folder) => {
    setSearchValue('');
    setStorageFolders([]);
    setCurrentPath(
      `${folder.parentPath ? folder.parentPath + '/' : ''}${folder.name}`
    );
    setCurrentBucket(folder.bucket);
    setBreadcrumbs((breadcrumbs) => [
      ...breadcrumbs,
      {
        name: folder.name,
        path: [folder.parentPath, folder.name].filter(Boolean).join('/'),
        bucket: folder.bucket,
      },
    ]);

    setSelectedFolder(undefined);
  }, []);

  const handleSelectBreadcrumb = useCallback((breadcrumb: Breadcrumb) => {
    setCurrentPath(breadcrumb.path);
    setCurrentBucket(breadcrumb.bucket);
    setSearchValue('');
  }, []);

  const updateBreadcrumbs = useCallback(() => {
    const breadcrumbs = (currentPath ? currentPath.split('/') : []).reduce(
      (acc, curr, index) => {
        const prevBreadcrumb = acc[index];

        acc.push({
          path: [prevBreadcrumb.path, curr].filter(Boolean).join('/'),
          name: curr,
          bucket: currentBucket,
        });

        return acc;
      },
      [
        {
          name:
            currentBucket === userBucket
              ? 'Home'
              : currentBucket === publicBucket
              ? 'Public'
              : 'Shared with me',
          path: null,
          icon: <HomeIcon />,
          dropdownItems: [
            getDropdownItem({
              key: 'Home',
              label: 'Home',
              onClick: () => {
                handleSelectBreadcrumb({
                  name: 'Home',
                  path: null,
                  bucket: userBucket,
                });
              },
            }),
            getDropdownItem({
              key: 'SharedWithMe',
              label: 'Shared with me',
              onClick: () => {
                handleSelectBreadcrumb({
                  name: 'Shared with me',
                  path: null,
                  bucket: undefined,
                });
              },
            }),
            getDropdownItem({
              key: 'Public',
              label: 'Public',
              onClick: () => {
                handleSelectBreadcrumb({
                  name: 'Public',
                  path: null,
                  bucket: publicBucket,
                });
              },
            }),
          ],
        },
      ] as Breadcrumb[]
    );

    setBreadcrumbs(breadcrumbs);
  }, [currentBucket, currentPath, handleSelectBreadcrumb, userBucket]);

  const addNewFolder = useCallback(() => {
    const newFolderName = createUniqueName(
      'New folder',
      storageFolders.map((folder) => folder.name)
    );
    const folder: Folder = {
      name: newFolderName,
      parentPath: currentPath,
      bucket: currentBucket,
    };
    setRenamingNewFolder(folder);
    setRenameValue(newFolderName);

    setStorageFolders((folders) => [...folders, folder]);
  }, [currentBucket, currentPath, storageFolders]);

  const finishRenamingNewFolder = useCallback(
    async (isOk: boolean, folder: Folder) => {
      setRenamingNewFolder(undefined);

      if (!isOk || !folder.bucket) return;

      const result = await createFolder({
        bucket: folder.bucket,
        path: folder.parentPath,
        name: renameValue,
      });

      if (!result) return;

      handleGetFolders();
    },
    [createFolder, renameValue, handleGetFolders]
  );

  useEffect(() => {
    if (!userBucket) return;

    updateBreadcrumbs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath, currentBucket]);

  useEffect(() => {
    handleGetFolders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath, handleGetFolders]);

  useEffect(() => {
    const itemsFuse = new Fuse(storageFolders, fuseOptions);
    const finalFolders = searchValue
      ? itemsFuse.search(searchValue).map((i) => i.item)
      : storageFolders;

    setDisplayedFolders(finalFolders);
  }, [storageFolders, searchValue, currentPath, currentBucket]);

  return (
    <Modal
      cancelButtonProps={{
        className: classNames(modalFooterButtonClasses, secondaryButtonClasses),
      }}
      destroyOnClose={true}
      footer={null}
      open={isOpen}
      title={`Select folder`}
      onCancel={handleClose}
    >
      <div className="flex flex-col gap-3 min-h-[400px] max-h-[70dvh] justify-between overflow-hidden">
        <div className="flex flex-col gap-2 flex-grow overflow-hidden">
          <div>
            <Input
              className={classNames('h-[38px]', inputClasses)}
              placeholder="Search folders"
              value={searchValue}
              autoFocus
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>

          <Breadcrumbs
            breadcrumbs={breadcrumbs}
            classNames="pl-3"
            onSelectBreadcrumb={handleSelectBreadcrumb}
          />

          <div className="flex flex-col flex-grow overflow-auto thin-scrollbar">
            {isLoading ? (
              <div className="size-full flex flex-grow items-center justify-center">
                <Spin className="z-50" size="large"></Spin>
              </div>
            ) : (
              displayedFolders.map((folder) => (
                <div
                  className={classNames(
                    'flex items-center gap-2 py-1.5 px-3 h-[30px] hover:bg-bgAccentPrimaryAlpha rounded cursor-pointer border-l-2 border-transparent select-none',
                    selectedFolder?.name === folder.name &&
                      selectedFolder.parentPath === folder.parentPath &&
                      'border-l-strokeAccentPrimary bg-bgAccentPrimaryAlpha'
                  )}
                  key={folder.parentPath + folder.name}
                  onClick={() => setSelectedFolder(folder)}
                  onDoubleClick={() => handleNavigateToFolder(folder)}
                >
                  <Icon
                    className="w-[18px] text-textSecondary shrink-0 hover:text-textAccentPrimary"
                    component={() => <FolderIcon />}
                  />
                  {renamingNewFolder?.name === folder.name &&
                  renamingNewFolder.parentPath === folder.parentPath ? (
                    <>
                      <Input
                        className={classNames('h-6 px-1', inputClasses)}
                        value={renameValue}
                        autoFocus
                        onChange={onNewFolderInputChange}
                      />
                      <button
                        className="flex items-center text-textSecondary hover:text-textAccentPrimary disabled:text-textSecondary"
                        disabled={!renameValue}
                        onClick={() => finishRenamingNewFolder(true, folder)}
                      >
                        <Icon
                          className="w-[18px] shrink-0 "
                          component={() => <CheckIcon />}
                        />
                      </button>
                      <button
                        className="flex items-center text-textSecondary hover:text-textAccentPrimary disabled:text-textSecondary disabled:hover:text-textSecondary"
                        onClick={() => finishRenamingNewFolder(false, folder)}
                      >
                        <Icon
                          className="w-[18px] shrink-0"
                          component={() => <CloseIcon />}
                        />
                      </button>
                    </>
                  ) : (
                    folder.name
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-5 border-t border-strokePrimary">
          <button disabled={!canCreateNewFolder} onClick={addNewFolder}>
            <Icon
              className={cx('w-[24px] text-textSecondary shrink-0', {
                'hover:text-textAccentPrimary': canCreateNewFolder,
              })}
              component={() => <FolderPlusIcon />}
            />
          </button>
          <Button
            className={classNames(primaryButtonClasses, 'h-10 text-base')}
            disabled={!currentBucket}
            onClick={() =>
              onOk(
                selectedFolder
                  ? [selectedFolder.parentPath, selectedFolder.name]
                      .filter(Boolean)
                      .join('/')
                  : currentPath,
                currentBucket!
              )
            }
          >
            Select folder
          </Button>
        </div>
      </div>
    </Modal>
  );
}
