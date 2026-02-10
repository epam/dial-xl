import { Checkbox, Input, Modal, Spin } from 'antd';
import cx from 'classnames';
import Fuse from 'fuse.js';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Select from 'react-select';
import { toast } from 'react-toastify';

import {
  ColumnDataType,
  ImportColumn,
  ImportColumnType,
  ImportSchema,
  ImportSync,
  inputClasses,
  modalFooterButtonClasses,
  primaryButtonClasses,
  primaryDisabledButtonClasses,
  SearchIcon,
  secondaryButtonClasses,
  SelectClasses,
  selectStyles,
} from '@frontend/common';

import { ProjectContext } from '../../../context';
import {
  getImportVersionFromSSE,
  useApiRequests,
  useCreateTableDsl,
  useRunImportSync,
} from '../../../hooks';
import { useCreateTableFromImportModalStore } from '../../../store';

const newVersionValue = 'newVersion';
const fuseOptions: Fuse.IFuseOptions<any> = {
  includeScore: true,
  shouldSort: true,
  includeMatches: true,
  threshold: 0.2,
  keys: [
    { name: 'column', getFn: (item) => item[1].column },
    { name: 'targetType', getFn: (item) => item[1].targetType },
    { name: 'type', getFn: (item) => item[1].type },
  ],
};
const importTypeMapping: Record<ImportColumnType, string> = {
  [ImportColumnType.IMPORT_COLUMN_TYPE_STRING]: 'Text',
  [ImportColumnType.IMPORT_COLUMN_TYPE_DOUBLE]: 'Number',
  [ImportColumnType.IMPORT_COLUMN_TYPE_DATE]: 'Date',
  [ImportColumnType.IMPORT_COLUMN_TYPE_DATE_TIME]: 'Date Time',
  [ImportColumnType.IMPORT_COLUMN_TYPE_BOOLEAN]: 'Boolean',
};

