import { Tooltip } from 'antd';
import { useCallback, useContext, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

import Icon from '@ant-design/icons';
import {
  CopyIcon,
  DownloadIcon,
  MetadataNodeType,
  MoveToIcon,
  SelectAllIcon,
  ShareIcon,
  TrashIcon,
  UnselectAllIcon,
} from '@frontend/common';

import { DashboardTab } from '../../../common';
import { ApiContext, DashboardContext, ProjectContext } from '../../../context';
import {
  useApiRequests,
  useCloneResources,
  useDeleteResources,
  useMoveResources,
} from '../../../hooks';
import { SelectFolder } from '../../Modals';

export function DashboardFileListSelectionToolbar() {
  const {
    selectedItems,
    setSelectedItems,
    displayedDashboardItems,
    folderPath,
    currentTab,
    refetchData,
  } = useContext(DashboardContext);
  const { isAdmin } = useContext(ApiContext);
  const { shareResources } = useContext(ProjectContext);
  const { deleteResources } = useDeleteResources();
  const { cloneResources } = useCloneResources();
  const { moveResources } = useMoveResources();
  const { downloadFiles } = useApiRequests();
  const [selectFolderModalOpen, setSelectFolderModalOpen] = useState(false);

  const isCloneDisplayed = useMemo(() => {
    const tabs: DashboardTab[] = ['home', 'examples'];

    if (!currentTab) return false;

    if (!tabs.includes(currentTab)) return false;

    if (currentTab === 'examples' && !isAdmin) return false;

    return true;
  }, [currentTab, isAdmin]);

  const isDownloadDisplayed = useMemo(() => {
    const tabs: DashboardTab[] = [
      'recent',
      'home',
      'sharedByMe',
      'sharedWithMe',
      'examples',
    ];

    if (!currentTab) return false;

    if (!tabs.includes(currentTab)) return false;

    return true;
  }, [currentTab]);

  const isMoveToDisplayed = useMemo(() => {
    const tabs: DashboardTab[] = ['home', 'examples'];

    if (!currentTab) return false;

    if (!tabs.includes(currentTab)) return false;

    if (currentTab === 'examples' && !isAdmin) return false;

    return true;
  }, [currentTab, isAdmin]);

  const isShareDisplayed = useMemo(() => {
    const tabs: DashboardTab[] = ['recent', 'home', 'sharedByMe'];

    if (!currentTab) return false;

    if (!tabs.includes(currentTab)) return false;

    return true;
  }, [currentTab]);

  const isDeleteDisplayed = useMemo(() => {
    const tabs: DashboardTab[] = ['recent', 'home', 'sharedByMe', 'examples'];

    if (!currentTab) return false;

    if (!tabs.includes(currentTab)) return false;

    if (currentTab === 'examples' && !isAdmin) return false;

    return true;
  }, [currentTab, isAdmin]);

  const onSelectAll = useCallback(() => {
    setSelectedItems(
      displayedDashboardItems.filter(
        (i) => i.nodeType !== MetadataNodeType.FOLDER
      )
    );
  }, [displayedDashboardItems, setSelectedItems]);

  const clearSelection = useCallback(() => {
    setSelectedItems([]);
  }, [setSelectedItems]);

  const onDelete = useCallback(() => {
    deleteResources(selectedItems, () => refetchData());
  }, [deleteResources, refetchData, selectedItems]);

  const onDownload = useCallback(async () => {
    toast.loading(`Downloading ${selectedItems.length} files...`);
    const result = await downloadFiles({
      files: selectedItems.map(({ bucket, name, parentPath: path }) => ({
        bucket,
        name,
        path,
      })),
    });

    toast.dismiss();
    if (!result) {
      toast.error('Error happened during downloading files');
    }
  }, [downloadFiles, selectedItems]);

  const onClone = useCallback(async () => {
    await cloneResources({
      items: selectedItems,
    });
    refetchData();
  }, [cloneResources, refetchData, selectedItems]);

  const onShare = useCallback(() => {
    shareResources(
      selectedItems.map(({ name, bucket, parentPath, nodeType }) => ({
        name,
        bucket,
        parentPath,
        nodeType,
      }))
    );
  }, [selectedItems, shareResources]);

  const onMoveTo = useCallback(() => {
    setSelectFolderModalOpen(true);
  }, []);

  const handleMoveToFolder = useCallback(
    async (path: string | null | undefined, bucket: string) => {
      setSelectFolderModalOpen(false);

      await moveResources(selectedItems, path, bucket, () => refetchData());
    },
    [moveResources, refetchData, selectedItems]
  );

  return (
    <div className="flex items-center w-full h-full">
      <SelectionToolbarButton
        IconComponent={SelectAllIcon}
        title="Select all"
        onClick={onSelectAll}
      />
      <SelectionToolbarButton
        IconComponent={UnselectAllIcon}
        title="Clear all"
        onClick={clearSelection}
      />

      <div className="h-[18px] bg-strokeSecondary w-[1px] mr-4" />

      {isCloneDisplayed && (
        <SelectionToolbarButton
          IconComponent={CopyIcon}
          title="Clone"
          onClick={onClone}
        />
      )}
      {isDownloadDisplayed && (
        <SelectionToolbarButton
          IconComponent={DownloadIcon}
          title="Download"
          onClick={onDownload}
        />
      )}
      {isMoveToDisplayed && (
        <SelectionToolbarButton
          IconComponent={MoveToIcon}
          title="Move to"
          onClick={onMoveTo}
        />
      )}
      {isShareDisplayed && (
        <SelectionToolbarButton
          IconComponent={ShareIcon}
          title="Share"
          onClick={onShare}
        />
      )}
      {isDeleteDisplayed && (
        <SelectionToolbarButton
          IconComponent={TrashIcon}
          title="Delete"
          onClick={onDelete}
        />
      )}
      {selectFolderModalOpen && (
        <SelectFolder
          initialBucket={selectedItems[0]?.bucket}
          initialPath={folderPath}
          onCancel={() => setSelectFolderModalOpen(false)}
          onOk={handleMoveToFolder}
        />
      )}
    </div>
  );
}

type SelectionToolbarButtonProps = {
  title: string;
  onClick: () => void;
  IconComponent: React.FC;
};

const SelectionToolbarButton = ({
  title,
  onClick,
  IconComponent,
}: SelectionToolbarButtonProps) => {
  return (
    <Tooltip placement="bottom" title={title}>
      <button className="flex items-center mr-4" onClick={onClick}>
        <Icon
          className="w-[18px] text-textSecondary hover:text-textAccentPrimary"
          component={IconComponent}
        />
      </button>
    </Tooltip>
  );
};
