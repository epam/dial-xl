import { useCallback } from 'react';
import { AuthContextProps } from 'react-oidc-context';

import {
  filesEndpointType,
  Question,
  QuestionMetadata,
  questionsApiMessages,
} from '@frontend/common';

import { ApiRequestFunction } from '../../types';
import { constructPath, displayToast, encodeApiUrl } from '../../utils';
import { getDeploymentRouteSegments } from '../../utils/deployments';
import { useBackendRequest } from './useBackendRequests';

export const useQuestionsRequests = (auth: AuthContextProps) => {
  const { sendDialRequest } = useBackendRequest(auth);

  const getQuestions = useCallback<
    ApiRequestFunction<
      {
        projectName: string;
        projectPath: string | null | undefined;
        projectBucket: string;
        nextToken: string | null | undefined;
      },
      { items: QuestionMetadata[]; nextToken: string }
    >
  >(
    async ({ projectBucket, projectPath, projectName, nextToken }) => {
      try {
        const fullProjectPath = constructPath([
          filesEndpointType,
          projectBucket,
          projectPath,
          projectName,
        ]);
        const searchQueryParams = new URLSearchParams();
        searchQueryParams.set('project_path', fullProjectPath);
        if (nextToken) {
          searchQueryParams.set('next_token', nextToken);
        }

        const res = await sendDialRequest(
          encodeApiUrl(
            constructPath([...getDeploymentRouteSegments(), 'questions'])
          ) + `/?${searchQueryParams.toString()}` // Required due to issue with fast api
        );

        if (!res.ok) {
          displayToast('error', questionsApiMessages.getQuestionsServer);

          return;
        }

        const result = await res.json();

        return result;
      } catch {
        displayToast('error', questionsApiMessages.getQuestionsClient);

        return undefined;
      }
    },
    [sendDialRequest]
  );

  const getQuestion = useCallback<
    ApiRequestFunction<
      {
        projectName: string;
        projectPath: string | null | undefined;
        projectBucket: string;
        question_file: string;
      },
      Question
    >
  >(
    async ({ projectBucket, projectPath, projectName, question_file }) => {
      try {
        const fullProjectPath = constructPath([
          filesEndpointType,
          projectBucket,
          projectPath,
          projectName,
        ]);
        const searchQueryParams = new URLSearchParams();
        searchQueryParams.set('project_path', fullProjectPath);
        const res = await sendDialRequest(
          encodeApiUrl(
            constructPath([
              ...getDeploymentRouteSegments(),
              'questions',
              question_file,
            ])
          ) + `?${searchQueryParams.toString()}`
        );

        if (!res.ok) {
          displayToast('error', questionsApiMessages.getQuestionServer);

          return;
        }

        const result = await res.json();

        return result;
      } catch {
        displayToast('error', questionsApiMessages.getQuestionClient);

        return undefined;
      }
    },
    [sendDialRequest]
  );

  const deleteQuestion = useCallback<
    ApiRequestFunction<
      {
        projectName: string;
        projectPath: string | null | undefined;
        projectBucket: string;
        question_file: string;
      },
      unknown
    >
  >(
    async ({ projectBucket, projectPath, projectName, question_file }) => {
      try {
        const fullProjectPath = constructPath([
          filesEndpointType,
          projectBucket,
          projectPath,
          projectName,
        ]);
        const searchQueryParams = new URLSearchParams();
        searchQueryParams.set('project_path', fullProjectPath);
        const res = await sendDialRequest(
          encodeApiUrl(
            constructPath([
              ...getDeploymentRouteSegments(),
              'questions',
              question_file,
            ])
          ) + `?${searchQueryParams.toString()}`,
          {
            method: 'DELETE',
          }
        );

        if (!res.ok) {
          displayToast('error', questionsApiMessages.deleteQuestionServer);

          return;
        }

        return {};
      } catch {
        displayToast('error', questionsApiMessages.deleteQuestionClient);

        return undefined;
      }
    },
    [sendDialRequest]
  );

  return {
    getQuestions,
    getQuestion,
    deleteQuestion,
  };
};
