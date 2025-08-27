import { Button, Tooltip } from 'antd';
import cx from 'classnames';
import {
  ComponentProps,
  FC,
  MouseEventHandler,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import Icon from '@ant-design/icons';
import {
  ClockExclamationIcon,
  EditOffIcon,
  EyeIcon,
  PlayIcon,
  primaryDisabledButtonClasses,
  SparklesIcon,
  useIsMobile,
} from '@frontend/common';

import { ChatOverlayContext, ProjectContext } from '../../../context';
import { useProjectMode } from '../../../hooks';
import { AIPendingChangesContextMenu } from './AIPendingChangesContextMenu';
import { ProjectFork } from './ProjectFork';
import { ProjectTitleTag, ProjectTitleTagProps } from './ProjectTitleTag';

const tagMapping: Record<string, ProjectTitleTagProps> = {
  csv: {
    title: 'TEMPORARY',
    tooltipText: 'This project is temporary and changes may not be saved.',
    icon: <ClockExclamationIcon />,
    containerClasses: 'border-strokePrimary',
    iconClasses: 'text-strokePrimary',
    textClasses: 'text-textInverted',
  },
  readOnly: {
    title: 'READ-ONLY',
    tooltipText: 'This project is read-only and cannot be edited.',
    icon: <EditOffIcon />,
    containerClasses: 'border-warningInverted',
    iconClasses: 'text-warningInverted',
    textClasses: 'text-warningInverted',
  },
  preview: {
    title: 'PREVIEW',
    tooltipText: 'AI preview mode is enabled. You can only view the project.',
    icon: <EyeIcon />,
    containerClasses: 'border-strokePrimary',
    iconClasses: 'text-textInverted',
    textClasses: 'text-textInverted',
  },
  playback: {
    title: 'PLAYBACK',
    tooltipText: 'Playback mode is enabled. You can only view the project.',
    icon: <PlayIcon />,
    containerClasses: 'border-strokePrimary',
    iconClasses: 'text-textInverted',
    textClasses: 'text-textInverted',
  },
};

export function ProjectTitle() {
  const {
    projectName,
    forkedProject,
    cloneCurrentProject,
    isProjectReadonlyByUser,
    setIsProjectReadonlyByUser,
  } = useContext(ProjectContext);
  const {
    acceptPendingChanges,
    discardPendingChanges,
    exitAIPreview,
    regenerateSummary,
    isMajorChangedAIAnswer,
    answerIsGenerating,
    selectedConversation,
  } = useContext(ChatOverlayContext);

  const isMobile = useIsMobile();
  const {
    isReadOnlyMode,
    isAIPendingMode,
    isCSVViewMode,
    isDefaultMode,
    isAIPreviewMode,
  } = useProjectMode();

  const showProjectName = useMemo(() => {
    return !isAIPendingMode && !isMobile;
  }, [isAIPendingMode, isMobile]);

  const handleClone = useCallback(
    () => cloneCurrentProject(),
    [cloneCurrentProject]
  );

  const tagKey = useMemo(() => {
    return (
      (isCSVViewMode && 'csv') ||
      (isReadOnlyMode && 'readOnly') ||
      (isAIPreviewMode && selectedConversation?.isPlayback && 'playback') ||
      (isAIPreviewMode && 'preview') ||
      null
    );
  }, [
    isCSVViewMode,
    isReadOnlyMode,
    isAIPreviewMode,
    selectedConversation?.isPlayback,
  ]);

  if (!projectName) return null;

  return (
    <div className="inline-flex items-center h-full overflow-hidden whitespace-nowrap mx-4 gap-4">
      {tagKey && !isMobile && <ProjectTitleTag {...tagMapping[tagKey]} />}

      {isAIPendingMode && !isMobile && (
        <div className="flex items-center gap-1">
          <Icon
            className="w-[18px] text-textInverted"
            component={() => <SparklesIcon />}
          />

          <span className="text-[13px] font-semibold text-textInverted">
            You have pending AI edits
          </span>
        </div>
      )}

      {showProjectName && (
        <div className="flex items-center gap-1">
          <Tooltip placement="bottom" title={`Project: ${projectName}`}>
            <span
              className={cx(
                'text-[13px] text-ellipsis inline-block overflow-hidden whitespace-nowrap',
                {
                  'text-textPrimary': isDefaultMode,
                  'text-textInverted':
                    isCSVViewMode || isAIPreviewMode || isReadOnlyMode,
                }
              )}
              id="projectNameTitle"
            >
              {projectName}
            </span>
          </Tooltip>
          {forkedProject && (
            <ProjectFork
              className={
                isDefaultMode ? 'text-textPrimary' : 'text-textInverted'
              }
            />
          )}
        </div>
      )}

      <div className="flex items-center gap-1">
        {(isCSVViewMode || isReadOnlyMode) && (
          <HeaderButton
            className={
              isReadOnlyMode
                ? '!bg-bgLayer3 !text-textPrimary'
                : '!bg-transparent !text-textInverted'
            }
            onClick={handleClone}
          >
            {isMobile ? 'Clone' : 'Clone to my projects'}
          </HeaderButton>
        )}
        {isReadOnlyMode && isProjectReadonlyByUser && (
          <HeaderButton
            className={'!bg-transparent !text-textInverted'}
            onClick={() => setIsProjectReadonlyByUser(false)}
          >
            {isMobile ? 'Edit' : 'Make editable'}
          </HeaderButton>
        )}

        {isAIPendingMode && (
          <>
            <HeaderButton
              className="!bg-transparent !text-textInverted"
              disabled={answerIsGenerating}
              onClick={discardPendingChanges}
            >
              Discard
            </HeaderButton>
            {!isMajorChangedAIAnswer ? (
              <HeaderButton
                className="!bg-bgLayer3 !text-textPrimary"
                disabled={answerIsGenerating}
                onClick={acceptPendingChanges}
              >
                Accept
              </HeaderButton>
            ) : (
              <HeaderButton
                className="!bg-bgLayer3 !text-textPrimary"
                disabled={answerIsGenerating}
                onClick={regenerateSummary}
              >
                Regenerate Summary
              </HeaderButton>
            )}
            <AIPendingChangesContextMenu />
          </>
        )}

        {isAIPreviewMode && (
          <>
            <HeaderButton
              className="!bg-transparent !text-textInverted"
              onClick={handleClone}
            >
              {isMobile ? 'Clone' : 'Clone to my projects'}
            </HeaderButton>
            <HeaderButton
              className="!bg-bgLayer3 !text-textPrimary"
              onClick={exitAIPreview}
            >
              {selectedConversation?.isPlayback ? 'Stop' : 'Exit'}
            </HeaderButton>
          </>
        )}
      </div>
    </div>
  );
}

const HeaderButton: FC<ComponentProps<typeof Button>> = ({
  className,
  onClick,
  ...rest
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleClickOnButton: MouseEventHandler<HTMLElement> = useCallback(
    async (e) => {
      setIsLoading(true);

      await onClick?.(e);

      setIsLoading(false);
    },
    [onClick]
  );

  return (
    <Button
      className={cx(
        primaryDisabledButtonClasses,
        'border-strokePrimary rounded-[3px] !text-[13px] px-2 py-0.5 h-6 !shadow-none hover:!border-bgLayer4 hover:!bg-bgLayer4 hover:!text-textPrimary focus:!outline-0 focus-visible:!outline-0 focus:!border focus:!border-strokeHoverFocus focus:!bg-bgLayer4',
        className
      )}
      loading={isLoading}
      onClick={handleClickOnButton}
      {...rest}
    />
  );
};
