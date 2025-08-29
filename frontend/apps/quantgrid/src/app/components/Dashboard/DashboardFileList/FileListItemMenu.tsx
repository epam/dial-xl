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

import { ApiContext, DashboardContext, ProjectContext } from '../../../context';
import {
  useApiRequests,
  useCloneResources,
  useDeleteResources,
  useMoveResources,
} from '../../../hooks';
import { DashboardItem } from '../../../types/dashboard';
import { RenameFileModal, SelectFolder } from '../../Modals';
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
  const { shareResources } = useContext(ProjectContext);
  const { downloadFiles } = useApiRequests();
  const { deleteResources } = useDeleteResources();
  const { cloneResources } = useCloneResources();
  const { moveResources } = useMoveResources();
  const { revokeResourceAccess } = useDashboardRevokeAccessResource();
  const { discardResourceAccess } = useDashboardDiscardAccessResource();
  const [renameModalOpen, setRenameModalOpen] = useState(false);
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
    async (path: string | null | undefined, bucket: string) => {
      setSelectFolderModalOpen(false);

      await moveResources([item], path, bucket, () => refetchData());
    },
    [item, moveResources, refetchData]
  );

  const contextMenuItems: MenuProps['items'] = useMemo(
    () =>
      [
        !isFolder
          ? getDropdownItem({
              key: 'download',
              label: 'Download',
              icon: (
                <Icon
                  className="text-textSecondary w-[18px]"
                  component={() => <DownloadIcon />}
                />
              ),
              onClick: async () => {
                toast.loading(`Downloading file '${item.name}'...`);
                const result = await downloadFiles({
                  files: [
                    {
                      bucket: item.bucket,
                      name: item.name,
                      path: item.parentPath,
                    },
                  ],
                });
                toast.dismiss();
                if (!result) {
                  toast.error('Error happened during downloading file');
                }
              },
            })
          : undefined,
        !isFolder && isAbleToEdit
          ? getDropdownItem({
              key: 'rename',
              label: 'Rename',
              icon: (
                <Icon
                  className="text-textSecondary w-[18px]"
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
              label: 'Clone',
              icon: (
                <Icon
                  className="text-textSecondary w-[18px]"
                  component={() => <CopyIcon />}
                />
              ),
              onClick: async () => {
                await cloneResources({
                  items: [item],
                });
                refetchData();
              },
            })
          : undefined,
        isAbleToEdit
          ? getDropdownItem({
              key: 'moveTo',
              label: 'Move to',
              icon: (
                <Icon
                  className="text-textSecondary w-[18px]"
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
          label: 'Share',
          icon: (
            <Icon
              className="text-textSecondary group-disabled:text-controlsTextDisable w-[18px]"
              component={() => <ShareIcon />}
            />
          ),
          onClick: () => shareResources([item]),
          disabled: !isAbleToShare,
          tooltip: !isAbleToShare
            ? disabledTooltips.notAllowedShare
            : undefined,
        }),
        item.isSharedByMe
          ? getDropdownItem({
              key: 'unshare',
              label: 'Unshare',
              icon: (
                <Icon
                  className="text-textSecondary w-[18px]"
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
                  },
                  () => refetchData()
                );
              },
            })
          : undefined,
        isSharedWithMe
          ? getDropdownItem({
              key: 'discard',
              label: 'Discard access',
              icon: (
                <Icon
                  className="text-textSecondary w-[18px]"
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
                  },
                  () => refetchData()
                );
              },
            })
          : undefined,
        isAbleToEdit
          ? getDropdownItem({
              key: 'delete',
              label: 'Delete',
              icon: (
                <Icon
                  className={cx(
                    'w-[18px]',
                    disabledDelete
                      ? 'text-controlsTextDisable'
                      : 'text-textSecondary'
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
      isAbleToEdit,
      isAbleToShare,
      item,
      isSharedWithMe,
      downloadFiles,
      cloneResources,
      refetchData,
      shareResources,
      revokeResourceAccess,
      discardResourceAccess,
      deleteResources,
      disabledDelete,
    ]
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
