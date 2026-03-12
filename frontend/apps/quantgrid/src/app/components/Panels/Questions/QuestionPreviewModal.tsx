import { Modal, Spin } from 'antd';
import { useCallback, useContext, useEffect, useState } from 'react';

import { Question } from '@quantgrid/common';

import { ProjectContext } from '../../../context';
import { useApiRequests } from '../../../hooks';
import { useQuestionPreviewModalStore } from '../../../store';
import { QuestionPreview } from './QuestionPreview';

export function QuestionPreviewModal() {
  const { projectBucket, projectName, projectPath } =
    useContext(ProjectContext);
  const { getQuestion: getQuestionApi } = useApiRequests();
  const isOpen = useQuestionPreviewModalStore((s) => s.isOpen);
  const questionFile = useQuestionPreviewModalStore((s) => s.question_file);
  const cancel = useQuestionPreviewModalStore((s) => s.cancel);

  const [questionData, setQuestionData] = useState<Question | null>(null);

  const getData = useCallback(async () => {
    if (!questionFile || !projectBucket || !projectName) return;

    const question = await getQuestionApi({
      projectBucket,
      projectPath,
      projectName,
      question_file: questionFile,
    });

    if (!question.success) {
      cancel();

      return;
    }

    setQuestionData(question.data);
  }, [
    cancel,
    getQuestionApi,
    projectBucket,
    projectName,
    projectPath,
    questionFile,
  ]);

  useEffect(() => {
    setQuestionData(null);

    if (!questionFile || !isOpen) return;

    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionFile, isOpen]);

  return (
    <Modal
      destroyOnHidden={true}
      footer={null}
      open={isOpen}
      title={'Preview question'}
      width={{
        xs: '90%',
        sm: '80%',
        md: '70%',
        lg: '800px',
      }}
      onCancel={cancel}
    >
      <div className="min-h-[50dvh] flex overflow-x-hidden">
        {questionData ? (
          <QuestionPreview question={questionData} />
        ) : (
          <div className="grow size-full flex items-center justify-center">
            <Spin className="z-50" size="large"></Spin>
          </div>
        )}
      </div>
    </Modal>
  );
}
