import { Modal } from 'antd';
import { DataNode, EventDataNode } from 'antd/es/tree';
import cx from 'classnames';
import { MenuInfo } from 'rc-menu/lib/interface';
import { useCallback, useContext, useState } from 'react';

import {
  getDropdownItem,
  getDropdownMenuKey,
  MenuItem,
  modalFooterButtonClasses,
  primaryButtonClasses,
  secondaryButtonClasses,
} from '@frontend/common';

import { ChatOverlayContext } from '../../../context';
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

export const useConversationTreeContextMenu = (
  renameConversationCallback: React.MutableRefObject<
    ((data: ConversationsTreeChildData[string]) => void) | undefined
  >
) => {
  const { overlay, isReadOnlyProjectChats, createPlayback } =
    useContext(ChatOverlayContext);

  const [items, setItems] = useState<MenuItem[]>([]);

  const getConversationActions = useCallback(
    (childData: ConversationsTreeData): MenuItem[] => {
      return [
        getDropdownItem({
          key: getDropdownMenuKey<ConversationsTreeData>(
            contextMenuActionKeys.rename,
            childData
          ),
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
            childData
          ),
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
            childData
          ),
          label: 'Playback Conversation',
        }),
        getDropdownItem({
          key: getDropdownMenuKey<ConversationsTreeData>(
            contextMenuActionKeys.export,
            childData
          ),
          label: 'Export Conversation',
        }),
      ];
    },
    [isReadOnlyProjectChats]
  );

  const createContextMenuItems = useCallback(
    (
      info: {
        event: React.MouseEvent<Element, MouseEvent>;
        node: EventDataNode<DataNode>;
      },
      childData: ConversationsTreeChildData
    ) => {
      const key = info.node.key as string;
      let menuItems: MenuItem[] = [];

      if (key.toString().split('-').length === 3) {
        menuItems = menuItems.concat(getConversationActions(childData[key]));
      }

      setItems(menuItems);
    },
    [getConversationActions]
  );

  const onContextMenuClick = useCallback(
    async (info: MenuInfo) => {
      const { action, data } = parseContextMenuKey(info.key);

      switch (action) {
        case contextMenuActionKeys.rename:
          renameConversationCallback.current?.(data);
          break;
        case contextMenuActionKeys.delete:
          if (overlay && data.conversationId) {
            Modal.confirm({
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
              data.conversationId
            );

            const fileName = getExportConversationFileName();
            triggerDownloadContent(
              JSON.stringify(exportConversation),
              fileName
            );
          }
          break;
        default:
          break;
      }
    },
    [overlay, renameConversationCallback, createPlayback]
  );

  return { items, onContextMenuClick, createContextMenuItems };
};
