import { Dropdown, Spin, Tooltip, Tree } from 'antd';
import type { DataNode, EventDataNode } from 'antd/es/tree';
import { TreeProps } from 'antd/es/tree/Tree';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';

import Icon from '@ant-design/icons';
import {
  bindConversationsSharedRootFolder,
  ChatAvatarIcon,
  ChatIcon,
  conversationsTreeId,
  PlayAvatarIcon,
  PlayIcon,
} from '@frontend/common';

import { PanelName } from '../../../common';
import {
  ApiContext,
  AppContext,
  ChatOverlayContext,
  LayoutContext,
  ProjectContext,
} from '../../../context';
import { RenameConversation } from '../../Modals/RenameConversation';
import { PanelEmptyMessage } from '../PanelEmptyMessage';
import {
  ConversationsTreeChildData,
  useConversationTreeContextMenu,
} from './useConversationsTreeContextMenu';

type RenameItemCallback = (data: ConversationsTreeChildData[string]) => void;

export const Conversations = () => {
  const { toggleChat, isChatOpen, chatWindowPlacement } =
    useContext(AppContext);
  const { userBucket } = useContext(ApiContext);
  const {
    overlay,
    projectConversations,
    userLocalConversations,
    selectedConversation,
    isConversationsLoading,
    isAIPreview,
    isAIPendingChanges,
    renameConversation,
  } = useContext(ChatOverlayContext);
  const { openedPanels, togglePanel } = useContext(LayoutContext);
  const { projectName, projectBucket, projectPath } =
    useContext(ProjectContext);

  const onRenameConversationRef = useRef<RenameItemCallback>();

  const { items, onContextMenuClick, createContextMenuItems } =
    useConversationTreeContextMenu(onRenameConversationRef);

  const [conversationTreeData, setConversationTreeData] = useState<DataNode[]>(
    []
  );
  const [selectedKeys, setSelectedKeys] = useState<TreeProps['selectedKeys']>(
    []
  );
  const [childData, setChildData] = useState<ConversationsTreeChildData>({});
  const [renamingConversationData, setRenamingConversationData] = useState<
    ConversationsTreeChildData[string] | undefined
  >(undefined);

  const onShowRenameModal = useCallback(
    (data: ConversationsTreeChildData[string]) => {
      setRenamingConversationData(data);
    },
    []
  );

  useEffect(() => {
    onRenameConversationRef.current = onShowRenameModal;
  });

  const onRenameConversation = useCallback(
    async (newName: string) => {
      setRenamingConversationData(undefined);

      if (!overlay || !renamingConversationData?.conversationId) return;

      await renameConversation(
        renamingConversationData.conversationId,
        newName
      );
    },
    [overlay, renamingConversationData, renameConversation]
  );

  const openChat = useCallback(
    (node: EventDataNode<DataNode>) => {
      if (!overlay) return;

      const data = childData[node.key as string];

      if (!data?.conversationId) return;

      overlay.selectConversation(data.conversationId);

      if (chatWindowPlacement === 'floating' && !isChatOpen) {
        toggleChat();

        return;
      }

      if (chatWindowPlacement === 'panel' && !openedPanels.chat.isActive) {
        togglePanel(PanelName.Chat);

        return;
      }
    },
    [
      chatWindowPlacement,
      childData,
      isChatOpen,
      openedPanels.chat.isActive,
      overlay,
      toggleChat,
      togglePanel,
    ]
  );

  useEffect(() => {
    let children: DataNode[] = [];
    const childData: ConversationsTreeChildData = {};
    const selectedKeys: TreeProps['selectedKeys'] = [];

    children = projectConversations
      .concat(userLocalConversations)
      .filter(({ isPlayback }) => !isPlayback)
      .map((conversation, index) => {
        const { name, id, isPlayback, parentPath } = conversation;
        const isUserLocalConversation = parentPath?.startsWith(
          bindConversationsSharedRootFolder
        );

        childData[`0-0-${index}`] = {
          conversationName: name,
          conversationId: id,
          isUserLocal: isUserLocalConversation,
        };

        const key = `0-0-${index}`;

        if (selectedConversation?.id === id) {
          selectedKeys.push(key);
        }

        return {
          key,
          title: isUserLocalConversation ? (
            <Tooltip placement="top" title={name}>
              <span
                className="truncate flex justify-between group items-center"
                id={key}
              >
                <span className="truncate italic pr-0.5">{name}</span>
              </span>
            </Tooltip>
          ) : (
            <span
              className="truncate flex justify-between group items-center"
              id={key}
              title={name}
            >
              <span className="truncate">{name}</span>
            </span>
          ),
          icon: isUserLocalConversation ? (
            <Tooltip placement="top" title="This chat is visible only for you">
              <Icon
                className="text-textSecondary w-[18px]"
                component={() =>
                  isPlayback ? (
                    <PlayAvatarIcon secondaryAccentCssVar="text-accent-primary" />
                  ) : (
                    <ChatAvatarIcon secondaryAccentCssVar="text-accent-primary" />
                  )
                }
              />
            </Tooltip>
          ) : (
            <Icon
              className="text-textSecondary w-[18px]"
              component={() => (isPlayback ? <PlayIcon /> : <ChatIcon />)}
            />
          ),
        };
      });

    setConversationTreeData([...children]);
    setChildData(childData);
    setSelectedKeys(selectedKeys);
  }, [
    projectBucket,
    projectConversations,
    selectedConversation,
    projectName,
    projectPath,
    userLocalConversations,
    userBucket,
  ]);

  if (conversationTreeData.length === 0 && !isConversationsLoading) {
    return <PanelEmptyMessage icon={<ChatIcon />} message="No Conversations" />;
  }

  return (
    <div
      className="overflow-auto thin-scrollbar w-full h-full bg-bgLayer3"
      id={conversationsTreeId}
    >
      {isConversationsLoading ? (
        <div className="flex grow items-center justify-center min-h-[50px]">
          <Spin className="z-50" size="large"></Spin>
        </div>
      ) : (
        <div className="min-w-[200px] pr-2 relative">
          <Dropdown
            menu={{
              items: isAIPreview || isAIPendingChanges ? [] : items,
              onClick: onContextMenuClick,
            }}
            trigger={['contextMenu']}
          >
            <div>
              <Tree.DirectoryTree
                className="bg-bgLayer3 text-textPrimary"
                expandAction={false}
                multiple={false}
                selectedKeys={selectedKeys}
                treeData={conversationTreeData}
                onRightClick={(info) => createContextMenuItems(info, childData)}
                onSelect={(_, info) => openChat(info.node)}
              />
            </div>
          </Dropdown>

          <RenameConversation
            isOpened={!!renamingConversationData}
            oldName={renamingConversationData?.conversationName ?? ''}
            onCancel={() => setRenamingConversationData(undefined)}
            onRename={onRenameConversation}
          ></RenameConversation>
        </div>
      )}
    </div>
  );
};
