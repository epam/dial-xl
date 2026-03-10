import { useCallback, useContext } from 'react';
import { toast } from 'react-toastify';

import { ImportSource, ImportSync } from '@frontend/common';
import { unescapeTableName } from '@frontend/parser';

import { ProjectContext } from '../../context';
import {
  collectSingleFieldImport,
  ImportArgs,
  UpdateDslParams,
  useDSLUtils,
} from '../EditDsl';
import { getImportVersionFromSSE, useRunImportSync } from '../Input';
import { useApiRequests } from '../useApiRequests';
import { useSafeCallback } from '../useSafeCallback';

const toastId = 'sync-imports';

export function useImportsEditDsl() {
  const { fullProjectPath, parsedSheets } = useContext(ProjectContext);
  const { listImportSyncs } = useApiRequests();
  const { updateDSL, findEditContext } = useDSLUtils();
  const { runImportSync } = useRunImportSync();

  const syncImports = useCallback(
    async (
      importSources: Record<string, ImportSource>,
      usedImports: Map<string, ImportArgs>,
    ) => {
      if (!parsedSheets || usedImports.size === 0) return;

      toast.loading(
        `Starting sync for ${usedImports.size} import dataset(s)…`,
        {
          toastId,
        },
      );

      const collectSyncs: Array<
        ImportSync & { dataset: string; sourceName: string }
      > = [];

      for (const { dataset, source, version } of usedImports.values()) {
        // Get sourceId for a source name, needed for an api call
        const sourceId = Object.values(importSources).find(
          (src) => src.name === source,
        )?.source;

        if (!sourceId) continue;

        // Get all syncs for source/dataset
        const syncList = await listImportSyncs({
          project: fullProjectPath,
          source: sourceId,
          dataset,
        });

        if (syncList?.syncs) {
          // Get sync with a used version from the dsl or newest version if not found
          const targetSync = findTargetSync(syncList.syncs, version);

          if (targetSync) {
            collectSyncs.push({
              ...targetSync,
              dataset,
              sourceName: source,
            });
          }
        }
      }

      const updatedVersion = new Map<string, number>();
      // Start new sync for all founded import functions and collect a new version for each one
      await Promise.all(
        collectSyncs.map(async ({ sourceName, source, dataset, schema }) => {
          try {
            const newVersion = await runImportSync<number | null | undefined>({
              params: {
                project: fullProjectPath,
                source,
                dataset,
                schema,
              },
              onStartError: () => null,
              onSSE: getImportVersionFromSSE(),
            });

            if (newVersion !== null && newVersion !== undefined) {
              updatedVersion.set(`${sourceName}/${dataset}`, newVersion);
            } else {
              toast.error(`Failed to start sync for ${sourceName}/${dataset}`);
            }
          } catch {
            toast.error(`Sync failed for ${sourceName}/${dataset}.`);
          }
        }),
      );

      toast.dismiss(toastId);

      const dslChanges: UpdateDslParams[] = [];

      // Update all versions in the import functions in all worksheets at once
      try {
        for (const [sheetName, parsedSheet] of Object.entries(parsedSheets)) {
          const sheet = parsedSheet.editableSheet;
          if (!sheet) continue;

          let sheetChanged = false;

          for (const parsedTable of parsedSheet.tables) {
            for (const parsedField of parsedTable.fields) {
              const formula = parsedField.expressionMetadata?.text;
              if (!formula) continue;

              const updatedFormula = applyAllUpdates(formula, updatedVersion);
              if (updatedFormula !== formula) {
                const table = sheet.getTable(
                  unescapeTableName(parsedTable.tableName),
                );
                if (table) {
                  table.setFieldFormula(
                    parsedField.key.fieldName,
                    updatedFormula,
                  );
                  sheetChanged = true;
                }
              }
            }
          }

          if (sheetChanged) {
            dslChanges.push({
              updatedSheetContent: sheet.toDSL(),
              historyTitle: 'Update IMPORT versions after sync',
              sheetNameToChange: sheetName,
            });
          }
        }

        updateDSL(dslChanges);
      } catch (e) {
        toast.error('Failed to update IMPORT versions in DSL.');
      }
    },
    [parsedSheets, listImportSyncs, fullProjectPath, runImportSync, updateDSL],
  );

  const failSingleImportField = useCallback(() => {
    toast.dismiss(toastId);
    toast.error('Failed to update IMPORT ');
  }, []);

  const syncSingleImportField = useCallback(
    async (
      tableName: string,
      fieldName: string,
      importSources: Record<string, ImportSource>,
    ) => {
      if (!parsedSheets || !fullProjectPath) return;

      const context = findEditContext(tableName, fieldName);

      if (!context?.field || !context?.parsedField) return;

      const { parsedField, sheet, sheetName, table } = context;

      // Get import function options from the target field
      const importOptions = collectSingleFieldImport(parsedField);
      if (!importOptions || !parsedField?.expressionMetadata?.text) return;

      const { source, dataset, version } = importOptions;

      // Get sourceId for a source name, needed for an api call
      const sourceId = Object.values(importSources).find(
        (s) => s.name === source,
      )?.source;

      if (!sourceId) return;

      toast.loading(
        `Syncing ${source}/${dataset} for ${tableName}.${fieldName}…`,
        { toastId },
      );

      // Get syncs for source/dataset
      const syncList = await listImportSyncs({
        project: fullProjectPath,
        source: sourceId,
        dataset,
      });

      if (!syncList?.syncs) return failSingleImportField();

      // Get sync with a used version from the dsl or newest version if not found
      const findSync = findTargetSync(syncList.syncs, version);

      if (!findSync) return failSingleImportField();

      try {
        const newVersion = await runImportSync<number | null>({
          params: {
            project: fullProjectPath,
            source: sourceId,
            schema: findSync.schema,
            dataset,
          },
          onStartError: () => null,
          onSSE: getImportVersionFromSSE(),
        });

        if (newVersion == null) return failSingleImportField();

        const newFormula = bumpImportVersionInFormula(
          parsedField.expressionMetadata.text,
          source,
          dataset,
          newVersion,
        );
        table.setFieldFormula(fieldName, newFormula);

        await updateDSL({
          updatedSheetContent: sheet.toDSL(),
          historyTitle: `Update ${tableName}[${fieldName}] IMPORT version to ${newVersion}`,
          sheetNameToChange: sheetName,
        });

        toast.update(toastId, {
          render: `Updated ${tableName}[${fieldName}] to version ${newVersion}.`,
          type: 'success',
          isLoading: false,
          autoClose: 2500,
        });
      } catch {
        toast.update(toastId, {
          render: `Sync failed for ${source}/${dataset}.`,
          type: 'error',
          isLoading: false,
          autoClose: 3500,
        });
      }
    },
    [
      parsedSheets,
      fullProjectPath,
      findEditContext,
      listImportSyncs,
      failSingleImportField,
      runImportSync,
      updateDSL,
    ],
  );

  const renameImportSourceDsl = useCallback(
    (oldName: string, newName: string) => {
      const from = (oldName ?? '').trim();
      const to = (newName ?? '').trim();

      if (from === to) return;

      const dslChanges: UpdateDslParams[] = [];

      for (const [sheetName, parsedSheet] of Object.entries(parsedSheets)) {
        const sheet = parsedSheet.editableSheet;
        if (!sheet) continue;

        let sheetChanged = false;

        for (const parsedTable of parsedSheet.tables) {
          const table = sheet.getTable(
            unescapeTableName(parsedTable.tableName),
          );
          if (!table) continue;

          for (const parsedField of parsedTable.fields) {
            const formula = parsedField.expressionMetadata?.text;
            if (!formula) continue;

            const updatedFormula = replaceImportSourceInFormula(
              formula,
              from,
              to,
            );
            if (updatedFormula !== formula) {
              table.setFieldFormula(parsedField.key.fieldName, updatedFormula);
              sheetChanged = true;
            }
          }
        }

        if (sheetChanged) {
          dslChanges.push({
            updatedSheetContent: sheet.toDSL(),
            historyTitle: `Rename IMPORT source "${from}" to "${to}"`,
            sheetNameToChange: sheetName,
          });
        }
      }

      if (dslChanges.length === 0) return;

      updateDSL(dslChanges);
    },
    [parsedSheets, updateDSL],
  );

  return {
    syncImports: useSafeCallback(syncImports),
    syncSingleImportField: useSafeCallback(syncSingleImportField),
    renameImportSourceDsl: useSafeCallback(renameImportSourceDsl),
  };
}

