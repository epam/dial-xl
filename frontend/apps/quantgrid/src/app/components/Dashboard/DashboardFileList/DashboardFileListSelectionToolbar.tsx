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

import { ApiContext, DashboardContext, ProjectContext } from '../../../context';
import {
  useApiRequests,
  useCloneResources,
  useDeleteResources,
  useMoveResources,
} from '../../../hooks';
import { DashboardTab } from '../../../types/dashboard';
import { CloneFile, SelectFolder } from '../../Modals';

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
  const [cloneModalOpen, setCloneModalOpen] = useState(false);

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
      files: selectedItems,
    });

    toast.dismiss();
    if (!result) {
      toast.error('Error happened during downloading files');
    }
  }, [downloadFiles, selectedItems]);

  const onClone = useCallback(async () => {
    if (selectedItems.length === 1) {
      setCloneModalOpen(true);
    } else {
      await cloneResources({
        items: selectedItems,
      });
      refetchData();
    }
  }, [cloneResources, refetchData, selectedItems]);

  const onShare = useCallback(() => {
    shareResources(
      selectedItems.map(({ name, bucket, parentPath, nodeType }) => ({
        name,
        bucket,
        parentPath,
        nodeType,
        items: [],
      }))
    );
  }, [selectedItems, shareResources]);

  const onMoveTo = useCallback(() => {
    setSelectFolderModalOpen(true);
  }, []);

  const handleMoveToFolder = useCallback(
    async (bucket: string, path: string | null | undefined) => {
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

      <div className="h-[18px] bg-stroke-secondary w-px mr-4" />

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
      {cloneModalOpen && (
        <CloneFile
          item={selectedItems[0]}
          onModalClose={() => {
            refetchData();

            setCloneModalOpen(false);
          }}
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
    <Tooltip placement="bottom" title={title} destroyOnHidden>
      <button className="flex items-center mr-4" onClick={onClick}>
        <Icon
          className="w-[18px] text-text-secondary hover:text-text-accent-primary"
          component={IconComponent}
        />
      </button>
    </Tooltip>
  );
};
