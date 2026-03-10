import { ItemType } from 'antd/es/menu/interface';
import { useMemo } from 'react';

import Icon from '@ant-design/icons';

import { SelectAllIcon, TablePlusIcon } from '../icons';
import { CommonMetadata, FunctionInfo, FunctionType } from '../services';
import { FormulasContextMenuKeyData, MenuItem } from '../types';
import { getCreateTableChildren } from '../utils/formulaMenuItems';
import { getDropdownItem, getDropdownMenuKey } from '../utils/getDropdownItem';

const getFunctionsMap = (
  functions: FunctionInfo[],
): Record<string, FunctionInfo[]> => {
  return functions.reduce(
    (acc, curr) => {
      (curr.functionType ?? []).forEach((type) => {
        if (!acc[type]) {
          acc[type] = [] as FunctionInfo[];
        }

        acc[type].push(curr);
      });

      return acc;
    },
    {} as Record<string, FunctionInfo[]>,
  );
};

const getSubmenuItemsByFunctionType = (
  funcMap: Record<string, FunctionInfo[]>,
  type: FunctionType,
  basePath: string[],
): MenuItem[] => {
  return funcMap[type]?.map((func) =>
    getDropdownItem({
      label: func.name,
      fullPath: [...basePath, type, func.name],
      key: getDropdownMenuKey<FormulasContextMenuKeyData>(
        [type, func.name].join(','),
        {
          insertFormula: func.name + '()',
        },
      ),
    }),
  );
};

