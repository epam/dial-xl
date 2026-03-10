import { useMemo } from 'react';

import Icon from '@ant-design/icons';
import { GridCell } from '@frontend/canvas-spreadsheet';
import {
  CommonMetadata,
  FunctionInfo,
  getCreateTableChildren,
  getDropdownDivider,
  getDropdownItem,
  InsertIcon,
  MenuItem,
} from '@frontend/common/lib';
import { ParsedSheets } from '@frontend/parser';

import { insertMenuKeys } from './constants';
import { useCreateChartChildren } from './useCreateChartChildren';

export const useInsertMenuItems = ({
  functions,
  inputFiles,
  onCreateTable,
  selectedCell,
  parsedSheets,
  isOpen,
}: {
  functions: FunctionInfo[];
  inputFiles: CommonMetadata[];
  onCreateTable: (cols: number, rows: number) => void;
  selectedCell: GridCell | null | undefined;
  parsedSheets: ParsedSheets;
  isOpen: boolean;
}): MenuItem => {
  const { chartChildren } = useCreateChartChildren({
    parsedSheets,
    basePath: ['InsertMenu', 'Chart'],
  });

  const tableNames = useMemo(() => {
    let tableNames: string[] = [];
    for (const sheet of Object.values(parsedSheets)) {
      tableNames = tableNames.concat(
        [...sheet.tables.map((table) => table.tableName)].sort(),
      );
    }

    return tableNames;
  }, [parsedSheets]);

  const insertMenuItem = useMemo(() => {
    const insertMenuPath = ['InsertMenu'];

    return {
      label: 'Insert',
      key: 'InsertMenu',
      icon: (
        <Icon
          className="w-4 text-text-secondary"
          component={() => <InsertIcon />}
        />
      ),
      children: isOpen
        ? [
            getDropdownItem({
              label: 'Control',
              key: insertMenuKeys.control,
              fullPath: [...insertMenuPath, 'Control'],
            }),
            getDropdownItem({
              label: 'Table',
              key: insertMenuKeys.table,
              fullPath: [...insertMenuPath, 'Table'],
              children: getCreateTableChildren(
                [...insertMenuPath, 'Table'],
                functions,
                tableNames,
                inputFiles,
                onCreateTable,
              ) as MenuItem[],
            }),
            getDropdownItem({
              label: 'Chart',
              key: insertMenuKeys.chart,
              fullPath: [...insertMenuPath, 'Chart'],
              children: chartChildren,
            }),
            getDropdownDivider(),
            getDropdownItem({
              label: 'New column',
              key: insertMenuKeys.newField,
              fullPath: [...insertMenuPath, 'NewColumn'],
              disabled: !selectedCell?.table?.tableName,
              tooltip: !selectedCell?.table?.tableName
                ? 'No table selected'
                : undefined,
            }),
            getDropdownItem({
              label: selectedCell?.table?.isTableHorizontal
                ? 'Column above'
                : 'Column to the left',
              key: insertMenuKeys.insertLeft,
              fullPath: [...insertMenuPath, 'ColumnLeft'],
              disabled: !selectedCell?.field?.fieldName,
              tooltip: !selectedCell?.field
                ? 'No column cell selected'
                : undefined,
            }),
            getDropdownItem({
              label: selectedCell?.table?.isTableHorizontal
                ? 'Column below'
                : 'Column to the right',
              key: insertMenuKeys.insertRight,
              fullPath: [...insertMenuPath, 'ColumnRight'],
              disabled: !selectedCell?.field?.fieldName,
              tooltip: !selectedCell?.field
                ? 'No column cell selected'
                : undefined,
            }),
            getDropdownDivider(),
            getDropdownItem({
              label: 'New row',
              key: insertMenuKeys.newRow,
              fullPath: [...insertMenuPath, 'NewRow'],
              disabled:
                !selectedCell?.table ||
                (!!selectedCell && !selectedCell?.table?.isManual),
              tooltip: !selectedCell?.table
                ? 'No table selected'
                : selectedCell && !selectedCell?.table?.isManual
                  ? 'Only available for manual table'
                  : undefined,
            }),
            getDropdownItem({
              label: selectedCell?.table?.isTableHorizontal
                ? 'Row to the left'
                : 'Row above',
              key: insertMenuKeys.newRowAbove,
              fullPath: [...insertMenuPath, 'RowAbove'],
              disabled:
                selectedCell?.isFieldHeader ||
                selectedCell?.isTableHeader ||
                (!!selectedCell && !selectedCell?.table?.isManual),
              tooltip:
                selectedCell?.isFieldHeader || selectedCell?.isTableHeader
                  ? 'No table cell selected'
                  : selectedCell && !selectedCell?.table?.isManual
                    ? 'Only available for manual table'
                    : undefined,
            }),
            getDropdownItem({
              label: selectedCell?.table?.isTableHorizontal
                ? 'Row to the right'
                : 'Row below',
              key: insertMenuKeys.newRowBelow,
              fullPath: [...insertMenuPath, 'RowBelow'],
              disabled:
                selectedCell?.isFieldHeader ||
                selectedCell?.isTableHeader ||
                (!!selectedCell && !selectedCell?.table?.isManual),
              tooltip:
                selectedCell?.isFieldHeader || selectedCell?.isTableHeader
                  ? 'No table cell selected'
                  : selectedCell && !selectedCell?.table?.isManual
                    ? 'Only available for manual table'
                    : undefined,
            }),
          ]
        : [],
    };
  }, [
    isOpen,
    functions,
    tableNames,
    inputFiles,
    onCreateTable,
    chartChildren,
    selectedCell,
  ]);

  return insertMenuItem;
};
