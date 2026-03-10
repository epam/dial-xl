import { useMemo } from 'react';

import {
  CommonMetadata,
  FormulasContextMenuKeyData,
  FunctionInfo,
  getDropdownItem,
  getDropdownMenuKey,
  getTableBySizeDropdownItem,
} from '@frontend/common/lib';

const createTableMenuKeys = {
  byRowRange: 'byRowRange',
  bySize: 'bySize',
  copy: 'copy',
  derived: 'derived',
  input: 'input',
  filter: 'filter',
  pivot: 'pivot',
  sortTable: 'sortTable',
  groupBy: 'groupBy',
  uniqueValues: 'uniqueValues',
};

const getCreateTableChildren = (
  basePath: string[],
  functions: FunctionInfo[],
  tableNames: string[],
  inputFiles: CommonMetadata[] | null,
  onCreateTable: (cols: number, rows: number) => void,
) => {
  const inputs = [...(inputFiles ?? [])].sort((a, b) =>
    a.name < b.name ? -1 : 1,
  );

  const rangeFunction = functions.find((func) => func.name === 'RANGE');
  const filterFunction = functions.find((func) => func.name === 'FILTER');
  const sortByFunction = functions.find((func) => func.name === 'SORTBY');
  const uniqueByFunction = functions.find((func) => func.name === 'UNIQUEBY');

  return [
    getDropdownItem({
      label: 'Pivot',
      key: 'Pivot',
      fullPath: [...basePath, 'Pivot'],
      disabled: !tableNames?.length,
      children: tableNames?.map((name) =>
        getDropdownItem({
          label: name,
          fullPath: [...basePath, 'Pivot', name],
          key: getDropdownMenuKey<FormulasContextMenuKeyData>(
            ['Action', 'Pivot', name].join('-'),
            {
              tableName: name,
              type: 'pivot',
            },
          ),
        }),
      ),
    }),
    getDropdownItem({
      label: 'Group by',
      key: 'GroupBy',
      fullPath: [...basePath, 'GroupBy'],
      disabled: !tableNames?.length,
      children: tableNames?.map((name) =>
        getDropdownItem({
          label: name,
          key: getDropdownMenuKey<FormulasContextMenuKeyData>(
            ['Action', 'GroupBy', name].join('-'),
            {
              tableName: name,
              type: 'groupBy',
            },
          ),
          fullPath: [...basePath, 'GroupBy', name],
        }),
      ),
    }),
    getDropdownItem({
      label: 'By row range',
      fullPath: [...basePath, 'ByRowRange'],
      key: getDropdownMenuKey<FormulasContextMenuKeyData>(
        [
          'CreateTable',
          createTableMenuKeys.byRowRange,
          rangeFunction?.name,
        ].join('-'),
        {
          insertFormula: rangeFunction?.name + '()',
        },
      ),
    }),
    getDropdownItem({
      label: 'By size',
      key: createTableMenuKeys.bySize,
      fullPath: [...basePath, 'BySize'],
      children: [
        getTableBySizeDropdownItem({
          key: getDropdownMenuKey<FormulasContextMenuKeyData>(
            ['Action', createTableMenuKeys.bySize].join('-'),
            {
              type: 'size',
            },
          ),
          onCreateTable,
        }),
      ],
    }),
    getDropdownItem({
      label: 'Copy',
      key: 'Copy',
      fullPath: [...basePath, 'Copy'],
      disabled: !tableNames?.length,
      children: tableNames?.map((name) =>
        getDropdownItem({
          label: name,
          fullPath: [...basePath, 'Copy', name],
          key: getDropdownMenuKey<FormulasContextMenuKeyData>(
            ['Action', 'Copy', name].join('-'),
            {
              tableName: name,
              type: 'copy',
            },
          ),
        }),
      ),
    }),
    getDropdownItem({
      label: 'Derived',
      key: getDropdownMenuKey(createTableMenuKeys.derived),
      fullPath: [...basePath, 'Derived'],
      disabled: !tableNames?.length,
      children: tableNames?.map((name) =>
        getDropdownItem({
          label: name,
          fullPath: [...basePath, 'Derived', name],
          key: getDropdownMenuKey<FormulasContextMenuKeyData>(
            ['Action', 'Derived', name].join('-'),
            {
              tableName: name,
              type: 'derived',
            },
          ),
        }),
      ),
    }),
    getDropdownItem({
      label: 'Input',
      key: getDropdownMenuKey(createTableMenuKeys.input),
      fullPath: [...basePath, 'Input'],
      disabled: !inputs?.length,
      children: inputs?.map(({ name, url }) =>
        getDropdownItem({
          label: name,
          fullPath: [...basePath, 'Input', name],
          key: getDropdownMenuKey<FormulasContextMenuKeyData>(
            ['CreateTable', 'Derived', name].join('-'),
            {
              insertFormula: `INPUT("${url ?? name}")`,
            },
          ),
        }),
      ),
    }),
    filterFunction
      ? getDropdownItem({
          label: 'Filter',
          key: getDropdownMenuKey(createTableMenuKeys.filter),
          fullPath: [...basePath, 'Filter'],
          disabled: !tableNames?.length,
          children: tableNames?.map((name) =>
            getDropdownItem({
              label: name,
              fullPath: [...basePath, 'Filter', name],
              key: getDropdownMenuKey<FormulasContextMenuKeyData>(
                ['CreateTable', 'Filter', name].join('-'),
                {
                  insertFormula: filterFunction.name + `(${name},)`,
                },
              ),
            }),
          ),
        })
      : undefined,
    sortByFunction
      ? getDropdownItem({
          label: 'Sort table',
          key: getDropdownMenuKey(createTableMenuKeys.sortTable),
          fullPath: [...basePath, 'SortTable'],
          disabled: !tableNames?.length,
          children: tableNames?.map((name) =>
            getDropdownItem({
              label: name,
              fullPath: [...basePath, 'SortTable', name],
              key: getDropdownMenuKey<FormulasContextMenuKeyData>(
                ['CreateTable', 'Filter', name].join('-'),
                {
                  insertFormula: sortByFunction.name + `(${name},)`,
                },
              ),
            }),
          ),
        })
      : undefined,
    uniqueByFunction
      ? getDropdownItem({
          label: 'Unique values',
          key: getDropdownMenuKey(createTableMenuKeys.uniqueValues),
          fullPath: [...basePath, 'UniqueValues'],
          disabled: !tableNames?.length,
          children: tableNames?.map((name) =>
            getDropdownItem({
              label: name,
              fullPath: [...basePath, 'UniqueValues', name],
              key: getDropdownMenuKey<FormulasContextMenuKeyData>(
                ['CreateTable', 'Filter', name].join('-'),
                {
                  insertFormula: uniqueByFunction.name + `(${name},)`,
                },
              ),
            }),
          ),
        })
      : undefined,
  ];
};

export const useCreateTableChildren = (
  basePath: string[],
  functions: FunctionInfo[],
  tableNames: string[],
  inputFiles: CommonMetadata[] | null,
  onCreateTable: (cols: number, rows: number) => void,
) => {
  const createTableChildren = useMemo(() => {
    return getCreateTableChildren(
      basePath,
      functions,
      tableNames,
      inputFiles,
      onCreateTable,
    );
  }, [basePath, functions, tableNames, inputFiles, onCreateTable]);

  return createTableChildren;
};
