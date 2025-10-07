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
    containerClasses: 'border-stroke-primary',
    iconClasses: 'text-stroke-primary',
    textClasses: 'text-text-inverted',
  },
  readOnly: {
    title: 'READ-ONLY',
    tooltipText: 'This project is read-only and cannot be edited.',
    icon: <EditOffIcon />,
    containerClasses: 'border-warning-inverted',
    iconClasses: 'text-warning-inverted',
    textClasses: 'text-warning-inverted',
  },
  preview: {
    title: 'PREVIEW',
    tooltipText: 'AI preview mode is enabled. You can only view the project.',
    icon: <EyeIcon />,
    containerClasses: 'border-stroke-primary',
    iconClasses: 'text-text-inverted',
    textClasses: 'text-text-inverted',
  },
  playback: {
    title: 'PLAYBACK',
    tooltipText: 'Playback mode is enabled. You can only view the project.',
    icon: <PlayIcon />,
    containerClasses: 'border-stroke-primary',
    iconClasses: 'text-text-inverted',
    textClasses: 'text-text-inverted',
  },
};

export function ProjectTitle() {
  const {
    projectName,
    forkedProject,
    cloneCurrentProject,
    isProjectReadonlyByUser,
    setIsProjectReadonlyByUser,
    projectAuthor,
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
    <div className="inline-flex items-center h-full overflow-hidden whitespace-nowrap mx-4 gap-4 col-span-4 justify-center">
      {tagKey && !isMobile && <ProjectTitleTag {...tagMapping[tagKey]} />}

      {isAIPendingMode && !isMobile && (
        <div className="flex items-center gap-1">
          <Icon
            className="w-[18px] text-text-inverted"
            component={() => <SparklesIcon />}
          />

          <span className="text-[13px] font-semibold text-text-inverted">
            You have pending AI edits
          </span>
        </div>
      )}

      {showProjectName && (
        <div className="flex items-center gap-1">
          <Tooltip
            placement="bottom"
            title={
              <div className="flex flex-col">
                <span>Project: {projectName}</span>
                <span>Author: {projectAuthor ?? '-'}</span>
              </div>
            }
            destroyOnHidden
          >
            <span
              className={cx(
                'text-[13px] text-ellipsis inline-block overflow-hidden whitespace-nowrap',
                {
                  'text-text-primary': isDefaultMode,
                  'text-text-inverted':
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
                isDefaultMode ? 'text-text-primary' : 'text-text-inverted'
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
                ? 'bg-bg-layer-3! text-text-primary!'
                : 'bg-transparent! text-text-inverted!'
            }
            onClick={handleClone}
          >
            {isMobile ? 'Clone' : 'Clone to my projects'}
          </HeaderButton>
        )}
        {isReadOnlyMode && isProjectReadonlyByUser && (
          <HeaderButton
            className={'bg-transparent! text-text-inverted!'}
            onClick={() => setIsProjectReadonlyByUser(false)}
          >
            {isMobile ? 'Edit' : 'Make editable'}
          </HeaderButton>
        )}

        {isAIPendingMode && (
          <>
            <HeaderButton
              className="bg-transparent! text-text-inverted!"
              disabled={answerIsGenerating}
              onClick={discardPendingChanges}
            >
              Discard
            </HeaderButton>
            {!isMajorChangedAIAnswer ? (
              <HeaderButton
                className="bg-bg-layer-3! text-text-primary!"
                disabled={answerIsGenerating}
                onClick={acceptPendingChanges}
              >
                Accept
              </HeaderButton>
            ) : (
              <HeaderButton
                className="bg-bg-layer-3! text-text-primary!"
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
              className="bg-transparent! text-text-inverted!"
              onClick={handleClone}
            >
              {isMobile ? 'Clone' : 'Clone to my projects'}
            </HeaderButton>
            <HeaderButton
              className="bg-bg-layer-3! text-text-primary!"
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
        'border-stroke-primary rounded-[3px] text-[13px]! px-2 py-0.5 h-6 shadow-none! hover:border-bg-layer-4! hover:bg-bg-layer-4! hover:text-text-primary! focus:outline-0! focus-visible:outline-0! focus:border! focus:border-stroke-hover-focus! focus:bg-bg-layer-4!',
        className
      )}
      loading={isLoading}
      onClick={handleClickOnButton}
      {...rest}
    />
  );
};
