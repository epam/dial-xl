import { ParsedSheets } from '@frontend/parser';

import { FilesMetadata, FunctionInfo, FunctionType } from '../services';
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
  sortTable: 'sortTable',
  uniqueValues: 'uniqueValues',
};

const getFunctionsMap = (
  functions: FunctionInfo[]
): Record<string, FunctionInfo[]> => {
  return functions.reduce((acc, curr) => {
    (curr.functionType ?? []).forEach((type) => {
      if (!acc[type]) {
        acc[type] = [] as FunctionInfo[];
      }

      acc[type].push(curr);
    });

    return acc;
  }, {} as Record<string, FunctionInfo[]>);
};

const getSubmenuItemsByFunctionType = (
  funcMap: Record<string, FunctionInfo[]>,
  type: FunctionType
): MenuItem[] => {
  return funcMap[type]?.map((func) =>
    getDropdownItem({
      label: func.name,
      key: getDropdownMenuKey<FormulasContextMenuKeyData>(
        [type, func.name].join(','),
        {
          insertFormula: func.name + '()',
        }
      ),
    })
  );
};

export const getCreateTableChildren = (
  functions: FunctionInfo[],
  parsedSheets: ParsedSheets,
  inputFiles: FilesMetadata[] | null,
  onCreateTable: (cols: number, rows: number) => void
): MenuItem[] => {
  const inputs = [...(inputFiles ?? [])].sort((a, b) =>
    a.name < b.name ? -1 : 1
  );

  const rangeFunction = functions.find((func) => func.name === 'RANGE');
  const filterFunction = functions.find((func) => func.name === 'FILTER');
  const sortByFunction = functions.find((func) => func.name === 'SORTBY');
  const uniqueByFunction = functions.find((func) => func.name === 'UNIQUEBY');

  let tableNames: string[] = [];
  for (const sheet of Object.values(parsedSheets)) {
    tableNames = tableNames.concat(
      [...sheet.tables.map((table) => table.tableName)].sort()
    );
  }

  return [
    getDropdownItem({
      disabled: !rangeFunction,
      label: 'By row range',
      key: getDropdownMenuKey<FormulasContextMenuKeyData>(
        ['CreateTable', menuKey.byRowRange, rangeFunction?.name].join('-'),
        {
          insertFormula: rangeFunction?.name + '()',
        }
      ),
    }),
    getDropdownItem({
      label: 'By size',
      key: menuKey.bySize,
      children: [
        getTableBySizeDropdownItem({
          key: getDropdownMenuKey<FormulasContextMenuKeyData>(
            ['Action', menuKey.bySize].join('-'),
            {
              insertFormula: menuKey.bySize,
              type: 'size',
            }
          ),
          onCreateTable,
        }),
      ],
    }),
    getDropdownItem({
      label: 'Copy',
      key: 'Copy',
      disabled: !tableNames?.length,
      children: tableNames?.map((name) =>
        getDropdownItem({
          label: name,
          key: getDropdownMenuKey<FormulasContextMenuKeyData>(
            ['Action', 'Copy', name].join('-'),
            {
              tableName: name,
              type: 'copy',
            }
          ),
        })
      ),
    }),
    getDropdownItem({
      label: 'Derived',
      key: getDropdownMenuKey(menuKey.derived),
      disabled: !tableNames?.length,
      children: tableNames?.map((name) =>
        getDropdownItem({
          label: name,
          key: getDropdownMenuKey<FormulasContextMenuKeyData>(
            ['Action', 'Derived', name].join('-'),
            {
              tableName: name,
              type: 'derived',
            }
          ),
        })
      ),
    }),
    getDropdownItem({
      label: 'Input',
      key: getDropdownMenuKey(menuKey.input),
      children: inputs?.map(({ name, url }) =>
        getDropdownItem({
          label: name,
          key: getDropdownMenuKey<FormulasContextMenuKeyData>(
            ['CreateTable', 'Derived', name].join('-'),
            {
              insertFormula: `INPUT("${url ?? name}")`,
            }
          ),
        })
      ),
    }),
    getDropdownItem({
      label: 'Filter',
      key: getDropdownMenuKey(menuKey.filter),
      disabled: !tableNames?.length || !filterFunction,
      children: tableNames?.map((name) =>
        getDropdownItem({
          label: name,
          key: getDropdownMenuKey<FormulasContextMenuKeyData>(
            ['CreateTable', 'Filter', name].join('-'),
            {
              insertFormula: filterFunction?.name + `(${name},)`,
            }
          ),
        })
      ),
    }),
    getDropdownItem({
      label: 'Sort table',
      key: getDropdownMenuKey(menuKey.sortTable),
      disabled: !tableNames?.length || !sortByFunction,
      children: tableNames?.map((name) =>
        getDropdownItem({
          label: name,
          key: getDropdownMenuKey<FormulasContextMenuKeyData>(
            ['CreateTable', 'Filter', name].join('-'),
            {
              insertFormula: sortByFunction?.name + `(${name},)`,
            }
          ),
        })
      ),
    }),
    getDropdownItem({
      label: 'Unique values',
      key: getDropdownMenuKey(menuKey.uniqueValues),
      disabled: !tableNames?.length || !uniqueByFunction,
      children: tableNames?.map((name) =>
        getDropdownItem({
          label: name,
          key: getDropdownMenuKey<FormulasContextMenuKeyData>(
            ['CreateTable', 'Filter', name].join('-'),
            {
              insertFormula: uniqueByFunction?.name + `(${name},)`,
            }
          ),
        })
      ),
    }),
  ];
};

