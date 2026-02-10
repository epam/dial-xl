import { useCallback, useContext, useState } from 'react';

import { QuestionMetadata } from '@frontend/common';

import { ProjectContext } from '../../../context';
import { useApiRequests } from '../../../hooks';

// TODO: move this to provider when required more complex logic
export const useQuestionsListing = () => {
  const { projectBucket, projectPath, projectName } =
    useContext(ProjectContext);
  const [questions, setQuestions] = useState<QuestionMetadata[]>([]);
  const [isQuestionsLoading, setIsQuestionsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const { getQuestions: getQuestionsApi } = useApiRequests();

  const getQuestions = useCallback(
    async (
      { additional }: { additional?: boolean } = { additional: false },
    ) => {
      if (!projectBucket || !projectName) return;

      setIsQuestionsLoading(true);

      const result = await getQuestionsApi({
        projectBucket,
        projectPath,
        projectName,
        nextToken: additional ? token : undefined,
      });

      setQuestions(result?.items ?? []);
      setToken(result?.nextToken ?? null);

      setIsQuestionsLoading(false);
    },
    [getQuestionsApi, projectBucket, projectName, projectPath, token],
  );

  return {
    questions,
    getQuestions,
    token,
    isQuestionsLoading,
  };
};
