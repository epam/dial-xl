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
  FolderIcon,
  FolderPlusIcon,
  getDropdownItem,
  HomeIcon,
  inputClasses,
  MetadataNodeType,
  MetadataResourceType,
  modalFooterButtonClasses,
  primaryButtonClasses,
  publicBucket,
  ResourceMetadata,
  secondaryButtonClasses,
  SharedWithMeMetadata,
} from '@frontend/common';

import { ApiContext } from '../../../context';
import { useApiRequests } from '../../../hooks';
import { createUniqueName } from '../../../services';
import { Breadcrumb } from '../../../types/breadcrumbs';
import { isEntityNameInvalid } from '../../../utils';
import { Breadcrumbs } from '../../Breadcrumbs/Breadcrumbs';

type Folder = Pick<ResourceMetadata, 'name' | 'parentPath'> & {
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
  onOk: (bucket: string, parentPath: string | null | undefined) => void;
  onCancel: () => void;
};

export function SelectFolder({
  initialPath,
  initialBucket,
  onOk,
  onCancel,
}: Props) {
  const { userBucket } = useContext(ApiContext);
  const { getFiles, getSharedWithMeResources, createFolder } = useApiRequests();

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

    let files: (SharedWithMeMetadata | ResourceMetadata)[];
    if (currentBucket) {
      files =
        (await getFiles({
          path: `${currentBucket}/${currentPath ? currentPath + '/' : ''}`,
          suppressErrors: true,
        })) ?? [];
    } else {
      files =
        (await getSharedWithMeResources({
          resourceType: MetadataResourceType.FILE,
        })) ?? [];
    }

    setIsLoading(false);

    let folders: Folder[] = [];
    folders = folders.concat(
      files.filter((file) => file.nodeType === MetadataNodeType.FOLDER)
    );

    setStorageFolders(folders);
  }, [currentBucket, getFiles, currentPath, getSharedWithMeResources]);

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
              ? 'My Files'
              : currentBucket === publicBucket
              ? 'Public'
              : 'Shared with me',
          path: null,
          icon: <HomeIcon />,
          dropdownItems: [
            getDropdownItem({
              key: 'MyFiles',
              label: 'My Files',
              onClick: () => {
                handleSelectBreadcrumb({
                  name: 'My Files',
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
        parentPath: folder.parentPath,
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
    // below triggers, not dependencies
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
      destroyOnHidden={true}
      footer={null}
      open={isOpen}
      title={`Select folder`}
      onCancel={handleClose}
    >
      <div className="flex flex-col gap-3 min-h-[400px] max-h-[70dvh] justify-between overflow-hidden">
        <div className="flex flex-col gap-2 grow overflow-hidden">
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

          <div className="flex flex-col grow overflow-auto thin-scrollbar">
            {isLoading ? (
              <div className="size-full flex grow items-center justify-center">
                <Spin className="z-50" size="large"></Spin>
              </div>
            ) : (
              displayedFolders.map((folder) => (
                <div
                  className={classNames(
                    'flex items-center text-text-primary gap-2 py-1.5 px-3 h-[30px] hover:bg-bg-accent-primary-alpha rounded-sm cursor-pointer border-l-2 border-transparent select-none',
                    selectedFolder?.name === folder.name &&
                      selectedFolder.parentPath === folder.parentPath &&
                      'border-l-stroke-accent-primary bg-bg-accent-primary-alpha'
                  )}
                  key={folder.parentPath + folder.name}
                  onClick={() => setSelectedFolder(folder)}
                  onDoubleClick={() => handleNavigateToFolder(folder)}
                >
                  <Icon
                    className="w-[18px] text-text-secondary shrink-0 hover:text-text-accent-primary"
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
                        className="flex items-center text-text-secondary hover:text-text-accent-primary disabled:text-text-secondary"
                        disabled={!renameValue}
                        onClick={() => finishRenamingNewFolder(true, folder)}
                      >
                        <Icon
                          className="w-[18px] shrink-0 "
                          component={() => <CheckIcon />}
                        />
                      </button>
                      <button
                        className="flex items-center text-text-secondary hover:text-text-accent-primary disabled:text-text-secondary disabled:hover:text-text-secondary"
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

        <div className="flex items-center justify-between pt-5 border-t border-stroke-primary">
          <button disabled={!canCreateNewFolder} onClick={addNewFolder}>
            <Icon
              className={cx('w-[24px] text-text-secondary shrink-0', {
                'hover:text-text-accent-primary': canCreateNewFolder,
              })}
              component={() => <FolderPlusIcon />}
            />
          </button>
          <Button
            className={classNames(primaryButtonClasses, 'h-10 text-base')}
            disabled={!currentBucket}
            onClick={() =>
              onOk(
                currentBucket!,
                selectedFolder
                  ? [selectedFolder.parentPath, selectedFolder.name]
                      .filter(Boolean)
                      .join('/')
                  : currentPath
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
