import { Dropdown, Spin, Tooltip } from 'antd';
import classNames from 'classnames';
import { useCallback, useContext, useEffect } from 'react';
import { toast } from 'react-toastify';

import Icon from '@ant-design/icons';
import {
  DownloadIcon,
  getDropdownItem,
  MessageCheckIcon,
  MessageQuestionIcon,
  MessageXIcon,
  modalFooterButtonClasses,
  primaryButtonClasses,
  QuestionMetadata,
  QuestionStatus,
  secondaryButtonClasses,
  TrashIcon,
} from '@frontend/common';

import { ChatOverlayContext, ProjectContext } from '../../../context';
import { useApiRequests } from '../../../hooks';
import {
  useAntdModalStore,
  useQuestionPreviewModalStore,
} from '../../../store';
import { triggerDownloadContent } from '../../../utils';
import { PanelEmptyMessage } from '../PanelEmptyMessage';
import { QuestionPreviewModal } from './QuestionPreviewModal';
import { useQuestionsListing } from './useQuestionsListing';

const endElementId = 'questions-end';

export const Questions = () => {
  const { projectBucket, projectName, projectPath } =
    useContext(ProjectContext);
  const { isAIPendingChanges } = useContext(ChatOverlayContext);
  const { questions, isQuestionsLoading, getQuestions, token } =
    useQuestionsListing();
  const { deleteQuestion, getQuestion } = useApiRequests();
  const { open: openQuestion } = useQuestionPreviewModalStore();
  const confirmModal = useAntdModalStore((s) => s.confirm);

  const handleDeleteQuestion = useCallback(
    (questionFile: string) => {
      if (!questionFile || !projectBucket || !projectName) return;

      confirmModal({
        icon: null,
        title: 'Confirm',
        content: `Are you sure you want to delete this question?`,
        okButtonProps: {
          className: classNames(modalFooterButtonClasses, primaryButtonClasses),
        },
        cancelButtonProps: {
          className: classNames(
            modalFooterButtonClasses,
            secondaryButtonClasses,
          ),
        },
        onOk: async () => {
          await deleteQuestion({
            projectBucket,
            projectPath,
            projectName,
            question_file: questionFile,
          });
          getQuestions();
        },
      });
    },
    [
      confirmModal,
      deleteQuestion,
      getQuestions,
      projectBucket,
      projectName,
      projectPath,
    ],
  );

  const handleExportQuestion = useCallback(
    async (questionFile: string) => {
      if (!questionFile || !projectBucket || !projectName) return;

      const toastId = 'loading';
      toast.loading('Export question content...', { toastId });
      const question = await getQuestion({
        projectBucket,
        projectPath,
        projectName,
        question_file: questionFile,
      });

      toast.dismiss(toastId);
      triggerDownloadContent(
        JSON.stringify(question, null, 4),
        `Question_${question?.name}.json`,
      );
    },
    [getQuestion, projectBucket, projectName, projectPath],
  );

  const getQuestionActions = useCallback(
    (question: QuestionMetadata) => {
      const questionsMenuPath = ['Questions'];

      return [
        getDropdownItem({
          key: 'download',
          fullPath: [...questionsMenuPath, question.question_file, 'Download'],
          label: 'Download',
          icon: (
            <Icon
              className={classNames('w-[18px] text-text-secondary')}
              component={() => <DownloadIcon />}
            />
          ),
          onClick: async () => {
            handleExportQuestion(question.question_file);
          },
        }),
        getDropdownItem({
          key: 'delete',
          fullPath: [...questionsMenuPath, question.question_file, 'Delete'],
          label: 'Delete',
          icon: (
            <Icon
              className={classNames('w-[18px] text-text-error')}
              component={() => <TrashIcon />}
            />
          ),
          onClick: async () => {
            handleDeleteQuestion(question.question_file);
          },
        }),
      ];
    },
    [handleDeleteQuestion, handleExportQuestion],
  );

  const handleIntersect = useCallback(() => {
    if (!token || isQuestionsLoading) return;

    getQuestions({ additional: true });
  }, [getQuestions, isQuestionsLoading, token]);

  useEffect(() => {
    getQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAIPendingChanges]);

  useEffect(() => {
    function createObserver() {
      const options = {
        root: null,
        rootMargin: '0px',
        threshold: 0,
      };

      const observer = new IntersectionObserver((entries) => {
        if (entries[0].intersectionRatio <= 0) return;

        handleIntersect();
      }, options);
      const el = document.getElementById(endElementId);

      if (!el) return;

      observer.observe(el);
    }

    createObserver();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="flex flex-col w-full h-full bg-bg-layer-3 text-text-primary overflow-hidden">
        <div className="flex flex-col grow overflow-auto thin-scrollbar">
          {isQuestionsLoading ? (
            <div className="flex grow items-center justify-center">
              <Spin className="z-50" size="large"></Spin>
            </div>
          ) : questions.length === 0 ? (
            <PanelEmptyMessage
              icon={<MessageQuestionIcon />}
              message="No Questions"
            />
          ) : (
            <>
              {questions.map((question) => (
                <Dropdown
                  key={question.question_file}
                  menu={{ items: getQuestionActions(question) }}
                  trigger={['contextMenu']}
                >
                  <div
                    className="flex gap-1 overflow-hidden justify-between rounded-[3px] max-w-full truncate group items-center py-1 px-2 hover:bg-bg-accent-primary-alpha hover:cursor-pointer"
                    onClick={async () => {
                      await openQuestion({
                        question_file: question.question_file,
                      });
                    }}
                  >
                    <div className="flex gap-2 items-center max-w-full">
                      <span className="w-4 h-6 shrink-0 flex items-center">
                        <Tooltip
                          key={question.name}
                          placement="bottom"
                          title={question.status}
                          destroyOnHidden
                        >
                          <span
                            className={classNames('flex items-center h-full')}
                          >
                            {question.status === QuestionStatus.ACCEPTED ? (
                              <Icon
                                className={classNames(
                                  'w-[18px] text-text-accent-secondary',
                                )}
                                component={() => <MessageCheckIcon />}
                              />
                            ) : question.status === QuestionStatus.DISCARDED ? (
                              <Icon
                                className={classNames(
                                  'w-[18px] text-text-error',
                                )}
                                component={() => <MessageXIcon />}
                              />
                            ) : (
                              <Icon
                                className={classNames(
                                  'w-[18px] text-text-secondary',
                                )}
                                component={() => <MessageQuestionIcon />}
                              />
                            )}
                          </span>
                        </Tooltip>
                      </span>
                      <span
                        className={classNames(
                          'truncate text-[13px] shrink select-none',
                        )}
                      >
                        {question.name}
                      </span>
                    </div>
                  </div>
                </Dropdown>
              ))}
            </>
          )}

          <div className="h-0" id={endElementId}></div>
        </div>
      </div>
      <QuestionPreviewModal />
    </>
  );
};
