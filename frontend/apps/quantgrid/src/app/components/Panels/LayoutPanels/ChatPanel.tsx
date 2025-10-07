import { Dropdown, Modal, Tooltip } from 'antd';
import classNames from 'classnames';
import { useCallback, useContext, useMemo, useState } from 'react';

import Icon from '@ant-design/icons';
import { LatestExportConversationsFormat } from '@epam/ai-dial-shared';
import {
  ChatAvatarIcon,
  ChevronDown,
  DotsIcon,
  getDropdownDivider,
  getDropdownItem,
  MenuItem,
  modalFooterButtonClasses,
  PlusIcon,
  primaryButtonClasses,
  secondaryButtonClasses,
} from '@frontend/common';

import { PanelProps } from '../../../common';
import {
  ChatOverlayContext,
  playbackLabel,
  ProjectContext,
} from '../../../context';
import {
  displayToast,
  getExportConversationFileName,
  triggerDownloadContent,
  triggerUpload,
} from '../../../utils';
import { ChatPanelView } from '../../ChatWrapper';
import { RenameConversation } from '../../Modals/RenameConversation';
import { PanelToolbar } from '../PanelToolbar';
import { PanelWrapper } from './PanelWrapper';

export function ChatPanel({ panelName, position, isActive }: PanelProps) {
  const {
    overlay,
    createConversation,
    selectedConversation,
    projectConversations,
    isReadOnlyProjectChats,
    userLocalConversations,
    createPlayback,
    isAIPreview,
    isAIPendingChanges,
    renameConversation,
  } = useContext(ChatOverlayContext);
  const { projectBucket } = useContext(ProjectContext);
  const [isRenameOpened, setIsRenameOpened] = useState(false);

  const handleRenameConversation = useCallback(
    async (newName: string) => {
      setIsRenameOpened(false);

      if (!overlay || !selectedConversation) return;

      await renameConversation(selectedConversation.id, newName);
    },
    [overlay, selectedConversation, renameConversation]
  );

  const getConversations = useCallback(() => {
    const projectConversationsItems = projectConversations
      .filter(({ isPlayback }) => !isPlayback)
      .map((item, i) => {
        const formattedName = item.name.replace(playbackLabel, '').trimStart();

        return getDropdownItem({
          key: `${item.id}_${i}`,
          label: (
            <Tooltip placement="top" title={formattedName} destroyOnHidden>
              <span
                className={classNames(
                  'flex items-center gap-1',
                  selectedConversation?.id === item.id &&
                    'text-text-accent-primary'
                )}
              >
                <span className="truncate max-w-[270px]">{formattedName}</span>
              </span>
            </Tooltip>
          ),
          onClick: () => {
            if (!overlay) return;

            overlay.selectConversation(item.id);
          },
        });
      });
    const userLocalConversationsItems = userLocalConversations
      .filter(({ isPlayback }) => !isPlayback)
      .map((item) =>
        getDropdownItem({
          key: item.id,
          label: (
            <span className="flex items-center gap-1">
              <Tooltip
                placement="top"
                title="This chat is visible only for you"
                destroyOnHidden
              >
                <Icon
                  className="text-text-secondary w-[18px] shrink-0"
                  component={() => (
                    <ChatAvatarIcon secondaryAccentCssVar="text-accent-primary" />
                  )}
                />
              </Tooltip>
              <Tooltip placement="top" title={item.name} destroyOnHidden>
                <span
                  className={classNames(
                    'truncate max-w-[270px]',
                    selectedConversation?.id === item.id &&
                      'text-text-accent-primary italic'
                  )}
                >
                  {item.name}
                </span>
              </Tooltip>
            </span>
          ),
          onClick: () => {
            if (!overlay) return;

            overlay.selectConversation(item.id);
          },
        })
      );

    return [
      ...projectConversationsItems,
      userLocalConversationsItems.length > 0 ? getDropdownDivider() : undefined,
      ...userLocalConversationsItems,
    ].filter(Boolean) as MenuItem[];
  }, [
    overlay,
    projectConversations,
    selectedConversation,
    userLocalConversations,
  ]);

  const getCurrentChatActions = useCallback((): MenuItem[] => {
    if (!selectedConversation || !overlay || isAIPreview || isAIPendingChanges)
      return [];

    const isSelectedConversationUserLocal =
      selectedConversation.bucket !== projectBucket;

    return [
      getDropdownItem({
        key: 'rename',
        label: 'Rename',
        onClick: () => setIsRenameOpened(true),
        disabled: !isSelectedConversationUserLocal && isReadOnlyProjectChats,
        tooltip:
          !isSelectedConversationUserLocal && isReadOnlyProjectChats
            ? 'Conversation is in READ-ONLY mode - you are not allowed to edit it'
            : undefined,
      }),
      getDropdownItem({
        key: 'delete',
        label: 'Delete',
        disabled: !isSelectedConversationUserLocal && isReadOnlyProjectChats,
        tooltip:
          !isSelectedConversationUserLocal && isReadOnlyProjectChats
            ? 'Conversation is in READ-ONLY mode - you are not allowed to edit it'
            : undefined,
        onClick: () => {
          Modal.confirm({
            icon: null,
            title: 'Confirm',
            content: `Confirm delete conversation "${selectedConversation.name}"?`,
            okButtonProps: {
              className: classNames(
                modalFooterButtonClasses,
                primaryButtonClasses
              ),
            },
            cancelButtonProps: {
              className: classNames(
                modalFooterButtonClasses,
                secondaryButtonClasses
              ),
            },
            onOk: async () => {
              await overlay.deleteConversation(selectedConversation.id);
            },
          });
        },
      }),
      getDropdownItem({
        key: 'import',
        label: 'Import',
        onClick: async () => {
          let result: LatestExportConversationsFormat;
          try {
            const fileContent = (await triggerUpload()) as string;
            result = JSON.parse(fileContent) as LatestExportConversationsFormat;
          } catch {
            displayToast('error', 'Invalid conversation file for import');

            return;
          }
          await overlay.importConversation(result);
        },
      }),
      getDropdownItem({
        key: 'export',
        label: 'Export',
        onClick: async () => {
          const { exportConversation } = await overlay.exportConversation(
            selectedConversation.id
          );

          const fileName = getExportConversationFileName();
          triggerDownloadContent(JSON.stringify(exportConversation), fileName);
        },
      }),
      ...(selectedConversation.isPlayback
        ? []
        : [
            getDropdownItem({
              key: 'create-playback',
              label: 'Create Playback',
              onClick: () => {
                createPlayback(selectedConversation.id);
              },
            }),
          ]),
      ...(selectedConversation.isPlayback
        ? [
            getDropdownItem({
              key: 'stop-playback',
              label: 'Stop Playback',
              onClick: async () => {
                await overlay.stopSelectedPlaybackConversation();
              },
            }),
          ]
        : []),
    ];
  }, [
    selectedConversation,
    overlay,
    isAIPreview,
    isAIPendingChanges,
    projectBucket,
    isReadOnlyProjectChats,
    createPlayback,
  ]);

  const selectedConversationName = useMemo(() => {
    return (
      selectedConversation?.name?.replace(playbackLabel, '').trimStart() || ''
    );
  }, [selectedConversation]);

  return (
    <PanelWrapper isActive={isActive} panelName={panelName}>
      <PanelToolbar
        panelName={panelName}
        position={position}
        title={
          projectConversations.length && !isAIPreview && !isAIPendingChanges ? (
            <Dropdown
              className="max-h-[60vh]"
              menu={{ items: getConversations() }}
              trigger={['hover']}
            >
              <span className="flex items-center overflow-hidden gap-1 cursor-pointer">
                <span className="truncate leading-none">
                  {selectedConversationName}
                </span>
                <Icon
                  className="w-4 text-text-secondary shrink-0"
                  component={() => <ChevronDown />}
                />
              </span>
            </Dropdown>
          ) : (
            selectedConversationName ?? 'Chat'
          )
        }
      >
        {!isAIPreview && !isAIPendingChanges && (
          <div className="flex items-center gap-2">
            <Dropdown
              menu={{ items: getCurrentChatActions() }}
              trigger={['click', 'contextMenu']}
            >
              <Icon
                className="w-4 text-text-secondary"
                component={() => <DotsIcon />}
              />
            </Dropdown>
            <Tooltip
              placement="bottom"
              title="Create new conversation"
              destroyOnHidden
            >
              <button
                className="size-5 flex items-center justify-center bg-bg-accent-primary-alpha text-text-accent-primary rounded-full"
                onClick={createConversation}
              >
                <Icon className="w-3" component={() => <PlusIcon />} />
              </button>
            </Tooltip>
          </div>
        )}
      </PanelToolbar>

      <ChatPanelView />

      <RenameConversation
        isOpened={isRenameOpened}
        oldName={selectedConversation?.name ?? ''}
        onCancel={() => setIsRenameOpened(false)}
        onRename={handleRenameConversation}
      ></RenameConversation>
    </PanelWrapper>
  );
}
