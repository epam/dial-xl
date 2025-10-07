import { Tooltip } from 'antd';
import classNames from 'classnames';
import { useCallback, useContext, useMemo } from 'react';

import Icon from '@ant-design/icons';
import { LatestExportConversationsFormat } from '@epam/ai-dial-shared';
import {
  ExportIcon,
  iconClasses,
  ImportIcon,
  PlusIcon,
  projectPanelWrapperId,
  publicBucket,
} from '@frontend/common';

import { PanelName, PanelProps } from '../../../../common';
import {
  AIHintsContext,
  ApiContext,
  AppContext,
  ChatOverlayContext,
  InputsContext,
  LayoutContext,
  ProjectContext,
} from '../../../../context';
import { useProjectActions, useProjectMode } from '../../../../hooks';
import { displayToast, triggerUpload } from '../../../../utils';
import { AIHints } from '../../AIHints';
import { Conversations } from '../../Conversations';
import { Inputs } from '../../Inputs';
import { PanelToolbar } from '../../PanelToolbar';
import { ProjectTree } from '../../ProjectTree';
import { PanelWrapper } from '../PanelWrapper';
import { ProjectPanelSection } from './ProjectPanelSection';
import { CollapseSection } from './types';
import { useProjectPanelCollapse } from './useProjectPanelCollapse';

