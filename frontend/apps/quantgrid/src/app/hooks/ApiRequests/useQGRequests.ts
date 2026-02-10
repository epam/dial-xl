import { useCallback } from 'react';
import { AuthContextProps } from 'react-oidc-context';
import { toast } from 'react-toastify';

import {
  ApiErrorType,
  apiMessages,
  ApiRequestFunction,
  ApiRequestFunctionWithError,
  CompileRequest,
  ControlValuesRequest,
  ControlValuesResponse,
  DimensionalSchemaRequest,
  DimensionalSchemaResponse,
  DownloadRequest,
  FieldKey,
  FunctionInfo,
  FunctionsRequest,
  FunctionsResponse,
  ProjectCalculateRequest,
  ProjectCancelRequest,
  Viewport,
  ViewportRequest,
} from '@frontend/common';

import { WithCustomProgressBar } from '../../components';
import { getApiUrl } from '../../services';
import { classifyFetchError, displayToast, triggerDownload } from '../../utils';
import { FetchResponse } from '../../utils/fetch';
import {
  isChromiumWithFSAccess,
  saveStreamToFile_CHROME_ONLY,
} from './saveStreamToFile';
import { useBackendRequest } from './useBackendRequests';

export const useQGRequests = (auth: AuthContextProps) => {
  const { sendAuthorizedRequest, sendRequestWithProgress } =
    useBackendRequest(auth);

  const getViewport = useCallback<
    ApiRequestFunctionWithError<
      {
        projectPath: string;
        viewports: Viewport[];
        worksheets: Record<string, string>;
        hasEditPermissions?: boolean;
        includeCompilation?: boolean;
        controller?: AbortController;
        suppressErrors?: boolean;
      },
      Response
    >
  >(
    async ({
      projectPath,
      viewports,
      worksheets,
      hasEditPermissions = false,
      includeCompilation = true,
      suppressErrors = true,
      controller,
    }) => {
      try {
        const body = JSON.stringify({
          calculateWorksheetsRequest: {
            project_name: projectPath,
            viewports,
            worksheets,
            includeCompilation,
            includeProfile: true,
            includeIndices: true,
            shared: hasEditPermissions,
          },
        } as ViewportRequest);

        const res = await sendAuthorizedRequest(`/v1/calculate`, {
          method: 'post',
          body,
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller?.signal,
        });

        const statusErrorMap: Record<
          number,
          { type: ApiErrorType; message: string }
        > = {
          503: {
            type: ApiErrorType.ComputationPower,
            message: apiMessages.computationPower,
          },
          401: {
            type: ApiErrorType.Unauthorized,
            message: apiMessages.computationForbidden,
          },
        };

        const statusError = statusErrorMap[res.status];

        if (statusError) {
          if (!suppressErrors) {
            displayToast('error', statusError.message);
          }

          return {
            success: false,
            error: {
              type: statusError.type,
              message: statusError.message,
              statusCode: res.status,
            },
          };
        }

        if (!res.ok) {
          if (!suppressErrors) {
            displayToast('error', apiMessages.computationServer);
          }

          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message: apiMessages.computationServer,
              statusCode: res.status,
            },
          };
        }

        return {
          success: true,
          data: res,
        };
      } catch (error) {
        const isAbortError =
          error instanceof DOMException && error.name === 'AbortError';

        if (!suppressErrors && !isAbortError) {
          displayToast('error', apiMessages.computationClient);
        }

        return {
          success: false,
          error: classifyFetchError(error, apiMessages.computationClient),
        };
      }
    },
    [sendAuthorizedRequest],
  );

  const getCompileInfo = useCallback<
    ApiRequestFunction<
      {
        projectPath: string;
        worksheets: Record<string, string>;
      },
      Response
    >
  >(
    async ({ projectPath, worksheets }) => {
      try {
        const body = JSON.stringify({
          compileWorksheetsRequest: {
            project: projectPath,
            worksheets,
          },
        } as CompileRequest);

        const res = await sendAuthorizedRequest(`/v1/compile`, {
          method: 'post',
          body,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (res.status === 401) {
          displayToast('error', apiMessages.compileForbidden);

          return;
        }

        return res;
      } catch {
        displayToast('error', apiMessages.compileClient);

        return undefined;
      }
    },
    [sendAuthorizedRequest],
  );

  const sendProjectCalculate = useCallback<
    ApiRequestFunction<
      {
        projectPath: string;
      },
      Response
    >
  >(
    async ({ projectPath }) => {
      try {
        const body = JSON.stringify({
          projectCalculateRequest: {
            project: projectPath,
          },
        } as ProjectCalculateRequest);

        const res = await sendAuthorizedRequest(`/v1/project/calculate`, {
          method: 'post',
          body,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          displayToast('error', apiMessages.projectCalculateServer);

          return;
        }

        return res;
      } catch {
        displayToast('error', apiMessages.projectCalculateClient);

        return undefined;
      }
    },
    [sendAuthorizedRequest],
  );

  const sendProjectCancel = useCallback<
    ApiRequestFunction<
      {
        projectPath: string;
      },
      Response
    >
  >(
    async ({ projectPath }) => {
      try {
        const body = JSON.stringify({
          projectCancelRequest: {
            project: projectPath,
          },
        } as ProjectCancelRequest);

        const res = await sendAuthorizedRequest(`/v1/project/cancel`, {
          method: 'post',
          body,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          displayToast('error', apiMessages.projectCalculateServer);

          return;
        }

        return res;
      } catch {
        displayToast('error', apiMessages.projectCancelClient);

        return undefined;
      }
    },
    [sendAuthorizedRequest],
  );

  const downloadTableBlob = useCallback<
    ApiRequestFunction<
      {
        projectPath: string;
        worksheets: Record<string, string>;
        table: string;
        columns: string[];
      },
      Blob
    >
  >(
    async ({ projectPath, table, columns, worksheets }) => {
      try {
        const body = JSON.stringify({
          downloadRequest: {
            project: projectPath,
            table,
            columns,
            sheets: worksheets,
          },
        } as DownloadRequest);

        const res = await sendAuthorizedRequest(`/v1/download`, {
          method: 'post',
          body,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          displayToast('error', apiMessages.downloadTableServer);

          return;
        }

        return res.blob();
      } catch {
        displayToast('error', apiMessages.downloadTableClient);

        return undefined;
      }
    },
    [sendAuthorizedRequest],
  );

  const getFunctions = useCallback<
    ApiRequestFunctionWithError<
      { worksheets: Record<string, string>; suppressErrors?: boolean },
      FunctionInfo[]
    >
  >(
    async ({ worksheets, suppressErrors }) => {
      try {
        const body: FunctionsRequest = {
          functionRequest: {
            worksheets,
          },
        };
        const res = await sendAuthorizedRequest('/v1/functions', {
          body: JSON.stringify(body),
          method: 'POST',
        });

        if (!res.ok) {
          if (!suppressErrors) {
            displayToast('error', apiMessages.getFunctionsServer);
          }

          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message: apiMessages.getFunctionsServer,
              statusCode: res.status,
            },
          };
        }

        const resp: FunctionsResponse = await res.json();

        return {
          success: true,
          data: resp.functionResponse.functions,
        };
      } catch (error) {
        if (!suppressErrors) {
          displayToast('error', apiMessages.getFunctionsClient);
        }

        return {
          success: false,
          error: classifyFetchError(error, apiMessages.getFunctionsClient),
        };
      }
    },
    [sendAuthorizedRequest],
  );

  const getDimensionalSchema = useCallback<
    ApiRequestFunction<
      {
        formula: string;
        worksheets: Record<string, string>;
        suppressErrors?: boolean;
        projectPath?: string;
      },
      DimensionalSchemaResponse
    >
  >(
    async ({ formula, worksheets, projectPath, suppressErrors }) => {
      try {
        const body: DimensionalSchemaRequest = {
          dimensionalSchemaRequest: {
            project_name: projectPath,
            worksheets,
            formula,
          },
        };
        const res = await sendAuthorizedRequest(`/v1/schema`, {
          body: JSON.stringify(body),
          method: 'POST',
        });

        if (!res.ok) {
          if (!suppressErrors) {
            displayToast('error', apiMessages.getDimSchemaServer(formula));
          }

          return undefined;
        }

        return await res.json();
      } catch {
        if (!suppressErrors) {
          displayToast('error', apiMessages.getDimSchemaClient(formula));
        }
      }
    },
    [sendAuthorizedRequest],
  );

  const calculateControlValues = useCallback<
    ApiRequestFunction<
      {
        project: string;
        sheets: Record<string, string>;
        key: FieldKey;
        query: string;
        start_row: number;
        end_row: number;
      },
      ControlValuesResponse
    >
  >(
    async ({ project, sheets, key, query, start_row, end_row }) => {
      try {
        const body: ControlValuesRequest = {
          controlValuesRequest: {
            project,
            sheets,
            key,
            query,
            start_row,
            end_row,
          },
        };

        const res = await sendAuthorizedRequest(
          '/v1/calculate_control_values',
          {
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
              'Content-Type': 'application/json',
            },
          },
        );

        if (!res.ok) {
          displayToast('error', apiMessages.getControlValuesServer);

          return undefined;
        }

        const data: ControlValuesResponse = await res.json();

        return data;
      } catch {
        displayToast('error', apiMessages.getControlValuesClient);

        return undefined;
      }
    },
    [sendAuthorizedRequest],
  );

  const downloadUserBucket = useCallback<
    ApiRequestFunction<{}, Blob>
  >(async () => {
    try {
      const res = await sendAuthorizedRequest(`/v1/bucket/download`, {
        method: 'get',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (res.status === 401 || !res.ok) {
        displayToast('error', apiMessages.downloadFileServer);

        return;
      }

      if (isChromiumWithFSAccess() && res.body) {
        const toastId = toast.loading(
          `Downloading. Please wait, it may take a while...`,
        );

        const result = await saveStreamToFile_CHROME_ONLY({
          res,
          suggestedName: 'user_bucket.zip',
          mimeType: 'application/zip',
        });

        toast.dismiss(toastId);

        if (result === 'saved') {
          displayToast('success', 'File saved successfully');
        }

        return;
      }

      const fileBlob = await res.blob();
      if (!fileBlob) {
        displayToast('error', apiMessages.downloadFileServer);

        return;
      }

      const fileUrl = window.URL.createObjectURL(fileBlob);

      triggerDownload({
        fileUrl,
        fileName: 'user_bucket.zip',
        successToast: {
          message: `Bucket files is ready for download`,
          onClose: () => URL.revokeObjectURL(fileUrl),
        },
      });
    } catch {
      displayToast('error', apiMessages.downloadFileClient);

      return undefined;
    }
  }, [sendAuthorizedRequest]);

  const uploadUserBucket = useCallback<
    ApiRequestFunction<{ file: File }, FetchResponse | undefined>
  >(
    async ({ file }) => {
      try {
        if (!file) return;

        const isZip =
          file.type === 'application/zip' ||
          file.name.toLowerCase().endsWith('.zip');

        if (!isZip) {
          displayToast('error', 'Please select a .zip archive');

          return;
        }

        const formData = new FormData();
        formData.append('file', file, file.name);

        const uploadingToast = toast(WithCustomProgressBar, {
          customProgressBar: true,
          data: {
            message: `Uploading bucket. Please, do not close or reload the app.`,
          },
        });

        const res = await sendRequestWithProgress(
          getApiUrl(),
          '/v1/bucket/upload',
          {
            method: 'POST',
            body: formData,
            headers: {
              Accept: 'text/plain',
            },
          },
          (progress) => {
            toast.update(uploadingToast, { progress: progress / 100 });
          },
        );

        toast.dismiss(uploadingToast);

        if (res.status === 401) {
          displayToast('error', apiMessages.uploadFileServer);

          return;
        }

        if (!res.ok) {
          const msg = await res.text().catch(() => '');
          displayToast('error', msg || apiMessages.uploadFileServer);

          return;
        }

        const okMsg = await res.text().catch(() => 'Bucket has been updated');
        displayToast('success', okMsg);

        return res;
      } catch {
        displayToast('error', apiMessages.uploadFileClient);

        return undefined;
      }
    },
    [sendRequestWithProgress],
  );

  return {
    getViewport,
    getCompileInfo,
    sendProjectCalculate,
    sendProjectCancel,
    downloadTableBlob,
    getFunctions,
    getDimensionalSchema,
    calculateControlValues,
    downloadUserBucket,
    uploadUserBucket,
  };
};
