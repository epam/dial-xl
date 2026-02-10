import { useCallback, useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import { ImportCatalog, ImportDataset, ImportSource } from '@frontend/common';

import { ProjectContext } from '../../context';
import { useSyncImportsConfirmModalStore } from '../../store';
import {
  collectSingleFieldImport,
  collectUsedImports,
  useDSLUtils,
  useImportsEditDsl,
} from '../EditDsl';
import { useApiRequests } from '../useApiRequests';

export const useImports = () => {
  const {
    projectName,
    projectBucket,
    projectPath,
    fullProjectPath,
    parsedSheets,
  } = useContext(ProjectContext);
  const { listImportSources, listImportCatalog, discoverImportDataset } =
    useApiRequests();
  const openSyncImportsConfirmModal = useSyncImportsConfirmModalStore(
    (s) => s.open
  );
  const {
    syncSingleImportField: handleSyncSingleImportField,
    syncImports: handleSyncImports,
    renameImportSourceDsl,
  } = useImportsEditDsl();
  const { findEditContext } = useDSLUtils();

  const [importSources, setImportSources] = useState<
    Record<string, ImportSource>
  >({});
  const [importCatalogs, setImportCatalogs] = useState<
    Record<string, ImportCatalog>
  >({});
  const [importDatasets, setImportDatasets] = useState<
    Record<string, ImportDataset>
  >({});
  const [isImportSourcesLoading, setIsImportSourcesLoading] = useState(true);

  const getImportSources = useCallback(async () => {
    if (!fullProjectPath) return;

    setImportCatalogs({});
    setImportDatasets({});

    setIsImportSourcesLoading(true);

    const sourcesResponse = await listImportSources({
      project: fullProjectPath,
    });

    setIsImportSourcesLoading(false);

    if (!sourcesResponse?.sources) return;

    setImportSources(sourcesResponse.sources);
  }, [fullProjectPath, listImportSources]);

  const expandImportSource = useCallback(
    async (sourceKey: string) => {
      if (!fullProjectPath || importCatalogs[sourceKey]) return;

      const catalogResponse = await listImportCatalog({
        project: fullProjectPath,
        source: sourceKey,
      });

      if (!catalogResponse) return;

      setImportCatalogs((prev) => ({
        ...prev,
        [sourceKey]: catalogResponse,
      }));
    },
    [fullProjectPath, importCatalogs, listImportCatalog]
  );

  const expandImportCatalog = useCallback(
    async (sourceKey: string, datasetKey: string) => {
      if (!fullProjectPath) return;

      const catalogKey = `${sourceKey}:${datasetKey}`;
      if (importDatasets[catalogKey]) return;

      const datasetResponse = await discoverImportDataset({
        project: fullProjectPath,
        source: sourceKey,
        dataset: datasetKey,
      });

      if (datasetResponse) {
        setImportDatasets((prev) => ({
          ...prev,
          [catalogKey]: datasetResponse,
        }));
      }
    },
    [discoverImportDataset, fullProjectPath, importDatasets]
  );

  const syncAllImports = useCallback(
    async (params?: { source?: string; dataset?: string }) => {
      const { source, dataset } = params ?? {};
      const mode: 'all' | 'source' | 'dataset' = dataset
        ? 'dataset'
        : source
        ? 'source'
        : 'all';

      const selectedSourceName = source
        ? Object.values(importSources).find((i) => i.source === source)?.name
        : undefined;

      const baseMessageByMode: Record<typeof mode, string> = {
        all: "We'll sync all import sources that are actually referenced in your worksheets. Unused imports will be skipped",
        source: `We'll sync all imports that use the source "${
          selectedSourceName ?? source
        }" and are actually referenced in your worksheets. Unused imports will be skipped`,
        dataset: `We'll sync all imports for the dataset "${dataset}" that are actually referenced in your worksheets. Unused imports will be skipped`,
      };

      // Collect all used imports from all worksheets
      let usedImports = collectUsedImports(parsedSheets);

      // Optional filtering by selected source/dataset
      const shouldFilterByDataset = !!(selectedSourceName && dataset);
      if (selectedSourceName) {
        const targetDataset = shouldFilterByDataset ? dataset : null;

        usedImports = ((map) => {
          const res = new Map(map);
          for (const [k, v] of map) {
            const bySource = v.source === selectedSourceName;
            const byDataset = targetDataset
              ? v.dataset === targetDataset
              : true;
            if (!(bySource && byDataset)) res.delete(k);
          }

          return res;
        })(usedImports);
      }

      if (!usedImports || usedImports.size === 0) {
        toast.info(
          mode === 'all'
            ? 'No matching imports found. It looks like there are no IMPORT() calls in worksheet formulas.'
            : 'No imports matched the selected filters. Nothing to sync.'
        );

        return;
      }

      // Prepare a list of sources/datasets for modal
      const listItems = Array.from(usedImports.values())
        .filter((v, i, arr) => arr.indexOf(v) === i)
        .sort((a, b) => {
          const aRes = `${a.source}/${a.dataset}`;
          const bRes = `${b.source}/${b.dataset}`;

          return aRes.localeCompare(bRes);
        });

      openSyncImportsConfirmModal({
        title: 'Sync all external inputs with source',
        listItems,
        primaryMessage: baseMessageByMode[mode],
        okText: 'Sync',
        onConfirm: () => handleSyncImports(importSources, usedImports),
      });
    },
    [
      handleSyncImports,
      importSources,
      openSyncImportsConfirmModal,
      parsedSheets,
    ]
  );

  const syncSingleImportField = useCallback(
    async (tableName: string, fieldName: string) => {
      if (!parsedSheets || !fullProjectPath) return;

      const context = findEditContext(tableName, fieldName);

      if (!context?.field || !context?.parsedField) return;

      const { parsedField } = context;

      // Get import function options from the target field
      const importOptions = collectSingleFieldImport(parsedField);
      if (!importOptions || !parsedField?.expressionMetadata?.text) return;

      openSyncImportsConfirmModal({
        title: 'Confirm',
        listItems: [importOptions],
        primaryMessage: (
          <>
            We&apos;ll sync import source for the{' '}
            <b>
              {tableName}[{fieldName}]
            </b>
            .
          </>
        ),
        okText: 'Sync',
        onConfirm: () =>
          handleSyncSingleImportField(tableName, fieldName, importSources),
      });
    },
    [
      findEditContext,
      fullProjectPath,
      handleSyncSingleImportField,
      importSources,
      openSyncImportsConfirmModal,
      parsedSheets,
    ]
  );

  const onRenameImportSource = useCallback(
    (oldName: string, newName: string) => {
      renameImportSourceDsl(oldName, newName);
    },
    [renameImportSourceDsl]
  );

  useEffect(() => {
    if (!projectName || !projectBucket) return;

    getImportSources();
  }, [projectName, projectBucket, projectPath, getImportSources]);

  return {
    importSources,
    importCatalogs,
    importDatasets,
    isImportSourcesLoading,
    getImportSources,
    expandImportSource,
    expandImportCatalog,
    syncAllImports,
    syncSingleImportField,
    onRenameImportSource,
  };
};
