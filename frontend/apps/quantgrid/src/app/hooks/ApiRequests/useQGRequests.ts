import { useCallback } from 'react';
import { AuthContextProps } from 'react-oidc-context';

import {
  apiMessages,
  CompileRequest,
  DimensionalSchemaRequest,
  DimensionalSchemaResponse,
  DownloadRequest,
  FunctionInfo,
  FunctionsRequest,
  FunctionsResponse,
  ProjectCalculateRequest,
  ProjectCancelRequest,
  Viewport,
  ViewportRequest,
} from '@frontend/common';

import { ApiRequestFunction } from '../../types';
import { displayToast } from '../../utils';
import { useBackendRequest } from './useBackendRequests';

export const useQGRequests = (auth: AuthContextProps) => {
  const { sendAuthorizedRequest } = useBackendRequest(auth);

  const getViewport = useCallback<
    ApiRequestFunction<
      {
        projectPath: string;
        viewports: Viewport[];
        worksheets: Record<string, string>;
        hasEditPermissions?: boolean;
        controller?: AbortController;
      },
      Response
    >
  >(
    async ({
      projectPath,
      viewports,
      worksheets,
      hasEditPermissions = false,
      controller,
    }) => {
      try {
        const body = JSON.stringify({
          calculateWorksheetsRequest: {
            project_name: projectPath,
            viewports,
            worksheets,
            includeCompilation: true,
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

        if (res.status === 503) {
          displayToast('error', apiMessages.computationPower);

          return;
        }

        if (res.status === 401) {
          displayToast('error', apiMessages.computationForbidden);

          return;
        }

        return res;
      } catch (error) {
        // Don't show error toast if request was aborted
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        displayToast('error', apiMessages.computationClient);

        return;
      }
    },
    [sendAuthorizedRequest]
  );

  const getCompileInfo = useCallback<
    ApiRequestFunction<
      {
        worksheets: Record<string, string>;
      },
      Response
    >
  >(
    async ({ worksheets }) => {
      try {
        const body = JSON.stringify({
          compileWorksheetsRequest: {
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
    [sendAuthorizedRequest]
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
    [sendAuthorizedRequest]
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
    [sendAuthorizedRequest]
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
    [sendAuthorizedRequest]
  );

  const getFunctions = useCallback<
    ApiRequestFunction<{ worksheets: Record<string, string> }, FunctionInfo[]>
  >(
    async ({ worksheets }) => {
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
          displayToast('error', apiMessages.getFunctionsServer);

          return undefined;
        }

        const resp: FunctionsResponse = await res.json();

        return resp.functionResponse.functions;
      } catch {
        displayToast('error', apiMessages.getFunctionsClient);

        return undefined;
      }
    },
    [sendAuthorizedRequest]
  );

  const getDimensionalSchema = useCallback<
    ApiRequestFunction<
      {
        formula: string;
        worksheets: Record<string, string>;
        suppressErrors?: boolean;
      },
      DimensionalSchemaResponse
    >
  >(
    async ({ formula, worksheets, suppressErrors }) => {
      try {
        const body: DimensionalSchemaRequest = {
          dimensionalSchemaRequest: {
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
    [sendAuthorizedRequest]
  );

  return {
    getViewport,
    getCompileInfo,
    sendProjectCalculate,
    sendProjectCancel,
    downloadTableBlob,
    getFunctions,
    getDimensionalSchema,
  };
};
