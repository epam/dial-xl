import { useCallback } from 'react';
import { AuthContextProps } from 'react-oidc-context';

import {
  apiMessages,
  ApiRequestFunction,
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

import { displayToast } from '../../utils';
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
    ApiRequestFunction<{ project: string }, ImportDefinitions | undefined>
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

          return;
        }

        const json = await res.json();
        const data: ImportDefinitions = json.importDefinitions ?? json;

        return data;
      } catch {
        displayToast('error', apiMessages.importDefinitionsListClient);

        return;
      }
    },
    [sendAuthorizedRequest],
  );

  const getImportDefinition = useCallback<
    ApiRequestFunction<
      { project: string; definition: string },
      ImportDefinition | undefined
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

          return;
        }

        const json = await res.json();
        const data: ImportDefinition = json.importDefinition ?? json;

        return data;
      } catch {
        displayToast('error', apiMessages.importDefinitionGetClient);

        return;
      }
    },
    [sendAuthorizedRequest],
  );

  // ------- Sources -------
  const listImportSources = useCallback<
    ApiRequestFunction<{ project: string }, ImportSources | undefined>
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

          return;
        }

        const json = await res.json();
        const data: ImportSources = json.importSources ?? json;

        return data;
      } catch {
        displayToast('error', apiMessages.importSourceListClient);

        return;
      }
    },
    [sendAuthorizedRequest],
  );

  const getImportSource = useCallback<
    ApiRequestFunction<
      { project: string; source: string },
      ImportSource | undefined
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

          return;
        }

        const json = await res.json();
        const data: ImportSource = json.importSource ?? json;

        return data;
      } catch {
        displayToast('error', apiMessages.importSourceGetClient);

        return;
      }
    },
    [sendAuthorizedRequest],
  );

  const createImportSource = useCallback<
    ApiRequestFunction<
      {
        project: string;
        definition: string;
        sourceName: string;
        configuration: ProtoStruct;
      },
      Response | undefined
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

          return;
        }

        return res;
      } catch {
        displayToast('error', apiMessages.importSourceCreateClient);

        return;
      }
    },
    [sendAuthorizedRequest],
  );

  const updateImportSource = useCallback<
    ApiRequestFunction<
      {
        project: string;
        source: string;
        sourceName: string;
        configuration: ProtoStruct;
      },
      Response | undefined
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

          return;
        }

        return res;
      } catch {
        displayToast('error', apiMessages.importSourceUpdateClient);

        return;
      }
    },
    [sendAuthorizedRequest],
  );

  const deleteImportSource = useCallback<
    ApiRequestFunction<
      { project: string; source: string },
      Response | undefined
    >
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

          return;
        }

        return res;
      } catch {
        displayToast('error', apiMessages.importSourceDeleteClient);

        return;
      }
    },
    [sendAuthorizedRequest],
  );

  // ------- Connection Test -------
  const testImportConnection = useCallback<
    ApiRequestFunction<
      { project: string; definition: string; configuration: ProtoStruct },
      ImportConnection | undefined
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

          return;
        }

        const json = await res.json();
        const data: ImportConnection = json.importConnection ?? json;

        return data;
      } catch {
        displayToast('error', apiMessages.importConnectionTestClient);

        return;
      }
    },
    [sendAuthorizedRequest],
  );

  // ------- Catalog / Discover -------
  const listImportCatalog = useCallback<
    ApiRequestFunction<
      { project: string; source: string },
      ImportCatalog | undefined
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

          return;
        }

        const json = await res.json();
        const data: ImportCatalog = json.importCatalog ?? json;

        return data;
      } catch {
        displayToast('error', apiMessages.importCatalogListClient);

        return;
      }
    },
    [sendAuthorizedRequest],
  );

  const discoverImportDataset = useCallback<
    ApiRequestFunction<
      { project: string; source: string; dataset: string },
      ImportDataset | undefined
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

          return;
        }

        const json = await res.json();
        const data: ImportDataset = json.importDataset ?? json;

        return data;
      } catch {
        displayToast('error', apiMessages.importDatasetDiscoverClient);

        return;
      }
    },
    [sendAuthorizedRequest],
  );

  // ------- Syncs -------
  const listImportSyncs = useCallback<
    ApiRequestFunction<
      { project: string; source?: string; dataset?: string },
      ImportSyncs | undefined
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

          return;
        }

        const json = await res.json();
        const data: ImportSyncs = json.importSyncs ?? json;

        return data;
      } catch {
        displayToast('error', apiMessages.importSyncListClient);

        return;
      }
    },
    [sendAuthorizedRequest],
  );

  const getImportSync = useCallback<
    ApiRequestFunction<
      { project: string; sync: string },
      ImportSync | undefined
    >
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

          return;
        }

        const json = await res.json();
        const data: ImportSync = json.importSync ?? json;

        return data;
      } catch {
        displayToast('error', apiMessages.importSyncGetClient);

        return;
      }
    },
    [sendAuthorizedRequest],
  );

  const startImportSync = useCallback<
    ApiRequestFunction<
      {
        project: string;
        source: string;
        dataset: string;
        schema: ImportSchema;
        controller?: AbortController;
      },
      Response | undefined
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

          return;
        }

        return res;
      } catch {
        displayToast('error', apiMessages.importSyncStartClient);

        return;
      }
    },
    [sendAuthorizedRequest],
  );

  const cancelImportSync = useCallback<
    ApiRequestFunction<
      { project: string; source: string; sync: string },
      Response | undefined
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

          return;
        }

        return res;
      } catch {
        displayToast('error', apiMessages.importSyncCancelClient);

        return;
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
