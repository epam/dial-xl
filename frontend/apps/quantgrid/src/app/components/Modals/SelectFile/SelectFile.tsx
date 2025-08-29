import { Button, Input, Modal, Spin } from 'antd';
import classNames from 'classnames';
import Fuse from 'fuse.js';
import { useCallback, useContext, useEffect, useState } from 'react';

import Icon from '@ant-design/icons';
import {
  csvFileExtension,
  CSVFileIcon,
  dialProjectFileExtension,
  FileIcon,
  FilesMetadata,
  FolderIcon,
  getDropdownItem,
  HomeIcon,
  inputClasses,
  MetadataNodeType,
  modalFooterButtonClasses,
  primaryButtonClasses,
  primaryDisabledButtonClasses,
  publicBucket,
  QGLogo,
  secondaryButtonClasses,
} from '@frontend/common';

import { ApiContext } from '../../../context';
import { useApiRequests } from '../../../hooks';
import { Breadcrumb } from '../../../types/breadcrumbs';
import { Breadcrumbs } from '../../Breadcrumbs/Breadcrumbs';

type FolderOrFile = Pick<FilesMetadata, 'name' | 'parentPath' | 'nodeType'> & {
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
  fileExtensions: string[];
  modalTitle: string;
  okButtonText: string;
  onOk: (
    parentPath: string | null | undefined,
    bucket: string,
    name: string
  ) => void;
  onCancel: () => void;
};

export function SelectFile({
  initialPath,
  initialBucket,
  fileExtensions,
  modalTitle,
  okButtonText,
  onOk,
  onCancel,
}: Props) {
  const { userBucket } = useContext(ApiContext);
  const { getFiles, getSharedWithMeFiles } = useApiRequests();

  const [isOpen, setIsOpen] = useState(true);

  const [currentPath, setCurrentPath] = useState<string | null | undefined>(
    initialPath
  );
  const [currentBucket, setCurrentBucket] = useState<string | undefined>(
    initialBucket
  );
  const [storageItems, setStorageItems] = useState<FolderOrFile[]>([]);
  const [displayedItems, setDisplayedItems] = useState<FolderOrFile[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [selectedItem, setSelectedItem] = useState<FolderOrFile | undefined>();
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => {
      onCancel();
    }, 200);
  }, [onCancel]);

  const handleGetItems = useCallback(async () => {
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

    let items: FolderOrFile[] = [];
    items = items
      .concat(
        files.filter(
          (file) =>
            file.nodeType === MetadataNodeType.FOLDER ||
            fileExtensions.some((ext) => file.name.endsWith(ext))
        )
      )
      .sort((a, b) => {
        // sort folders first and the project files
        if (
          a.nodeType === MetadataNodeType.FOLDER &&
          b.nodeType !== MetadataNodeType.FOLDER
        )
          return -1;
        if (
          a.nodeType !== MetadataNodeType.FOLDER &&
          b.nodeType === MetadataNodeType.FOLDER
        )
          return 1;

        // sort by name
        return a.name.localeCompare(b.name);
      });

    setStorageItems(items);
  }, [
    currentBucket,
    getFiles,
    currentPath,
    getSharedWithMeFiles,
    fileExtensions,
  ]);

  const handleNavigateToFolder = useCallback((folder: FolderOrFile) => {
    if (folder.nodeType !== MetadataNodeType.FOLDER) return;

    setSearchValue('');
    setStorageItems([]);
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

    setSelectedItem(undefined);
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

  useEffect(() => {
    if (!userBucket) return;

    updateBreadcrumbs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath, currentBucket]);

  useEffect(() => {
    handleGetItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath, handleGetItems]);

  useEffect(() => {
    const itemsFuse = new Fuse(storageItems, fuseOptions);
    const finalItems = searchValue
      ? itemsFuse.search(searchValue).map((i) => i.item)
      : storageItems;

    setDisplayedItems(finalItems);
  }, [storageItems, searchValue, currentPath, currentBucket]);

  const getItemIcon = useCallback((item: FolderOrFile) => {
    if (!item.name) return <FileIcon />;

    const isProject = item.name.endsWith(dialProjectFileExtension);
    const isCSV = item.name.endsWith(csvFileExtension);
    const isFolder = item.nodeType === MetadataNodeType.FOLDER;

    if (isFolder) {
      return <FolderIcon />;
    }

    if (isCSV) {
      return (
        <Icon
          className="text-textAccentSecondary"
          component={() => <CSVFileIcon />}
        ></Icon>
      );
    }

    if (isProject) {
      return <QGLogo />;
    }

    return <FileIcon />;
  }, []);

  return (
    <Modal
      cancelButtonProps={{
        className: classNames(modalFooterButtonClasses, secondaryButtonClasses),
      }}
      destroyOnClose={true}
      footer={null}
      open={isOpen}
      title={modalTitle}
      onCancel={handleClose}
    >
      <div className="flex flex-col gap-3 min-h-[400px] max-h-[70dvh] justify-between overflow-hidden">
        <div className="flex flex-col gap-2 flex-grow overflow-hidden">
          <div>
            <Input
              className={classNames('h-[38px]', inputClasses)}
              placeholder="Search..."
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
              displayedItems.map((item) => (
                <div
                  className={classNames(
                    'flex items-center gap-2 py-1.5 px-3 h-[30px] hover:bg-bgAccentPrimaryAlpha rounded cursor-pointer border-l-2 border-transparent select-none',
                    selectedItem?.name === item.name &&
                      selectedItem.parentPath === item.parentPath &&
                      selectedItem.parentPath === item.parentPath &&
                      'border-l-strokeAccentPrimary bg-bgAccentPrimaryAlpha'
                  )}
                  key={item.parentPath + item.name}
                  onClick={() => setSelectedItem(item)}
                  onDoubleClick={() => handleNavigateToFolder(item)}
                >
                  <Icon
                    className="w-[18px] text-textSecondary shrink-0 hover:text-textAccentPrimary"
                    component={() => getItemIcon(item)}
                  />
                  {item.name}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-5 border-t border-strokePrimary">
          <Button
            className={classNames(
              primaryButtonClasses,
              primaryDisabledButtonClasses,
              'h-10 text-base'
            )}
            disabled={
              !currentBucket ||
              !fileExtensions.some((ext) => selectedItem?.name.endsWith(ext))
            }
            onClick={() =>
              selectedItem &&
              onOk(selectedItem.parentPath, currentBucket!, selectedItem.name)
            }
          >
            {okButtonText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
