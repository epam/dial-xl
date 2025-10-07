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
  FolderIcon,
  getDropdownItem,
  HomeIcon,
  inputClasses,
  MetadataNodeType,
  MetadataResourceType,
  modalFooterButtonClasses,
  primaryButtonClasses,
  primaryDisabledButtonClasses,
  publicBucket,
  QGLogo,
  ResourceMetadata,
  secondaryButtonClasses,
  SharedWithMeMetadata,
} from '@frontend/common';

import { ApiContext } from '../../../context';
import { useApiRequests } from '../../../hooks';
import { Breadcrumb } from '../../../types/breadcrumbs';
import { Breadcrumbs } from '../../Breadcrumbs/Breadcrumbs';

type FolderOrFile = Pick<
  ResourceMetadata,
  'name' | 'parentPath' | 'nodeType'
> & {
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
  const { getFiles, getSharedWithMeResources } = useApiRequests();

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

    let files: (ResourceMetadata | SharedWithMeMetadata)[];
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
    getSharedWithMeResources,
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

  useEffect(() => {
    if (!userBucket) return;

    updateBreadcrumbs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath, currentBucket]);

  useEffect(() => {
    handleGetItems();
    // below triggers, not dependencies
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
          className="text-text-accent-secondary"
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
      destroyOnHidden={true}
      footer={null}
      open={isOpen}
      title={modalTitle}
      onCancel={handleClose}
    >
      <div className="flex flex-col gap-3 min-h-[400px] max-h-[70dvh] justify-between overflow-hidden">
        <div className="flex flex-col gap-2 grow overflow-hidden">
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

          <div className="flex flex-col grow overflow-auto thin-scrollbar">
            {isLoading ? (
              <div className="size-full flex grow items-center justify-center">
                <Spin className="z-50" size="large"></Spin>
              </div>
            ) : (
              displayedItems.map((item) => (
                <div
                  className={classNames(
                    'flex items-center gap-2 py-1.5 px-3 h-[30px] hover:bg-bg-accent-primary-alpha rounded-sm cursor-pointer border-l-2 border-transparent select-none',
                    selectedItem?.name === item.name &&
                      selectedItem.parentPath === item.parentPath &&
                      selectedItem.parentPath === item.parentPath &&
                      'border-l-stroke-accent-primary bg-bg-accent-primary-alpha'
                  )}
                  key={item.parentPath + item.name}
                  onClick={() => setSelectedItem(item)}
                  onDoubleClick={() => handleNavigateToFolder(item)}
                >
                  <Icon
                    className="w-[18px] text-text-secondary shrink-0 hover:text-text-accent-primary"
                    component={() => getItemIcon(item)}
                  />
                  {item.name}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-5 border-t border-stroke-primary">
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
