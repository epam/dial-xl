import { Dropdown, Tooltip } from 'antd';
import classNames from 'classnames';
import { useCallback, useContext, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import Icon from '@ant-design/icons';
import { LatestExportConversationsFormat } from '@epam/ai-dial-shared';
import {
  CloudIcon,
  DeviceIcon,
  ExportIcon,
  getDropdownItem,
  iconClasses,
  ImportIcon,
  PlusIcon,
  projectPanelWrapperId,
  publicBucket,
  QGLogoMonochrome,
  RefreshIcon,
} from '@frontend/common';

import { PanelName, PanelProps } from '../../../../common';
import {
  AIHintsContext,
  ApiContext,
  ChatOverlayContext,
  InputsContext,
  LayoutContext,
  ProjectContext,
} from '../../../../context';
import { useProjectMode, useWorksheetActions } from '../../../../hooks';
import { useImportSourceModalStore, useUIStore } from '../../../../store';
import { displayToast, triggerUpload } from '../../../../utils';
import { AIHints } from '../../AIHints';
import { Conversations } from '../../Conversations';
import { Inputs } from '../../Inputs';
import { PanelToolbar } from '../../PanelToolbar';
import { ProjectTree } from '../../ProjectTree';
import { Questions } from '../../Questions';
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
  const worksheetAction = useWorksheetActions();
  const { isProjectEditable, hasEditPermissions } = useContext(ProjectContext);
  const { isAdmin } = useContext(ApiContext);
  const {
    inputsBucket,
    uploadFiles,
    importInput,
    getImportSources,
    importSources,
    syncAllImports,
  } = useContext(InputsContext);
  const { createConversation, overlay, isAIPreview, isAIPendingChanges } =
    useContext(ChatOverlayContext);
  const { open: openImport } = useImportSourceModalStore();

  const { toggleChat, isChatOpen, chatWindowPlacement } = useUIStore(
    useShallow((s) => ({
      toggleChat: s.toggleChat,
      isChatOpen: s.isChatOpen,
      chatWindowPlacement: s.chatWindowPlacement,
    }))
  );

  const { togglePanel, openedPanels } = useContext(LayoutContext);

  const [activeKeys, toggleSection] = useProjectPanelCollapse();
  const { isDefaultMode } = useProjectMode();
  const panelsAmount = useMemo(() => {
    return hasEditPermissions ? 5 : 4;
  }, [hasEditPermissions]);

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

  const handleSyncAllImports = useCallback(async () => {
    await syncAllImports();
  }, [syncAllImports]);

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

  const createInputDropdownItems = useMemo(() => {
    return [
      getDropdownItem({
        key: 'create_input',
        label: (
          <span className={classNames('flex items-center gap-1')}>
            <span className="truncate max-w-[270px]">Upload from device</span>
          </span>
        ),
        icon: (
          <Icon
            className={classNames(iconClasses, 'w-[18px]')}
            component={() => <DeviceIcon />}
          />
        ),
        onClick: () => {
          if (inputsAddDisabled) return;

          uploadFiles();
        },
      }),
      getDropdownItem({
        key: 'import_input',
        icon: (
          <Icon
            className={classNames(iconClasses, 'w-[18px]')}
            component={() => <QGLogoMonochrome />}
          />
        ),
        label: (
          <span className={classNames('flex items-center gap-1')}>
            <span className="truncate max-w-[270px]">
              Select from DIALXL file
            </span>
          </span>
        ),
        onClick: () => {
          if (inputsAddDisabled) return;

          importInput();
        },
      }),
      getDropdownItem({
        key: 'create_import',
        icon: (
          <Icon
            className={classNames(iconClasses, 'w-[18px]')}
            component={() => <CloudIcon />}
          />
        ),
        label: (
          <span className={classNames('flex items-center gap-1')}>
            <span className="truncate max-w-[270px]">
              Import from external data source
            </span>
          </span>
        ),
        onClick: async () => {
          if (inputsAddDisabled) return;

          await openImport({});

          getImportSources();
        },
      }),
    ];
  }, [
    getImportSources,
    inputsAddDisabled,
    openImport,
    uploadFiles,
    importInput,
  ]);

  return (
    <PanelWrapper isActive={isActive} panelName={panelName}>
      <PanelToolbar
        isActive={isActive}
        panelName={panelName}
        position={position}
        title={title}
      />
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
                    onClick={worksheetAction.createWorksheetAction}
                  />
                </button>
              </Tooltip>
            ) : null
          }
          index={0}
          maxIndex={panelsAmount}
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
          maxIndex={panelsAmount}
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
          maxIndex={panelsAmount}
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
                {Object.keys(importSources).length > 0 && (
                  <Tooltip
                    className="opacity-0 transition-opacity duration-200 ease-in-out pointer-events-none group-hover/panel:opacity-100 group-hover/panel:pointer-events-auto"
                    placement="bottom"
                    title="Sync all imports"
                    destroyOnHidden
                  >
                    <Icon
                      className={classNames(iconClasses, 'w-[18px]')}
                      component={() => <RefreshIcon />}
                      onClick={handleSyncAllImports}
                    />
                  </Tooltip>
                )}
                <Tooltip
                  placement="bottom"
                  title="Add new input or import"
                  destroyOnHidden
                >
                  <div className="h-full">
                    <Dropdown
                      menu={{ items: createInputDropdownItems }}
                      trigger={['click', 'contextMenu']}
                    >
                      <div className="size-[22px] flex items-center justify-center bg-bg-accent-primary-alpha text-text-accent-primary rounded-full">
                        <Icon className="w-3" component={() => <PlusIcon />} />
                      </div>
                    </Dropdown>
                  </div>
                </Tooltip>
              </div>
            ) : null
          }
          index={3}
          maxIndex={panelsAmount}
          section={CollapseSection.Inputs}
          title="Inputs"
          onToggle={() => toggleSection(CollapseSection.Inputs)}
        />

        {hasEditPermissions && (
          <ProjectPanelSection
            activeKeys={activeKeys}
            content={<Questions />}
            headerExtra={null}
            index={4}
            maxIndex={panelsAmount}
            section={CollapseSection.Questions}
            title="Questions"
            onToggle={() => toggleSection(CollapseSection.Questions)}
          />
        )}
      </div>
    </PanelWrapper>
  );
}
