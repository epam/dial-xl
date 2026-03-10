import { DataNode, EventDataNode } from 'antd/es/tree';
import cx from 'classnames';
import { useCallback, useContext, useState } from 'react';

import {
  getDropdownItem,
  getDropdownMenuKey,
  MenuItem,
  modalFooterButtonClasses,
  primaryButtonClasses,
  secondaryButtonClasses,
} from '@frontend/common';
import { MenuInfo } from '@rc-component/menu/lib/interface';

import { ChatOverlayContext } from '../../../context';
import { useAntdModalStore, useChangeNameModalStore } from '../../../store';
import {
  getExportConversationFileName,
  triggerDownloadContent,
} from '../../../utils';

const contextMenuActionKeys = {
  rename: 'rename',
  delete: 'delete',
  playback: 'playback',
  export: 'export',
};

export type ConversationsTreeData = {
  conversationName?: string;
  conversationId?: string;
  isUserLocal?: boolean;
};

export type ConversationsTreeChildData = {
  [keyIndex: string]: ConversationsTreeData;
};

function parseContextMenuKey(key: string): {
  action: string;
  data: ConversationsTreeData;
} {
  return JSON.parse(key);
}

export const useConversationTreeContextMenu = () => {
  const {
    overlay,
    isReadOnlyProjectChats,
    createPlayback,
    projectConversations,
    renameConversation,
  } = useContext(ChatOverlayContext);
  const confirmModal = useAntdModalStore((s) => s.confirm);

  const [items, setItems] = useState<MenuItem[]>([]);

  const getConversationActions = useCallback(
    (childData: ConversationsTreeData): MenuItem[] => {
      const conversationsTreePath = ['ConversationsTreeContextMenu'];

      return [
        getDropdownItem({
          key: getDropdownMenuKey<ConversationsTreeData>(
            contextMenuActionKeys.rename,
            childData,
          ),
          fullPath: [...conversationsTreePath, 'Rename'],
          label: 'Rename Conversation',
          disabled: !childData.isUserLocal && isReadOnlyProjectChats,
          tooltip:
            !childData.isUserLocal && isReadOnlyProjectChats
              ? 'Conversation is in READ-ONLY mode - you are not allowed to edit it'
              : undefined,
        }),
        getDropdownItem({
          key: getDropdownMenuKey<ConversationsTreeData>(
            contextMenuActionKeys.delete,
            childData,
          ),
          fullPath: [...conversationsTreePath, 'Delete'],
          label: 'Delete Conversation',
          disabled: !childData.isUserLocal && isReadOnlyProjectChats,
          tooltip:
            !childData.isUserLocal && isReadOnlyProjectChats
              ? 'Conversation is in READ-ONLY mode - you are not allowed to edit it'
              : undefined,
        }),
        getDropdownItem({
          key: getDropdownMenuKey<ConversationsTreeData>(
            contextMenuActionKeys.playback,
            childData,
          ),
          fullPath: [...conversationsTreePath, 'Playback'],
          label: 'Playback Conversation',
        }),
        getDropdownItem({
          key: getDropdownMenuKey<ConversationsTreeData>(
            contextMenuActionKeys.export,
            childData,
          ),
          fullPath: [...conversationsTreePath, 'Export'],
          label: 'Export Conversation',
        }),
      ];
    },
    [isReadOnlyProjectChats],
  );

  const createContextMenuItems = useCallback(
    (
      info: {
        event: React.MouseEvent<Element, MouseEvent>;
        node: EventDataNode<DataNode>;
      },
      childData: ConversationsTreeChildData,
    ) => {
      const key = info.node.key as string;
      let menuItems: MenuItem[] = [];

      if (key.toString().split('-').length === 3) {
        menuItems = menuItems.concat(getConversationActions(childData[key]));
      }

      setItems(menuItems);
    },
    [getConversationActions],
  );

  const onRenameConversation = useCallback(
    async (data: ConversationsTreeData) => {
      if (!overlay || !data?.conversationId) return;

      const open = useChangeNameModalStore.getState().open;

      const result = await open({
        kind: 'renameConversation',
        initialName: data.conversationName || '',
        validate: (name) => {
          if (!name) return 'Conversation name is required';
          if (projectConversations?.some((s) => s.name === name))
            return 'A conversation with this name already exists.';

          return;
        },
      });

      if (result) {
        await renameConversation(data.conversationId, result);
      }
    },
    [overlay, projectConversations, renameConversation],
  );

  const onContextMenuClick = useCallback(
    async (info: MenuInfo) => {
      const { action, data } = parseContextMenuKey(info.key);

      switch (action) {
        case contextMenuActionKeys.rename:
          onRenameConversation(data);
          break;
        case contextMenuActionKeys.delete:
          if (overlay && data.conversationId) {
            confirmModal({
              icon: null,
              title: 'Confirm',
              content: `Confirm delete conversation "${data.conversationName}"?`,
              okButtonProps: {
                className: cx(modalFooterButtonClasses, primaryButtonClasses),
              },
              cancelButtonProps: {
                className: cx(modalFooterButtonClasses, secondaryButtonClasses),
              },
              onOk: async () => {
                await overlay.deleteConversation(data.conversationId!);
              },
            });
          }
          break;
        case contextMenuActionKeys.playback:
          if (overlay && data.conversationId) {
            createPlayback(data.conversationId);
          }
          break;
        case contextMenuActionKeys.export:
          if (overlay && data.conversationId) {
            const { exportConversation } = await overlay.exportConversation(
              data.conversationId,
            );

            const fileName = getExportConversationFileName();
            triggerDownloadContent(
              JSON.stringify(exportConversation),
              fileName,
            );
          }
          break;
        default:
          break;
      }
    },
    [overlay, createPlayback, onRenameConversation, confirmModal],
  );

  return { items, onContextMenuClick, createContextMenuItems };
};