function findTargetSync(
  syncs: Record<string, ImportSync>,
  version: number,
): ImportSync | null {
  let targetSync: ImportSync | null = null;
  for (const sync of Object.values(syncs)) {
    const v = Number.parseInt(String(sync.version), 10);
    if (v === version) {
      targetSync = sync;
      break;
    }

    if (!targetSync || Number.parseInt(String(targetSync.version), 10) < v) {
      targetSync = sync;
    }
  }

  return targetSync;
}

function applyAllUpdates(
  formula: string,
  updatedVersion: Map<string, number>,
): string {
  let next = formula;
  for (const [key, ver] of updatedVersion.entries()) {
    const [sourceName, ...rest] = key.split('/');
    const dataset = rest.join('/');
    next = bumpImportVersionInFormula(next, sourceName, dataset, ver);
  }

  return next;
}

function bumpImportVersionInFormula(
  formula: string,
  sourceName: string,
  dataset: string,
  newVersion: number,
) {
  if (!formula) return formula;

  return formula.replace(importArgsRegex, (full, src, dset) => {
    if (src === sourceName && dset === dataset) {
      return `IMPORT("${src}/${dset}", ${newVersion})`;
    }

    return full;
  });
}

function replaceImportSourceInFormula(
  formula: string,
  oldName: string,
  newName: string,
): string {
  if (!formula) return formula;

  return formula.replace(importArgsRegex, (full, src, dset, ver) => {
    if (src === oldName) {
      return `IMPORT("${newName}/${dset}", ${ver})`;
    }

    return full;
  });
}

/**
 * Core pattern for IMPORT("source/dataset", version)
 *
 * Groups:
 *   1: source - everything up to the first slash (no slash allowed)
 *   2: dataset - everything up to the closing quote (can contain slashes)
 *   3: version - digits after the comma
 */
const importArgsRegex = /IMPORT\(\s*"([^"/]+)\/([^"]+)"\s*,\s*(\d+)\s*\)/gi;
