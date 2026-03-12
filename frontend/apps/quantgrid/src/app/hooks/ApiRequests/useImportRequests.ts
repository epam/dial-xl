import { useCallback } from 'react';
import { AuthContextProps } from 'react-oidc-context';

import {
  ApiErrorType,
  apiMessages,
  ApiRequestFunctionWithError,
  ImportCatalog,
  ImportCatalogListRequest,
  ImportConnection,
  ImportConnectionTestRequest,
  ImportDataset,
  ImportDatasetDiscoverRequest,
  ImportDefinition,
  ImportDefinitionGetRequest,
  ImportDefinitionListRequest,
  ImportDefinitions,
  ImportSchema,
  ImportSource,
  ImportSourceCreateRequest,
  ImportSourceDeleteRequest,
  ImportSourceGetRequest,
  ImportSourceListRequest,
  ImportSources,
  ImportSourceUpdateRequest,
  ImportSync,
  ImportSyncCancelRequest,
  ImportSyncGetRequest,
  ImportSyncListRequest,
  ImportSyncs,
  ImportSyncStartRequest,
  ProtoStruct,
} from '@frontend/common';

import { classifyFetchError, displayToast } from '../../utils';
import { useBackendRequest } from './useBackendRequests';

const headers = { 'Content-Type': 'application/json' };
const importApiRoutes = {
  definitionsList: '/v1/list_import_definitions',
  definitionsGet: '/v1/get_import_definition',

  sourcesList: '/v1/list_import_sources',
  sourcesGet: '/v1/get_import_source',
  sourcesCreate: '/v1/create_import_source',
  sourcesUpdate: '/v1/update_import_source',
  sourcesDelete: '/v1/delete_import_source',

  connectionTest: '/v1/test_import_connection',

  catalogList: '/v1/list_import_catalog',
  datasetDiscover: '/v1/discover_import_dataset',

  syncsList: '/v1/list_import_syncs',
  syncsGet: '/v1/get_import_sync',
  syncsStart: '/v1/start_import_sync',
  syncsCancel: '/v1/cancel_import_sync',
} as const;

