import { useCallback } from 'react';
import { AuthContextProps } from 'react-oidc-context';
import { toast } from 'react-toastify';

import {
  ApiErrorType,
  apiMessages,
  ApiRequestFunctionWithError,
  CompileRequest,
  ControlValuesRequest,
  ControlValuesResponse,
  DimensionalSchemaRequest,
  DimensionalSchemaResponse,
  DownloadRequest,
  ExcelCatalogGetRequest,
  ExcelCatalogGetResponse,
  ExcelPreviewRequest,
  ExcelPreviewResponse,
  FieldKey,
  FunctionInfo,
  FunctionsRequest,
  FunctionsResponse,
  GetDimensionalSchemaParams,
  GetExcelCatalogParams,
  PreviewExcelDataParams,
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
    ApiRequestFunctionWithError<
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

          return {
            success: false,
            error: {
              type: ApiErrorType.Unauthorized,
              message: apiMessages.compileForbidden,
              statusCode: res.status,
            },
          };
        }

        if (!res.ok) {
          displayToast('error', apiMessages.generalError);

          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message: apiMessages.generalError,
              statusCode: res.status,
            },
          };
        }

        return {
          success: true,
          data: res,
        };
      } catch (error) {
        displayToast('error', apiMessages.compileClient);

        return {
          success: false,
          error: classifyFetchError(error, apiMessages.compileClient),
        };
      }
    },
    [sendAuthorizedRequest],
  );

  const sendProjectCalculate = useCallback<
    ApiRequestFunctionWithError<
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

          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message: apiMessages.projectCalculateServer,
              statusCode: res.status,
            },
          };
        }

        return {
          success: true,
          data: res,
        };
      } catch (error) {
        displayToast('error', apiMessages.projectCalculateClient);

        return {
          success: false,
          error: classifyFetchError(error, apiMessages.projectCalculateClient),
        };
      }
    },
    [sendAuthorizedRequest],
  );

  const sendProjectCancel = useCallback<
    ApiRequestFunctionWithError<
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
          displayToast('error', apiMessages.projectCancelServer);

          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message: apiMessages.projectCancelServer,
              statusCode: res.status,
            },
          };
        }

        return {
          success: true,
          data: res,
        };
      } catch (error) {
        displayToast('error', apiMessages.projectCancelClient);

        return {
          success: false,
          error: classifyFetchError(error, apiMessages.projectCancelClient),
        };
      }
    },
    [sendAuthorizedRequest],
  );

  const downloadTableBlob = useCallback<
    ApiRequestFunctionWithError<
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

          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message: apiMessages.downloadTableServer,
              statusCode: res.status,
            },
          };
        }

        return {
          success: true,
          data: await res.blob(),
        };
      } catch (error) {
        displayToast('error', apiMessages.downloadTableClient);

        return {
          success: false,
          error: classifyFetchError(error, apiMessages.downloadTableClient),
        };
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
    ApiRequestFunctionWithError<
      GetDimensionalSchemaParams,
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

          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message: apiMessages.getDimSchemaServer(formula),
              statusCode: res.status,
            },
          };
        }

        return {
          success: true,
          data: await res.json(),
        };
      } catch (error) {
        if (!suppressErrors) {
          displayToast('error', apiMessages.getDimSchemaClient(formula));
        }

        return {
          success: false,
          error: classifyFetchError(
            error,
            apiMessages.getDimSchemaClient(formula),
          ),
        };
      }
    },
    [sendAuthorizedRequest],
  );

  const calculateControlValues = useCallback<
    ApiRequestFunctionWithError<
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

          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message: apiMessages.getControlValuesServer,
              statusCode: res.status,
            },
          };
        }

        const data: ControlValuesResponse = await res.json();

        return {
          success: true,
          data,
        };
      } catch (error) {
        displayToast('error', apiMessages.getControlValuesClient);

        return {
          success: false,
          error: classifyFetchError(error, apiMessages.getControlValuesClient),
        };
      }
    },
    [sendAuthorizedRequest],
  );

  const downloadUserBucket = useCallback<
    ApiRequestFunctionWithError<{}, void>
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

        return {
          success: false,
          error: {
            type:
              res.status === 401
                ? ApiErrorType.Unauthorized
                : ApiErrorType.ServerError,
            message: apiMessages.downloadFileServer,
            statusCode: res.status,
          },
        };
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

        return {
          success: true,
          data: undefined,
        };
      }

      const fileBlob = await res.blob();
      if (!fileBlob) {
        displayToast('error', apiMessages.downloadFileServer);

        return {
          success: false,
          error: {
            type: ApiErrorType.ServerError,
            message: apiMessages.downloadFileServer,
            statusCode: res.status,
          },
        };
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

      return {
        success: true,
        data: undefined,
      };
    } catch (error) {
      displayToast('error', apiMessages.downloadFileClient);

      return {
        success: false,
        error: classifyFetchError(error, apiMessages.downloadFileClient),
      };
    }
  }, [sendAuthorizedRequest]);

  const uploadUserBucket = useCallback<
    ApiRequestFunctionWithError<{ file: File }, FetchResponse>
  >(
    async ({ file }) => {
      try {
        if (!file) {
          return {
            success: false,
            error: {
              type: ApiErrorType.Unknown,
              message: apiMessages.uploadFileClient,
            },
          };
        }

        const isZip =
          file.type === 'application/zip' ||
          file.name.toLowerCase().endsWith('.zip');

        if (!isZip) {
          displayToast('error', 'Please select a .zip archive');

          return {
            success: false,
            error: {
              type: ApiErrorType.Unknown,
              message: 'Please select a .zip archive',
            },
          };
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

          return {
            success: false,
            error: {
              type: ApiErrorType.Unauthorized,
              message: apiMessages.uploadFileServer,
              statusCode: res.status,
            },
          };
        }

        if (!res.ok) {
          const msg = await res.text().catch(() => '');
          displayToast('error', msg || apiMessages.uploadFileServer);

          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message: msg || apiMessages.uploadFileServer,
              statusCode: res.status,
            },
          };
        }

        const okMsg = await res.text().catch(() => 'Bucket has been updated');
        displayToast('success', okMsg);

        return {
          success: true,
          data: res,
        };
      } catch (error) {
        displayToast('error', apiMessages.uploadFileClient);

        return {
          success: false,
          error: classifyFetchError(error, apiMessages.uploadFileClient),
        };
      }
    },
    [sendRequestWithProgress],
  );

  const getExcelCatalog = useCallback<
    ApiRequestFunctionWithError<
      GetExcelCatalogParams,
      ExcelCatalogGetResponse['excelCatalogGetResponse']
    >
  >(
    async ({ path, suppressErrors }) => {
      try {
        const body: ExcelCatalogGetRequest = {
          excelCatalogGetRequest: {
            path,
          },
        };

        const res = await sendAuthorizedRequest('/v1/get_excel_catalog', {
          method: 'POST',
          body: JSON.stringify(body),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          if (!suppressErrors) {
            displayToast('error', apiMessages.getExcelCatalogServer);
          }

          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message: apiMessages.getExcelCatalogServer,
              statusCode: res.status,
            },
          };
        }

        const response: ExcelCatalogGetResponse = await res.json();

        return {
          success: true,
          data: response.excelCatalogGetResponse,
        };
      } catch (error) {
        if (!suppressErrors) {
          displayToast('error', apiMessages.getExcelCatalogClient);
        }

        return {
          success: false,
          error: classifyFetchError(error, apiMessages.getExcelCatalogClient),
        };
      }
    },
    [sendAuthorizedRequest],
  );

  const previewExcelData = useCallback<
    ApiRequestFunctionWithError<
      PreviewExcelDataParams,
      ExcelPreviewResponse['excelPreviewResponse']
    >
  >(
    async ({ path, endRow, endCol, startRow, startCol, suppressErrors }) => {
      try {
        const body: ExcelPreviewRequest = {
          excelPreviewRequest: {
            path,
            start_row: startRow,
            end_row: endRow,
            start_column: startCol,
            end_column: endCol,
          },
        };

        const res = await sendAuthorizedRequest('/v1/preview_excel_data', {
          method: 'POST',
          body: JSON.stringify(body),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          if (!suppressErrors) {
            displayToast('error', apiMessages.previewExcelDataServer);
          }

          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message: apiMessages.previewExcelDataServer,
              statusCode: res.status,
            },
          };
        }

        const response: ExcelPreviewResponse = await res.json();

        return {
          success: true,
          data: response.excelPreviewResponse,
        };
      } catch (error) {
        if (!suppressErrors) {
          displayToast('error', apiMessages.previewExcelDataClient);
        }

        return {
          success: false,
          error: classifyFetchError(error, apiMessages.previewExcelDataClient),
        };
      }
    },
    [sendAuthorizedRequest],
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
    getExcelCatalog,
    previewExcelData,
  };
};