export const useFormulaMenuItems = ({
  functions,
  tableNames,
  inputList,
  onCreateTable,
  withFunctions = true,
  basePath = ['FormulaMenu'],
  isOpen,
}: {
  functions: FunctionInfo[];
  tableNames: string[];
  inputList: CommonMetadata[] | null;
  onCreateTable: (cols: number, rows: number) => void;
  withFunctions: boolean;
  basePath?: string[];
  isOpen: boolean;
}) => {
  const functionsMap = useMemo(() => {
    return getFunctionsMap(functions);
  }, [functions]);

  const pythonChildrenElements = useMemo(() => {
    return isOpen
      ? getSubmenuItemsByFunctionType(
          functionsMap,
          FunctionType.Python,
          basePath,
        )
      : [];
  }, [isOpen, functionsMap, basePath]);

  const createTableMenuItem = useMemo(() => {
    if (!isOpen) return {} as ItemType;

    const createTablePath = [...basePath, 'CreateTable'];

    return getDropdownItem({
      key: 'CreateTable',
      label: 'Create Table',
      fullPath: createTablePath,
      icon: (
        <Icon
          className="text-text-secondary w-[18px]"
          component={() => (
            <TablePlusIcon secondaryAccentCssVar="text-accent-tertiary" />
          )}
        />
      ),
      children: getCreateTableChildren(
        createTablePath,
        functions,
        tableNames,
        inputList,
        onCreateTable,
      ),
    });
  }, [isOpen, basePath, functions, inputList, onCreateTable, tableNames]);

  const createControlMenuItem = useMemo(() => {
    if (!isOpen) return {} as ItemType;

    return getDropdownItem({
      key: getDropdownMenuKey('CreateControl', {}),
      label: 'Create Control',
      fullPath: [...basePath, 'CreateControl'],
      icon: (
        <Icon
          className="text-text-accent-primary w-[18px]"
          component={() => <SelectAllIcon />}
        />
      ),
    });
  }, [isOpen, basePath]);

  const aggregationsMenuItem = useMemo(() => {
    if (!isOpen) return {} as ItemType;
    const path = [...basePath, 'Aggregations'];

    return getDropdownItem({
      key: 'Aggregations',
      label: 'Aggregations',
      fullPath: path,
      children: getSubmenuItemsByFunctionType(
        functionsMap,
        FunctionType.Aggregations,
        path,
      ),
    });
  }, [isOpen, functionsMap, basePath]);

  const mathMenuItem = useMemo(() => {
    if (!isOpen) return {} as ItemType;
    const path = [...basePath, 'Math'];

    return getDropdownItem({
      key: 'Math',
      label: 'Math',
      fullPath: path,
      children: getSubmenuItemsByFunctionType(
        functionsMap,
        FunctionType.Math,
        path,
      ),
    });
  }, [isOpen, functionsMap, basePath]);

  const logicalMenuItem = useMemo(() => {
    if (!isOpen) return {} as ItemType;
    const path = [...basePath, 'Logical'];

    return getDropdownItem({
      key: 'Logical',
      label: 'Logical',
      fullPath: path,
      children: getSubmenuItemsByFunctionType(
        functionsMap,
        FunctionType.Logical,
        path,
      ),
    });
  }, [isOpen, functionsMap, basePath]);

  const tableMenuItem = useMemo(() => {
    if (!isOpen) return {} as ItemType;
    const path = [...basePath, 'Table'];

    return getDropdownItem({
      key: 'Table',
      label: 'Table',
      fullPath: path,
      children: getSubmenuItemsByFunctionType(
        functionsMap,
        FunctionType.Table,
        path,
      ),
    });
  }, [isOpen, functionsMap, basePath]);

  const arrayMenuItem = useMemo(() => {
    if (!isOpen) return {} as ItemType;
    const path = [...basePath, 'Array'];

    return getDropdownItem({
      key: 'Array',
      label: 'Array',
      fullPath: path,
      children: getSubmenuItemsByFunctionType(
        functionsMap,
        FunctionType.Array,
        path,
      ),
    });
  }, [isOpen, functionsMap, basePath]);

  const lookupMenuItem = useMemo(() => {
    if (!isOpen) return {} as ItemType;

    const path = [...basePath, 'Lookup'];

    return getDropdownItem({
      key: 'Lookup',
      label: 'Lookup',
      fullPath: path,
      children: getSubmenuItemsByFunctionType(
        functionsMap,
        FunctionType.Lookup,
        path,
      ),
    });
  }, [isOpen, functionsMap, basePath]);

  const dateMenuItem = useMemo(() => {
    if (!isOpen) return {} as ItemType;
    const path = [...basePath, 'Date'];

    return getDropdownItem({
      key: 'Date',
      label: 'Date',
      fullPath: path,
      children: getSubmenuItemsByFunctionType(
        functionsMap,
        FunctionType.Date,
        path,
      ),
    });
  }, [isOpen, functionsMap, basePath]);

  const textMenuItem = useMemo(() => {
    if (!isOpen) return {} as ItemType;
    const path = [...basePath, 'Text'];

    return getDropdownItem({
      key: 'Text',
      label: 'Text',
      fullPath: path,
      children: getSubmenuItemsByFunctionType(
        functionsMap,
        FunctionType.Text,
        path,
      ),
    });
  }, [isOpen, functionsMap, basePath]);

  const periodSeriesMenuItem = useMemo(() => {
    if (!isOpen) return {} as ItemType;
    const path = [...basePath, 'PeriodSeries'];

    return getDropdownItem({
      key: 'PeriodSeries',
      label: 'Period Series',
      fullPath: path,
      children: getSubmenuItemsByFunctionType(
        functionsMap,
        FunctionType.PeriodSeries,
        path,
      ),
    });
  }, [isOpen, functionsMap, basePath]);

  const pythonMenuItem = useMemo(() => {
    if (!isOpen) return {} as ItemType;
    const path = [...basePath, 'Python'];

    return getDropdownItem({
      key: 'Python',
      label: 'Python',
      fullPath: path,
      disabled: !pythonChildrenElements?.length,
      tooltip: !pythonChildrenElements?.length
        ? 'No available python functions'
        : undefined,
      children: getSubmenuItemsByFunctionType(
        functionsMap,
        FunctionType.Python,
        path,
      ),
    });
  }, [isOpen, functionsMap, basePath, pythonChildrenElements?.length]);

  return useMemo(() => {
    if (!withFunctions) return [createControlMenuItem, createTableMenuItem];

    return [
      createControlMenuItem,
      createTableMenuItem,
      aggregationsMenuItem,
      mathMenuItem,
      logicalMenuItem,
      tableMenuItem,
      arrayMenuItem,
      lookupMenuItem,
      dateMenuItem,
      textMenuItem,
      periodSeriesMenuItem,
      pythonMenuItem,
    ];
  }, [
    withFunctions,
    createControlMenuItem,
    createTableMenuItem,
    aggregationsMenuItem,
    mathMenuItem,
    logicalMenuItem,
    tableMenuItem,
    arrayMenuItem,
    lookupMenuItem,
    dateMenuItem,
    textMenuItem,
    periodSeriesMenuItem,
    pythonMenuItem,
  ]);
};