export const useImportRequests = (auth: AuthContextProps) => {
  const { sendAuthorizedRequest } = useBackendRequest(auth);

  const listImportDefinitions = useCallback<
    ApiRequestFunctionWithError<{ project: string }, ImportDefinitions>
  >(
    async ({ project }) => {
      try {
        const request: ImportDefinitionListRequest = {
          importDefinitionListRequest: { project },
        };
        const body = JSON.stringify(request);

        const res = await sendAuthorizedRequest(
          importApiRoutes.definitionsList,
          {
            method: 'POST',
            body,
            headers,
          },
        );

        if (!res.ok) {
          displayToast('error', apiMessages.importDefinitionsListServer);

          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message: apiMessages.importDefinitionsListServer,
              statusCode: res.status,
            },
          };
        }

        const json = await res.json();
        const data: ImportDefinitions = json.importDefinitions ?? json;

        return {
          success: true,
          data,
        };
      } catch (error) {
        displayToast('error', apiMessages.importDefinitionsListClient);

        return {
          success: false,
          error: classifyFetchError(
            error,
            apiMessages.importDefinitionsListClient,
          ),
        };
      }
    },
    [sendAuthorizedRequest],
  );

  const getImportDefinition = useCallback<
    ApiRequestFunctionWithError<
      { project: string; definition: string },
      ImportDefinition
    >
  >(
    async ({ project, definition }) => {
      try {
        const request: ImportDefinitionGetRequest = {
          importDefinitionGetRequest: { project, definition },
        };
        const body = JSON.stringify(request);

        const res = await sendAuthorizedRequest(
          importApiRoutes.definitionsGet,
          {
            method: 'POST',
            body,
            headers,
          },
        );

        if (!res.ok) {
          displayToast('error', apiMessages.importDefinitionGetServer);

          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message: apiMessages.importDefinitionGetServer,
              statusCode: res.status,
            },
          };
        }

        const json = await res.json();
        const data: ImportDefinition = json.importDefinition ?? json;

        return {
          success: true,
          data,
        };
      } catch (error) {
        displayToast('error', apiMessages.importDefinitionGetClient);

        return {
          success: false,
          error: classifyFetchError(
            error,
            apiMessages.importDefinitionGetClient,
          ),
        };
      }
    },
    [sendAuthorizedRequest],
  );

  // ------- Sources -------
  const listImportSources = useCallback<
    ApiRequestFunctionWithError<{ project: string }, ImportSources>
  >(
    async ({ project }) => {
      try {
        const request: ImportSourceListRequest = {
          importSourceListRequest: { project },
        };
        const body = JSON.stringify(request);

        const res = await sendAuthorizedRequest(importApiRoutes.sourcesList, {
          method: 'POST',
          body,
          headers,
        });

        if (!res.ok) {
          displayToast('error', apiMessages.importSourceListServer);

          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message: apiMessages.importSourceListServer,
              statusCode: res.status,
            },
          };
        }

        const json = await res.json();
        const data: ImportSources = json.importSources ?? json;

        return {
          success: true,
          data,
        };
      } catch (error) {
        displayToast('error', apiMessages.importSourceListClient);

        return {
          success: false,
          error: classifyFetchError(error, apiMessages.importSourceListClient),
        };
      }
    },
    [sendAuthorizedRequest],
  );

  const getImportSource = useCallback<
    ApiRequestFunctionWithError<
      { project: string; source: string },
      ImportSource
    >
  >(
    async ({ project, source }) => {
      try {
        const request: ImportSourceGetRequest = {
          importSourceGetRequest: { project, source },
        };
        const body = JSON.stringify(request);

        const res = await sendAuthorizedRequest(importApiRoutes.sourcesGet, {
          method: 'POST',
          body,
          headers,
        });

        if (!res.ok) {
          displayToast('error', apiMessages.importSourceGetServer);

          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message: apiMessages.importSourceGetServer,
              statusCode: res.status,
            },
          };
        }

        const json = await res.json();
        const data: ImportSource = json.importSource ?? json;

        return {
          success: true,
          data,
        };
      } catch (error) {
        displayToast('error', apiMessages.importSourceGetClient);

        return {
          success: false,
          error: classifyFetchError(error, apiMessages.importSourceGetClient),
        };
      }
    },
    [sendAuthorizedRequest],
  );

  const createImportSource = useCallback<
    ApiRequestFunctionWithError<
      {
        project: string;
        definition: string;
        sourceName: string;
        configuration: ProtoStruct;
      },
      Response
    >
  >(
    async ({ project, definition, sourceName, configuration }) => {
      try {
        const request: ImportSourceCreateRequest = {
          importSourceCreateRequest: {
            project,
            definition,
            configuration,
            name: sourceName,
          },
        };
        const body = JSON.stringify(request);

        const res = await sendAuthorizedRequest(importApiRoutes.sourcesCreate, {
          method: 'POST',
          body,
          headers,
        });

        if (!res.ok) {
          displayToast('error', apiMessages.importSourceCreateServer);

          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message: apiMessages.importSourceCreateServer,
              statusCode: res.status,
            },
          };
        }

        return {
          success: true,
          data: res,
        };
      } catch (error) {
        displayToast('error', apiMessages.importSourceCreateClient);

        return {
          success: false,
          error: classifyFetchError(
            error,
            apiMessages.importSourceCreateClient,
          ),
        };
      }
    },
    [sendAuthorizedRequest],
  );

  const updateImportSource = useCallback<
    ApiRequestFunctionWithError<
      {
        project: string;
        source: string;
        sourceName: string;
        configuration: ProtoStruct;
      },
      Response
    >
  >(
    async ({ project, source, sourceName, configuration }) => {
      try {
        const request: ImportSourceUpdateRequest = {
          importSourceUpdateRequest: {
            project,
            source,
            name: sourceName,
            configuration,
          },
        };
        const body = JSON.stringify(request);

        const res = await sendAuthorizedRequest(importApiRoutes.sourcesUpdate, {
          method: 'POST',
          body,
          headers,
        });

        if (!res.ok) {
          displayToast('error', apiMessages.importSourceUpdateServer);

          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message: apiMessages.importSourceUpdateServer,
              statusCode: res.status,
            },
          };
        }

        return {
          success: true,
          data: res,
        };
      } catch (error) {
        displayToast('error', apiMessages.importSourceUpdateClient);

        return {
          success: false,
          error: classifyFetchError(
            error,
            apiMessages.importSourceUpdateClient,
          ),
        };
      }
    },
    [sendAuthorizedRequest],
  );

  const deleteImportSource = useCallback<
    ApiRequestFunctionWithError<{ project: string; source: string }, Response>
  >(
    async ({ project, source }) => {
      try {
        const request: ImportSourceDeleteRequest = {
          importSourceDeleteRequest: { project, source },
        };
        const body = JSON.stringify(request);

        const res = await sendAuthorizedRequest(importApiRoutes.sourcesDelete, {
          method: 'POST',
          body,
          headers,
        });

        if (!res.ok) {
          displayToast('error', apiMessages.importSourceDeleteServer);

          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message: apiMessages.importSourceDeleteServer,
              statusCode: res.status,
            },
          };
        }

        return {
          success: true,
          data: res,
        };
      } catch (error) {
        displayToast('error', apiMessages.importSourceDeleteClient);

        return {
          success: false,
          error: classifyFetchError(
            error,
            apiMessages.importSourceDeleteClient,
          ),
        };
      }
    },
    [sendAuthorizedRequest],
  );

  // ------- Connection Test -------
  const testImportConnection = useCallback<
    ApiRequestFunctionWithError<
      { project: string; definition: string; configuration: ProtoStruct },
      ImportConnection
    >
  >(
    async ({ project, definition, configuration }) => {
      try {
        const request: ImportConnectionTestRequest = {
          importConnectionTestRequest: { project, definition, configuration },
        };
        const body = JSON.stringify(request);

        const res = await sendAuthorizedRequest(
          importApiRoutes.connectionTest,
          {
            method: 'POST',
            body,
            headers,
          },
        );

        if (!res.ok) {
          displayToast('error', apiMessages.importConnectionTestServer);

          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message: apiMessages.importConnectionTestServer,
              statusCode: res.status,
            },
          };
        }

        const json = await res.json();
        const data: ImportConnection = json.importConnection ?? json;

        return {
          success: true,
          data,
        };
      } catch (error) {
        displayToast('error', apiMessages.importConnectionTestClient);

        return {
          success: false,
          error: classifyFetchError(
            error,
            apiMessages.importConnectionTestClient,
          ),
        };
      }
    },
    [sendAuthorizedRequest],
  );

  // ------- Catalog / Discover -------
  const listImportCatalog = useCallback<
    ApiRequestFunctionWithError<
      { project: string; source: string },
      ImportCatalog
    >
  >(
    async ({ project, source }) => {
      try {
        const request: ImportCatalogListRequest = {
          importCatalogListRequest: { project, source },
        };
        const body = JSON.stringify(request);

        const res = await sendAuthorizedRequest(importApiRoutes.catalogList, {
          method: 'POST',
          body,
          headers,
        });

        if (!res.ok) {
          displayToast('error', apiMessages.importCatalogListServer);

          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message: apiMessages.importCatalogListServer,
              statusCode: res.status,
            },
          };
        }

        const json = await res.json();
        const data: ImportCatalog = json.importCatalog ?? json;

        return {
          success: true,
          data,
        };
      } catch (error) {
        displayToast('error', apiMessages.importCatalogListClient);

        return {
          success: false,
          error: classifyFetchError(error, apiMessages.importCatalogListClient),
        };
      }
    },
    [sendAuthorizedRequest],
  );

  const discoverImportDataset = useCallback<
    ApiRequestFunctionWithError<
      { project: string; source: string; dataset: string },
      ImportDataset
    >
  >(
    async ({ project, source, dataset }) => {
      try {
        const request: ImportDatasetDiscoverRequest = {
          importDatasetDiscoverRequest: {
            project,
            source,
            dataset,
          },
        };
        const body = JSON.stringify(request);

        const res = await sendAuthorizedRequest(
          importApiRoutes.datasetDiscover,
          {
            method: 'POST',
            body,
            headers,
          },
        );

        if (!res.ok) {
          displayToast('error', apiMessages.importDatasetDiscoverServer);

          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message: apiMessages.importDatasetDiscoverServer,
              statusCode: res.status,
            },
          };
        }

        const json = await res.json();
        const data: ImportDataset = json.importDataset ?? json;

        return {
          success: true,
          data,
        };
      } catch (error) {
        displayToast('error', apiMessages.importDatasetDiscoverClient);

        return {
          success: false,
          error: classifyFetchError(
            error,
            apiMessages.importDatasetDiscoverClient,
          ),
        };
      }
    },
    [sendAuthorizedRequest],
  );

  // ------- Syncs -------
  const listImportSyncs = useCallback<
    ApiRequestFunctionWithError<
      { project: string; source?: string; dataset?: string },
      ImportSyncs
    >
  >(
    async ({ project, source, dataset }) => {
      try {
        const request: ImportSyncListRequest = {
          importSyncListRequest: {
            project,
            source,
            dataset,
          },
        };
        const body = JSON.stringify(request);

        const res = await sendAuthorizedRequest(importApiRoutes.syncsList, {
          method: 'POST',
          body,
          headers,
        });

        if (!res.ok) {
          displayToast('error', apiMessages.importSyncListServer);

          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message: apiMessages.importSyncListServer,
              statusCode: res.status,
            },
          };
        }

        const json = await res.json();
        const data: ImportSyncs = json.importSyncs ?? json;

        return {
          success: true,
          data,
        };
      } catch (error) {
        displayToast('error', apiMessages.importSyncListClient);

        return {
          success: false,
          error: classifyFetchError(error, apiMessages.importSyncListClient),
        };
      }
    },
    [sendAuthorizedRequest],
  );

  const getImportSync = useCallback<
    ApiRequestFunctionWithError<{ project: string; sync: string }, ImportSync>
  >(
    async ({ project, sync }) => {
      try {
        const request: ImportSyncGetRequest = {
          importSyncGetRequest: { project, sync },
        };
        const body = JSON.stringify(request);

        const res = await sendAuthorizedRequest(importApiRoutes.syncsGet, {
          method: 'POST',
          body,
          headers,
        });

        if (!res.ok) {
          displayToast('error', apiMessages.importSyncGetServer);

          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message: apiMessages.importSyncGetServer,
              statusCode: res.status,
            },
          };
        }

        const json = await res.json();
        const data: ImportSync = json.importSync ?? json;

        return {
          success: true,
          data,
        };
      } catch (error) {
        displayToast('error', apiMessages.importSyncGetClient);

        return {
          success: false,
          error: classifyFetchError(error, apiMessages.importSyncGetClient),
        };
      }
    },
    [sendAuthorizedRequest],
  );

  const startImportSync = useCallback<
    ApiRequestFunctionWithError<
      {
        project: string;
        source: string;
        dataset: string;
        schema: ImportSchema;
        controller?: AbortController;
      },
      Response
    >
  >(
    async ({ project, source, dataset, schema, controller }) => {
      try {
        const request: ImportSyncStartRequest = {
          importSyncStartRequest: {
            project,
            source,
            dataset,
            schema,
          },
        };
        const body = JSON.stringify(request);

        const res = await sendAuthorizedRequest(importApiRoutes.syncsStart, {
          method: 'POST',
          body,
          headers,
          signal: controller?.signal,
        });

        if (!res.ok) {
          displayToast('error', apiMessages.importSyncStartServer);

          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message: apiMessages.importSyncStartServer,
              statusCode: res.status,
            },
          };
        }

        return {
          success: true,
          data: res,
        };
      } catch (error) {
        displayToast('error', apiMessages.importSyncStartClient);

        return {
          success: false,
          error: classifyFetchError(error, apiMessages.importSyncStartClient),
        };
      }
    },
    [sendAuthorizedRequest],
  );

  const cancelImportSync = useCallback<
    ApiRequestFunctionWithError<
      { project: string; source: string; sync: string },
      Response
    >
  >(
    async ({ project, source, sync }) => {
      try {
        const request: ImportSyncCancelRequest = {
          importSyncCancelRequest: { project, source, sync },
        };
        const body = JSON.stringify(request);

        const res = await sendAuthorizedRequest(importApiRoutes.syncsCancel, {
          method: 'POST',
          body,
          headers,
        });

        if (!res.ok) {
          displayToast('error', apiMessages.importSyncCancelServer);

          return {
            success: false,
            error: {
              type: ApiErrorType.ServerError,
              message: apiMessages.importSyncCancelServer,
              statusCode: res.status,
            },
          };
        }

        return {
          success: true,
          data: res,
        };
      } catch (error) {
        displayToast('error', apiMessages.importSyncCancelClient);

        return {
          success: false,
          error: classifyFetchError(error, apiMessages.importSyncCancelClient),
        };
      }
    },
    [sendAuthorizedRequest],
  );

  return {
    listImportDefinitions,
    getImportDefinition,

    listImportSources,
    getImportSource,
    createImportSource,
    updateImportSource,
    deleteImportSource,

    testImportConnection,

    listImportCatalog,
    discoverImportDataset,

    listImportSyncs,
    getImportSync,
    startImportSync,
    cancelImportSync,
  };
};
