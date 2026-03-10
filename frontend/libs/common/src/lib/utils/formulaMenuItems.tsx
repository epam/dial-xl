import { CommonMetadata, FunctionInfo } from '../services';
import { FormulasContextMenuKeyData, MenuItem } from '../types';
import { getDropdownItem, getDropdownMenuKey } from './getDropdownItem';
import { getTableBySizeDropdownItem } from './getSizeDropdownItem';

const menuKey = {
  byRowRange: 'byRowRange',
  bySize: 'bySize',
  copy: 'copy',
  derived: 'derived',
  input: 'input',
  filter: 'filter',
  pivot: 'pivot',
  groupBy: 'groupBy',
  sortTable: 'sortTable',
  uniqueValues: 'uniqueValues',
};

export const getCreateTableChildren = (
  basePath: string[],
  functions: FunctionInfo[],
  tableNames: string[],
  inputFiles: CommonMetadata[] | null,
  onCreateTable: (cols: number, rows: number) => void,
): MenuItem[] => {
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
      key: menuKey.pivot,
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
      key: menuKey.groupBy,
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
      disabled: !rangeFunction,
      label: 'By row range',
      fullPath: [...basePath, 'ByRowRange'],
      key: getDropdownMenuKey<FormulasContextMenuKeyData>(
        ['CreateTable', menuKey.byRowRange, rangeFunction?.name].join('-'),
        {
          insertFormula: rangeFunction?.name + '()',
        },
      ),
    }),
    getDropdownItem({
      label: 'By size',
      key: menuKey.bySize,
      fullPath: [...basePath, 'BySize'],
      children: [
        getTableBySizeDropdownItem({
          key: getDropdownMenuKey<FormulasContextMenuKeyData>(
            ['Action', menuKey.bySize].join('-'),
            {
              insertFormula: menuKey.bySize,
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
      key: getDropdownMenuKey(menuKey.derived),
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
      key: getDropdownMenuKey(menuKey.input),
      fullPath: [...basePath, 'Input'],
      children: inputs
        ? inputs?.map(({ name, url }) =>
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
          )
        : [],
    }),
    getDropdownItem({
      label: 'Filter',
      key: getDropdownMenuKey(menuKey.filter),
      fullPath: [...basePath, 'Filter'],
      disabled: !tableNames?.length || !filterFunction,
      children: filterFunction
        ? tableNames?.map((name) =>
            getDropdownItem({
              label: name,
              fullPath: [...basePath, 'Filter', name],
              key: getDropdownMenuKey<FormulasContextMenuKeyData>(
                ['CreateTable', 'Filter', name].join('-'),
                {
                  insertFormula: filterFunction?.name + `(${name},)`,
                },
              ),
            }),
          )
        : [],
    }),
    getDropdownItem({
      label: 'Sort table',
      key: getDropdownMenuKey(menuKey.sortTable),
      fullPath: [...basePath, 'SortTable'],
      disabled: !tableNames?.length || !sortByFunction,
      children: sortByFunction
        ? tableNames?.map((name) =>
            getDropdownItem({
              label: name,
              fullPath: [...basePath, 'SortTable', name],
              key: getDropdownMenuKey<FormulasContextMenuKeyData>(
                ['CreateTable', 'Filter', name].join('-'),
                {
                  insertFormula: sortByFunction?.name + `(${name},)`,
                },
              ),
            }),
          )
        : [],
    }),
    getDropdownItem({
      label: 'Unique values',
      key: getDropdownMenuKey(menuKey.uniqueValues),
      fullPath: [...basePath, 'UniqueValues'],
      disabled: !tableNames?.length || !uniqueByFunction,
      children: uniqueByFunction
        ? tableNames?.map((name) =>
            getDropdownItem({
              label: name,
              fullPath: [...basePath, 'UniqueValues', name],
              key: getDropdownMenuKey<FormulasContextMenuKeyData>(
                ['CreateTable', 'Filter', name].join('-'),
                {
                  insertFormula: uniqueByFunction?.name + `(${name},)`,
                },
              ),
            }),
          )
        : [],
    }),
  ];
};
