import { useCallback } from 'react';
import { AuthContextProps } from 'react-oidc-context';

import {
  ApiErrorType,
  ApiRequestFunctionWithError,
  filesEndpointType,
  Question,
  QuestionMetadata,
  questionsApiMessages,
} from '@frontend/common';

import {
  classifyFetchError,
  constructPath,
  displayToast,
  encodeApiUrl,
} from '../../utils';
import { getDeploymentRouteSegments } from '../../utils/deployments';
import { useBackendRequest } from './useBackendRequests';

export const useQuestionsRequests = (auth: AuthContextProps) => {
  const { sendDialRequest } = useBackendRequest(auth);

  const getQuestions = useCallback<
    ApiRequestFunctionWithError<
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
            constructPath([...getDeploymentRouteSegments(), 'questions']),
          ) + `/?${searchQueryParams.toString()}`, // Required due to issue with fast api
        );

        if (!res.ok) {
          displayToast('error', questionsApiMessages.getQuestionsServer);

          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message: questionsApiMessages.getQuestionsServer,
              statusCode: res.status,
            },
          };
        }

        const result = await res.json();

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        displayToast('error', questionsApiMessages.getQuestionsClient);

        return {
          success: false,
          error: classifyFetchError(
            error,
            questionsApiMessages.getQuestionsClient,
          ),
        };
      }
    },
    [sendDialRequest],
  );

  const getQuestion = useCallback<
    ApiRequestFunctionWithError<
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
            ]),
          ) + `?${searchQueryParams.toString()}`,
        );

        if (!res.ok) {
          displayToast('error', questionsApiMessages.getQuestionServer);

          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message: questionsApiMessages.getQuestionServer,
              statusCode: res.status,
            },
          };
        }

        const result = await res.json();

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        displayToast('error', questionsApiMessages.getQuestionClient);

        return {
          success: false,
          error: classifyFetchError(
            error,
            questionsApiMessages.getQuestionClient,
          ),
        };
      }
    },
    [sendDialRequest],
  );

  const deleteQuestion = useCallback<
    ApiRequestFunctionWithError<
      {
        projectName: string;
        projectPath: string | null | undefined;
        projectBucket: string;
        question_file: string;
      },
      void
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
            ]),
          ) + `?${searchQueryParams.toString()}`,
          {
            method: 'DELETE',
          },
        );

        if (!res.ok) {
          displayToast('error', questionsApiMessages.deleteQuestionServer);

          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message: questionsApiMessages.deleteQuestionServer,
              statusCode: res.status,
            },
          };
        }

        return {
          success: true,
          data: undefined,
        };
      } catch (error) {
        displayToast('error', questionsApiMessages.deleteQuestionClient);

        return {
          success: false,
          error: classifyFetchError(
            error,
            questionsApiMessages.deleteQuestionClient,
          ),
        };
      }
    },
    [sendDialRequest],
  );

  return {
    getQuestions,
    getQuestion,
    deleteQuestion,
  };
};
