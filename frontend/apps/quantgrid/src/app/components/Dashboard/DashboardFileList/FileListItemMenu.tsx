import { Dropdown, MenuProps } from 'antd';
import { DropdownProps } from 'antd/es/dropdown/dropdown';
import cx from 'classnames';
import {
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { toast } from 'react-toastify';

import Icon from '@ant-design/icons';
import {
  CopyIcon,
  disabledTooltips,
  DownloadIcon,
  EditIcon,
  getDropdownItem,
  MetadataNodeType,
  MoveToIcon,
  projectFolderAppdata,
  projectFolderXl,
  publicBucket,
  ShareIcon,
  TrashIcon,
  UnshareIcon,
} from '@frontend/common';

import { ApiContext, DashboardContext } from '../../../context';
import {
  useApiRequests,
  useDeleteResources,
  useMoveResources,
} from '../../../hooks';
import { useShareFilesModalStore } from '../../../store';
import { DashboardItem } from '../../../types/dashboard';
import { CloneFile, RenameFileModal, SelectFolder } from '../../Modals';
import {
  useDashboardDiscardAccessResource,
  useDashboardRevokeAccessResource,
} from '../hooks';

type Props = {
  item: DashboardItem;
  isFolder: boolean;
  trigger: DropdownProps['trigger'];
  className?: string;
};

export function FileListItemMenu({
  item,
  isFolder,
  trigger,
  children,
  className,
}: PropsWithChildren<Props>) {
  const { userBucket, isAdmin } = useContext(ApiContext);
  const { refetchData } = useContext(DashboardContext);
  const { downloadFiles } = useApiRequests();
  const { deleteResources } = useDeleteResources();
  const { moveResources } = useMoveResources();
  const { revokeResourceAccess } = useDashboardRevokeAccessResource();
  const { discardResourceAccess } = useDashboardDiscardAccessResource();
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [selectFolderModalOpen, setSelectFolderModalOpen] = useState(false);

  const isAbleToEdit =
    item.bucket === userBucket || (item.bucket === publicBucket && isAdmin);
  const isAbleToShare = item.permissions?.includes('SHARE');
  const isSharedWithMe =
    item.bucket !== userBucket && item.bucket !== publicBucket;
  const disabledDelete =
    item.nodeType === MetadataNodeType.FOLDER &&
    ((item.name === projectFolderAppdata && item.parentPath === null) ||
      (item.name === projectFolderXl &&
        item.parentPath === projectFolderAppdata));

  const handleMoveToFolder = useCallback(
    async (bucket: string, path: string | null | undefined) => {
      setSelectFolderModalOpen(false);

      await moveResources([item], path, bucket, () => refetchData());
    },
    [item, moveResources, refetchData],
  );

  const fileListItemMenuPath = useMemo(
    () => ['FileListItemMenu', item.name],
    [item.name],
  );

  const contextMenuItems: MenuProps['items'] = useMemo(
    () =>
      [
        !isFolder
          ? getDropdownItem({
              key: 'download',
              fullPath: [...fileListItemMenuPath, 'Download'],
              label: 'Download',
              icon: (
                <Icon
                  className="text-text-secondary w-[18px]"
                  component={() => <DownloadIcon />}
                />
              ),
              onClick: async () => {
                const toastId = toast.loading(
                  `Downloading file '${item.name}'...`,
                );
                const result = await downloadFiles({
                  files: [
                    {
                      bucket: item.bucket,
                      name: item.name,
                      parentPath: item.parentPath,
                    },
                  ],
                });
                toast.dismiss(toastId);
                if (!result.success) {
                  toast.error('Error happened during downloading file');
                }
              },
            })
          : undefined,
        !isFolder && isAbleToEdit
          ? getDropdownItem({
              key: 'rename',
              fullPath: [...fileListItemMenuPath, 'Rename'],
              label: 'Rename',
              icon: (
                <Icon
                  className="text-text-secondary w-[18px]"
                  component={() => <EditIcon />}
                />
              ),
              onClick: () => {
                setRenameModalOpen(true);
              },
            })
          : undefined,
        !isFolder
          ? getDropdownItem({
              key: 'clone',
              fullPath: [...fileListItemMenuPath, 'Clone'],
              label: 'Clone',
              icon: (
                <Icon
                  className="text-text-secondary w-[18px]"
                  component={() => <CopyIcon />}
                />
              ),
              onClick: async () => {
                setCloneModalOpen(true);
              },
            })
          : undefined,
        isAbleToEdit
          ? getDropdownItem({
              key: 'moveTo',
              fullPath: [...fileListItemMenuPath, 'MoveTo'],
              label: 'Move to',
              icon: (
                <Icon
                  className="text-text-secondary w-[18px]"
                  component={() => <MoveToIcon />}
                />
              ),
              onClick: () => {
                setSelectFolderModalOpen(true);
              },
            })
          : undefined,

        getDropdownItem({
          key: 'share',
          fullPath: [...fileListItemMenuPath, 'Share'],
          label: 'Share',
          icon: (
            <Icon
              className="text-text-secondary group-disabled:text-controls-text-disable w-[18px]"
              component={() => <ShareIcon />}
            />
          ),
          onClick: () => useShareFilesModalStore.getState().open([item]),
          disabled: !isAbleToShare,
          tooltip: !isAbleToShare
            ? disabledTooltips.notAllowedShare
            : undefined,
        }),
        item.isSharedByMe
          ? getDropdownItem({
              key: 'unshare',
              fullPath: [...fileListItemMenuPath, 'Unshare'],
              label: 'Unshare',
              icon: (
                <Icon
                  className="text-text-secondary w-[18px]"
                  component={() => <UnshareIcon />}
                />
              ),
              onClick: async () => {
                revokeResourceAccess(
                  {
                    name: item.name,
                    bucket: item.bucket,
                    parentPath: item.parentPath,
                    nodeType: item.nodeType,
                    resourceType: item.resourceType,
                  },
                  () => refetchData(),
                );
              },
            })
          : undefined,
        isSharedWithMe
          ? getDropdownItem({
              key: 'discard',
              fullPath: [...fileListItemMenuPath, 'DiscardAccess'],
              label: 'Discard access',
              icon: (
                <Icon
                  className="text-text-secondary w-[18px]"
                  component={() => <TrashIcon />}
                />
              ),
              onClick: async () => {
                discardResourceAccess(
                  {
                    name: item.name,
                    bucket: item.bucket,
                    parentPath: item.parentPath,
                    nodeType: item.nodeType,
                    resourceType: item.resourceType,
                  },
                  () => refetchData(),
                );
              },
            })
          : undefined,
        isAbleToEdit
          ? getDropdownItem({
              key: 'delete',
              fullPath: [...fileListItemMenuPath, 'Delete'],
              label: 'Delete',
              icon: (
                <Icon
                  className={cx(
                    'w-[18px]',
                    disabledDelete
                      ? 'text-controls-text-disable'
                      : 'text-text-secondary',
                  )}
                  component={() => <TrashIcon />}
                />
              ),
              disabled: disabledDelete,
              onClick: () => {
                deleteResources([item], () => refetchData());
              },
            })
          : undefined,
      ].filter(Boolean) as MenuProps['items'],
    [
      isFolder,
      fileListItemMenuPath,
      isAbleToEdit,
      isAbleToShare,
      item,
      isSharedWithMe,
      disabledDelete,
      downloadFiles,
      revokeResourceAccess,
      refetchData,
      discardResourceAccess,
      deleteResources,
    ],
  );

  return (
    <div className={className} onClick={(e) => e.stopPropagation()}>
      {contextMenuItems?.length ? (
        <Dropdown
          autoAdjustOverflow={true}
          menu={{ items: contextMenuItems }}
          trigger={trigger}
        >
          {children}
        </Dropdown>
      ) : (
        children
      )}
      {renameModalOpen && (
        <RenameFileModal
          item={item}
          onModalClose={() => {
            refetchData();

            setRenameModalOpen(false);
          }}
        />
      )}
      {cloneModalOpen && (
        <CloneFile
          item={item}
          onModalClose={() => {
            refetchData();

            setCloneModalOpen(false);
          }}
        />
      )}
      {selectFolderModalOpen && (
        <SelectFolder
          initialBucket={item.bucket}
          initialPath={item.parentPath}
          onCancel={() => setSelectFolderModalOpen(false)}
          onOk={handleMoveToFolder}
        />
      )}
    </div>
  );
}