export function CreateTableFromImportModal() {
  const isOpen = useCreateTableFromImportModalStore((s) => s.isOpen);
  const sourceKey = useCreateTableFromImportModalStore((s) => s.sourceKey);
  const sourceName = useCreateTableFromImportModalStore((s) => s.sourceName);
  const datasetKey = useCreateTableFromImportModalStore((s) => s.datasetKey);
  const col = useCreateTableFromImportModalStore((s) => s.col);
  const row = useCreateTableFromImportModalStore((s) => s.row);
  const mode = useCreateTableFromImportModalStore((s) => s.mode);
  const close = useCreateTableFromImportModalStore((s) => s.close);

  const { fullProjectPath } = useContext(ProjectContext);
  const { discoverImportDataset, listImportSyncs } = useApiRequests();
  const { createExpandedTable } = useCreateTableDsl();
  const { runImportSync } = useRunImportSync();

  const [schema, setSchema] = useState<ImportSchema | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    new Set()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [versions, setVersions] = useState<ImportSync[]>([]);
  const [selectedVersion, setSelectedVersion] =
    useState<string>(newVersionValue);
  const [searchValue, setSearchValue] = useState('');

  const isPullMode = useMemo(() => mode === 'pullData', [mode]);

  // Reset selection when the dialog opens/changes the entity
  useEffect(() => {
    if (isOpen) {
      setSelectedVersion(newVersionValue);
      setSelectedColumns(new Set());
      setVersions([]);
    }
  }, [isOpen, sourceKey, datasetKey]);

  // Load base (discover) schema when "New version" mode is selected or in pullMode
  useEffect(() => {
    if (!isOpen || !sourceKey || !datasetKey) return;

    const fetchSchema = async () => {
      if (!fullProjectPath) return;

      setIsLoading(true);

      const response = await discoverImportDataset({
        project: fullProjectPath,
        source: sourceKey,
        dataset: datasetKey,
      });

      setIsLoading(false);

      if (response?.schema) {
        setSchema(response.schema);
        const allColumns = new Set(Object.keys(response.schema.columns));
        setSelectedColumns(allColumns);
      } else {
        setSchema(null);
        setSelectedColumns(new Set());
      }
    };

    if (isPullMode || selectedVersion === newVersionValue) {
      fetchSchema();
    }
  }, [
    isOpen,
    sourceKey,
    datasetKey,
    discoverImportDataset,
    fullProjectPath,
    selectedVersion,
    isPullMode,
  ]);

  // Load existing versions
  useEffect(() => {
    if (!isOpen || !sourceKey || !datasetKey || !fullProjectPath) return;

    const fetchVersions = async () => {
      const response = await listImportSyncs({
        project: fullProjectPath,
        source: sourceKey,
        dataset: datasetKey,
      });

      if (response?.syncs) {
        const syncList = Object.values(response.syncs).filter(
          (s) => s.status === 'SUCCEEDED'
        );
        setVersions(syncList);
      } else {
        setVersions([]);
      }
    };

    fetchVersions();
  }, [isOpen, sourceKey, datasetKey, fullProjectPath, listImportSyncs]);

  const handleColumnToggle = useCallback((columnName: string) => {
    setSelectedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(columnName)) {
        next.delete(columnName);
      } else {
        next.add(columnName);
      }

      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (!schema) return;
    setSelectedColumns(new Set(Object.keys(schema.columns)));
  }, [schema]);

  const handleDeselectAll = useCallback(() => {
    setSelectedColumns(new Set());
  }, []);

  const selectedVersionSync = useMemo(
    () => versions.find((v) => v.version === selectedVersion),
    [versions, selectedVersion]
  );

  const currentSchemaColumns = useMemo<Record<
    string,
    ImportColumn
  > | null>(() => {
    if (selectedVersion === newVersionValue) {
      return schema?.columns ?? null;
    }

    return selectedVersionSync?.schema?.columns ?? null;
  }, [schema, selectedVersion, selectedVersionSync]);
  const currentSchemaColumnsEntries = useMemo(() => {
    return currentSchemaColumns && Object.entries(currentSchemaColumns);
  }, [currentSchemaColumns]);
  const currentSchemaColumnsEntriesFiltered = useMemo(() => {
    if (!currentSchemaColumnsEntries) return [];
    if (!searchValue) return currentSchemaColumnsEntries;

    const fuseRes = new Fuse(currentSchemaColumnsEntries, fuseOptions);

    return fuseRes.search(searchValue).map((i) => i.item);
  }, [currentSchemaColumnsEntries, searchValue]);

  useEffect(() => {
    if (!isOpen) return;

    if (selectedVersion !== newVersionValue) {
      const cols = selectedVersionSync?.schema?.columns;
      setSelectedColumns(new Set(cols ? Object.keys(cols) : []));
    }
  }, [isOpen, selectedVersion, selectedVersionSync]);

  const requestAndCreateTable = useCallback(
    (version: string, schemaCols: Record<string, ImportColumn>) => {
      if (!datasetKey) return;

      const formula = `IMPORT("${sourceName}/${datasetKey}", ${version})`;

      createExpandedTable({
        row: row ?? 0,
        col: col ?? 0,
        formula,
        schema: Object.keys(schemaCols),
        tableName: datasetKey,
        keys: [],
        type: ColumnDataType.TABLE_VALUE,
        isSourceDimField: true,
        variant: 'dimFormula',
      });
    },
    [col, datasetKey, createExpandedTable, row, sourceName]
  );

  const handleSubmit = useCallback(async () => {
    if (!fullProjectPath || !sourceKey || !datasetKey) return;
    if (selectedVersion !== newVersionValue) {
      const versionToUse = selectedVersionSync?.version;
      const schemaCols = selectedVersionSync?.schema?.columns;
      if (
        !versionToUse ||
        !schemaCols ||
        Object.keys(schemaCols).length === 0 ||
        selectedColumns.size === 0
      ) {
        toast.error('Selected version has no columns to create a table');

        return;
      }
      const selectedSchema: Record<string, ImportColumn> = Object.fromEntries(
        Object.entries(schemaCols).filter(([columnName]) =>
          selectedColumns.has(columnName)
        )
      );
      requestAndCreateTable(versionToUse, selectedSchema);
      close();

      return;
    }
    if (!schema || selectedColumns.size === 0) return;

    setIsSubmitting(true);

    const selectedSchema: ImportSchema = {
      columns: Object.fromEntries(
        Object.entries(schema.columns).filter(([columnName]) =>
          selectedColumns.has(columnName)
        )
      ),
    };

    const importSyncParams = {
      project: fullProjectPath,
      source: sourceKey,
      dataset: datasetKey,
      schema: selectedSchema,
    };

    // Pull mode: start sync and exit without handling SSE
    if (isPullMode) {
      const ok = await runImportSync<void>({
        params: importSyncParams,
        onStartError: () => undefined,
      });

      setIsSubmitting(false);
      toast.info(
        ok === undefined
          ? 'Pulling new data has started'
          : 'Failed to start pulling data'
      );
      close();

      return;
    }

    try {
      let schemaFromSSE: Record<string, ImportColumn> | undefined;

      const version = await runImportSync<number | null>({
        params: {
          project: fullProjectPath,
          source: sourceKey,
          dataset: datasetKey,
          schema: selectedSchema,
        },
        onStartError: () => null,
        onSSE: getImportVersionFromSSE({
          onSchemaOnce: (cols) => {
            schemaFromSSE = cols;
          },
          doneIsNull: true,
        }),
      });

      setIsSubmitting(false);

      if (version == null) {
        toast.error('Error during table creation');

        return;
      }

      const colsToUse =
        schemaFromSSE ??
        (selectedSchema.columns as Record<string, ImportColumn>);

      requestAndCreateTable(version.toString(), colsToUse);
      close();
    } catch {
      setIsSubmitting(false);
      toast.error('Error during table creation');
    }
  }, [
    runImportSync,
    fullProjectPath,
    sourceKey,
    datasetKey,
    selectedVersion,
    schema,
    selectedColumns,
    isPullMode,
    selectedVersionSync?.version,
    selectedVersionSync?.schema?.columns,
    requestAndCreateTable,
    close,
  ]);

  const totalColumnsCount = useMemo(
    () => (currentSchemaColumns ? Object.keys(currentSchemaColumns).length : 0),
    [currentSchemaColumns]
  );

  const okDisabled = useMemo(
    () => isSubmitting || selectedColumns.size === 0 || totalColumnsCount === 0,
    [isSubmitting, selectedColumns.size, totalColumnsCount]
  );

  const okText = useMemo(() => {
    if (isPullMode) {
      return 'Pull data';
    }

    return 'Create Table';
  }, [isPullMode]);

  const title = useMemo(() => {
    if (isPullMode) {
      return `Pull Data`;
    }

    return `Create Table`;
  }, [isPullMode]);

  return (
    <Modal
      cancelButtonProps={{
        className: cx(modalFooterButtonClasses, secondaryButtonClasses),
      }}
      className="min-w-[min(60dvw,600px)] px-0!"
      destroyOnHidden={true}
      okButtonProps={{
        className: cx(
          modalFooterButtonClasses,
          primaryButtonClasses,
          primaryDisabledButtonClasses
        ),
        disabled: okDisabled,
        loading: isSubmitting,
      }}
      okText={okText}
      open={isOpen}
      title={title}
      onCancel={close}
      onOk={handleSubmit}
    >
      <div className="mt-4">
        {isLoading && selectedVersion === newVersionValue ? (
          <div className="flex justify-center items-center py-8">
            <Spin size="large" />
          </div>
        ) : !currentSchemaColumnsEntries ? (
          <div className="text-center py-8 text-text-secondary">
            No schema found for this dataset
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4">
              {datasetKey && (
                <span className="grid grid-cols-12">
                  <span className="col-span-2 text-sm">Table:</span>
                  <span className="col-span-10 text-sm">{datasetKey}</span>
                </span>
              )}

              {/* Version selector (hidden in pull mode) */}
              {!isPullMode && (
                <div className="grid grid-cols-12 items-center gap-3">
                  <div className="text-sm col-span-2">Version:</div>
                  <div className="col-span-10">
                    <Select
                      className="w-full"
                      classNames={SelectClasses}
                      components={{ IndicatorSeparator: null }}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                      options={[
                        { label: 'New version', value: newVersionValue },
                        ...versions.map((v) => ({
                          label: `v${v.version} — ${v.status}`,
                          value: v.version,
                        })),
                      ]}
                      styles={selectStyles}
                      value={
                        [
                          { label: 'New version', value: newVersionValue },
                          ...versions.map((v) => ({
                            label: `v${v.version} — ${v.status}`,
                            value: v.version,
                          })),
                        ].find((o) => o.value === selectedVersion) ?? null
                      }
                      onChange={(opt) =>
                        setSelectedVersion(
                          (opt as { value: string } | null)?.value ??
                            newVersionValue
                        )
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            <hr className="w-full border-stroke-primary" />

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">Columns</span>
                <span className="text-text-secondary">
                  ({selectedColumns.size}/{currentSchemaColumnsEntries?.length}
                  &nbsp; selected)
                </span>
              </div>

              <div>
                <div className="w-full">
                  <Input
                    className={inputClasses}
                    placeholder="Search columns..."
                    prefix={
                      <div className="size-[18px] text-text-secondary shrink-0">
                        <SearchIcon />
                      </div>
                    }
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                  />
                </div>
              </div>

              <div className="max-h-[320px] overflow-y-auto thin-scrollbar">
                <div className="space-y-0.5 flex flex-col">
                  <div className="flex items-start gap-3 px-3 py-1 rounded hover:bg-bg-accent-primary-alpha cursor-pointer">
                    <Checkbox
                      checked={
                        selectedColumns.size ===
                        currentSchemaColumnsEntries.length
                      }
                      className="grow"
                      indeterminate={
                        selectedColumns.size > 0 &&
                        selectedColumns.size <
                          currentSchemaColumnsEntries.length
                      }
                      onChange={
                        selectedColumns.size ===
                        currentSchemaColumnsEntries.length
                          ? handleDeselectAll
                          : handleSelectAll
                      }
                    >
                      <span>Select all</span>
                    </Checkbox>
                  </div>
                  <div className="ml-6 space-y-0.5">
                    {currentSchemaColumnsEntriesFiltered.map(
                      ([columnName, column]: [string, ImportColumn]) => (
                        <Checkbox
                          checked={selectedColumns.has(columnName)}
                          className="flex grow px-3 py-1 rounded hover:bg-bg-accent-primary-alpha"
                          key={columnName}
                          onChange={() => handleColumnToggle(columnName)}
                        >
                          <div className="flex items-center justify-between gap-3 w-full">
                            <div className="text-text-primary wrap-break-word">
                              {columnName}
                            </div>
                            <div className="flex justify-between min-w-0">
                              <div className="text-xs text-text-secondary">
                                <span>{column.type}</span>
                                {column.targetType && (
                                  <>
                                    &nbsp;→&nbsp;
                                    <span>
                                      {importTypeMapping[column.targetType]}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </Checkbox>
                      )
                    )}
                  </div>
                </div>
              </div>

              {selectedColumns.size === 0 && (
                <div className="text-sm text-warning-primary p-3 bg-warning-inverted rounded">
                  Please select at least one column to create a table
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <hr className="border-stroke-primary w-[calc(100%+48px)] -ml-6 my-4" />
    </Modal>
  );
}