export function ProjectPanel({
  panelName,
  title,
  position,
  isActive,
}: PanelProps) {
  const { importAIHints, exportAIHints, newHintsModal } =
    useContext(AIHintsContext);
  const projectAction = useProjectActions();
  const { isProjectEditable } = useContext(ProjectContext);
  const { isAdmin } = useContext(ApiContext);
  const { inputsBucket, uploadFiles, importInput } = useContext(InputsContext);
  const { createConversation, overlay, isAIPreview, isAIPendingChanges } =
    useContext(ChatOverlayContext);
  const { chatWindowPlacement, isChatOpen, toggleChat } =
    useContext(AppContext);
  const { togglePanel, openedPanels } = useContext(LayoutContext);

  const [activeKeys, toggleSection] = useProjectPanelCollapse();
  const { isDefaultMode } = useProjectMode();

  const openChatPanel = useCallback(() => {
    if (!isChatOpen && chatWindowPlacement === 'floating') {
      toggleChat();
    }

    if (!openedPanels.chat.isActive && chatWindowPlacement === 'panel') {
      togglePanel(PanelName.Chat);
    }
  }, [
    chatWindowPlacement,
    isChatOpen,
    openedPanels.chat.isActive,
    toggleChat,
    togglePanel,
  ]);

  const handleCreateConversation = useCallback(() => {
    openChatPanel();
    createConversation();
  }, [createConversation, openChatPanel]);

  const handleImportConversation = useCallback(async () => {
    if (!overlay) return;

    openChatPanel();

    let result: LatestExportConversationsFormat;
    try {
      const fileContent = (await triggerUpload()) as string;
      result = JSON.parse(fileContent) as LatestExportConversationsFormat;
    } catch {
      displayToast('error', 'Invalid conversation file for import');

      return;
    }
    await overlay.importConversation(result);
  }, [openChatPanel, overlay]);

  const inputsAddDisabled = useMemo(() => {
    return !inputsBucket || (!isAdmin && inputsBucket === publicBucket);
  }, [inputsBucket, isAdmin]);

  return (
    <PanelWrapper isActive={isActive} panelName={panelName}>
      <PanelToolbar panelName={panelName} position={position} title={title} />
      <div
        className="w-full h-full overflow-auto thin-scrollbar bg-bg-layer-3 relative group/panel"
        id={projectPanelWrapperId}
      >
        <ProjectPanelSection
          activeKeys={activeKeys}
          content={<ProjectTree />}
          headerExtra={
            isDefaultMode ? (
              <Tooltip
                placement="bottom"
                title="Create worksheet"
                destroyOnHidden
              >
                <button className="size-[22px] flex items-center justify-center bg-bg-accent-primary-alpha text-text-accent-primary rounded-full">
                  <Icon
                    className="w-3"
                    component={() => <PlusIcon />}
                    onClick={projectAction.createWorksheetAction}
                  />
                </button>
              </Tooltip>
            ) : null
          }
          index={0}
          maxIndex={4}
          section={CollapseSection.ProjectTree}
          title="Sheets"
          onToggle={() => toggleSection(CollapseSection.ProjectTree)}
        />

        <ProjectPanelSection
          activeKeys={activeKeys}
          content={<Conversations />}
          headerExtra={
            !isAIPreview &&
            !isAIPendingChanges && (
              <div className="flex items-center gap-1">
                <Tooltip
                  className="opacity-0 transition-opacity duration-200 ease-in-out pointer-events-none group-hover/panel:opacity-100 group-hover/panel:pointer-events-auto"
                  placement="bottom"
                  title="Import Conversation"
                  destroyOnHidden
                >
                  <Icon
                    className={classNames(iconClasses, 'w-[18px]')}
                    component={() => <ImportIcon />}
                    onClick={handleImportConversation}
                  />
                </Tooltip>
                <Tooltip
                  placement="bottom"
                  title="Create new conversation"
                  destroyOnHidden
                >
                  <button
                    className="size-[22px] flex items-center justify-center bg-bg-accent-primary-alpha text-text-accent-primary rounded-full"
                    onClick={handleCreateConversation}
                  >
                    <Icon className="w-3" component={() => <PlusIcon />} />
                  </button>
                </Tooltip>
              </div>
            )
          }
          index={1}
          maxIndex={4}
          section={CollapseSection.Conversations}
          title="Conversations"
          onToggle={() => toggleSection(CollapseSection.Conversations)}
        />

        <ProjectPanelSection
          activeKeys={activeKeys}
          content={<AIHints />}
          headerExtra={
            <div className="flex items-center gap-1">
              {isDefaultMode && (
                <Tooltip
                  className="opacity-0 transition-opacity duration-200 ease-in-out pointer-events-none group-hover/panel:opacity-100 group-hover/panel:pointer-events-auto"
                  placement="bottom"
                  title="Import AI Hints"
                  destroyOnHidden
                >
                  <Icon
                    className={classNames(iconClasses, 'w-[18px]')}
                    component={() => <ImportIcon />}
                    onClick={importAIHints}
                  />
                </Tooltip>
              )}
              <Tooltip
                className="opacity-0 transition-opacity duration-200 ease-in-out pointer-events-none group-hover/panel:opacity-100 group-hover/panel:pointer-events-auto"
                placement="bottom"
                title="Export AI Hints"
                destroyOnHidden
              >
                <Icon
                  className={classNames(iconClasses, 'w-[18px]')}
                  component={() => <ExportIcon />}
                  onClick={exportAIHints}
                />
              </Tooltip>
              {isDefaultMode && (
                <Tooltip
                  placement="bottom"
                  title="Add new hint"
                  destroyOnHidden
                >
                  <button
                    className="size-[22px] flex items-center justify-center bg-bg-accent-primary-alpha text-text-accent-primary rounded-full group-disabled:text-controls-text-disable group-disabled:bg-controls-bg-disable"
                    onClick={() => isProjectEditable && newHintsModal()}
                  >
                    <Icon className="w-3" component={() => <PlusIcon />} />
                  </button>
                </Tooltip>
              )}
            </div>
          }
          index={2}
          maxIndex={4}
          section={CollapseSection.Hints}
          title="AI Hints"
          onToggle={() => toggleSection(CollapseSection.Hints)}
        />

        <ProjectPanelSection
          activeKeys={activeKeys}
          content={<Inputs />}
          headerExtra={
            isDefaultMode ? (
              <div className="flex items-center gap-1">
                <Tooltip
                  className="opacity-0 transition-opacity duration-200 ease-in-out pointer-events-none group-hover/panel:opacity-100 group-hover/panel:pointer-events-auto"
                  placement="bottom"
                  title="Import input"
                  destroyOnHidden
                >
                  <Icon
                    className={classNames(iconClasses, 'w-[18px]')}
                    component={() => <ImportIcon />}
                    onClick={() => !inputsAddDisabled && importInput()}
                  />
                </Tooltip>
                <Tooltip placement="bottom" title="Upload file" destroyOnHidden>
                  <button
                    className="size-[22px] flex items-center justify-center bg-bg-accent-primary-alpha text-text-accent-primary rounded-full"
                    onClick={() => !inputsAddDisabled && uploadFiles()}
                  >
                    <Icon className="w-3" component={() => <PlusIcon />} />
                  </button>
                </Tooltip>
              </div>
            ) : null
          }
          index={3}
          maxIndex={4}
          section={CollapseSection.Inputs}
          title="Inputs"
          onToggle={() => toggleSection(CollapseSection.Inputs)}
        />
      </div>
    </PanelWrapper>
  );
}