export const getFormulasMenuItems = (
  functions: FunctionInfo[],
  parsedSheets: ParsedSheets,
  inputFiles: FilesMetadata[] | null,
  onCreateTable: (cols: number, rows: number) => void,
  withFunctions = true
): MenuItem[] => {
  const functionsMap = getFunctionsMap(functions);
  const pythonChildrenElements = getSubmenuItemsByFunctionType(
    functionsMap,
    FunctionType.Python
  );

  const createTableMenuItem = getDropdownItem({
    key: 'CreateTable',
    label: 'Create Table',
    children: getCreateTableChildren(
      functions,
      parsedSheets,
      inputFiles,
      onCreateTable
    ),
  });

  if (!withFunctions) return [createTableMenuItem];

  return [
    createTableMenuItem,
    getDropdownItem({
      key: 'Aggregations',
      label: 'Aggregations',
      children: getSubmenuItemsByFunctionType(
        functionsMap,
        FunctionType.Aggregations
      ),
    }),
    getDropdownItem({
      key: 'Math',
      label: 'Math',
      children: getSubmenuItemsByFunctionType(functionsMap, FunctionType.Math),
    }),
    getDropdownItem({
      key: 'Logical',
      label: 'Logical',
      children: getSubmenuItemsByFunctionType(
        functionsMap,
        FunctionType.Logical
      ),
    }),
    getDropdownItem({
      key: 'Table',
      label: 'Table',
      children: getSubmenuItemsByFunctionType(functionsMap, FunctionType.Table),
    }),
    getDropdownItem({
      key: 'Array',
      label: 'Array',
      children: getSubmenuItemsByFunctionType(functionsMap, FunctionType.Array),
    }),
    getDropdownItem({
      key: 'Lookup',
      label: 'Lookup',
      children: getSubmenuItemsByFunctionType(
        functionsMap,
        FunctionType.Lookup
      ),
    }),
    getDropdownItem({
      key: 'Date',
      label: 'Date',
      children: getSubmenuItemsByFunctionType(functionsMap, FunctionType.Date),
    }),
    getDropdownItem({
      key: 'Text',
      label: 'Text',
      children: getSubmenuItemsByFunctionType(functionsMap, FunctionType.Text),
    }),
    getDropdownItem({
      key: 'PeriodSeries',
      label: 'Period Series',
      children: getSubmenuItemsByFunctionType(
        functionsMap,
        FunctionType.PeriodSeries
      ),
    }),
    getDropdownItem({
      key: 'Python',
      label: 'Python',
      disabled: !pythonChildrenElements?.length,
      tooltip: !pythonChildrenElements?.length
        ? 'No available python functions'
        : undefined,
      children: getSubmenuItemsByFunctionType(
        functionsMap,
        FunctionType.Python
      ),
    }),
  ];
};
