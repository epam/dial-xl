import { DataNode } from 'antd/es/tree';

import Icon from '@ant-design/icons';
import {
  ColumnsIcon,
  CommonMetadata,
  FileIcon,
  TableIcon,
  XLSFileIcon,
} from '@frontend/common';

import { ExcelCatalog, ExcelSheet, ExcelTable } from '../../../../context';
import { draggedImageIdPrefix, excelTreeKey, InputChildData } from '../hooks';

export interface BuildExcelTreeParams {
  input: CommonMetadata;
  key: string;
  excelCatalogs: Record<string, ExcelCatalog>;
  excelSheets: Record<string, ExcelSheet>;
  excelTables: Record<string, ExcelTable>;
}

export interface BuildExcelTreeResult {
  node: DataNode;
  childData: InputChildData;
}

export function buildExcelTree({
  input,
  key,
  excelCatalogs,
  excelSheets,
  excelTables,
}: BuildExcelTreeParams): BuildExcelTreeResult {
  const childData: InputChildData = {};
  const excelFileKey = `${excelTreeKey.file}${key}`;
  const catalog = excelCatalogs[input.url];

  // Root xls(x) file
  const excelNode: DataNode = {
    key: excelFileKey,
    title: input.name,
    isLeaf: false,
    children: undefined,
    icon: (
      <Icon
        className="text-stroke-accent-secondary w-[18px]"
        component={() => <XLSFileIcon />}
        id={`${draggedImageIdPrefix}${excelFileKey}`}
      />
    ),
  };

  if (catalog) {
    const categoryChildren: DataNode[] = [];

    // Add Sheets category
    if (catalog.sheets.length > 0) {
      const sheetsCategoryNode: DataNode = {
        key: `${excelTreeKey.sheetsCategory}${key}`,
        title: 'Sheets',
        isLeaf: false,
        children: catalog.sheets.map((sheetName) => {
          const sheetKey = `${excelTreeKey.sheet}${key}:${sheetName}`;
          const sheet = excelSheets[`${input.url}:${sheetName}`];

          const sheetNode: DataNode = {
            key: sheetKey,
            title: sheetName,
            isLeaf: false,
            children: undefined,
            icon: (
              <Icon
                className="text-text-secondary w-[18px]"
                component={() => <FileIcon />}
                id={`${draggedImageIdPrefix}${sheetKey}`}
              />
            ),
          };

          // Sheets columns
          if (sheet?.columns) {
            sheetNode.children = sheet.columns.map((column) => ({
              key: `${excelTreeKey.column}${key}:${sheetName}:${column}`,
              title: column,
              isLeaf: true,
              icon: (
                <Icon
                  className="text-text-secondary w-[18px]"
                  component={() => <ColumnsIcon />}
                />
              ),
            }));
          }

          return sheetNode;
        }),
        icon: (
          <Icon
            className="text-text-secondary w-[18px]"
            component={() => <FileIcon />}
          />
        ),
      };

      categoryChildren.push(sheetsCategoryNode);
    }

    // Add Tables category
    if (catalog.tables.length > 0) {
      const tablesCategoryNode: DataNode = {
        key: `${excelTreeKey.tablesCategory}${key}`,
        title: 'Tables',
        isLeaf: false,
        children: catalog.tables.map((tableName) => {
          const tableKey = `${excelTreeKey.table}${key}:${tableName}`;
          const table = excelTables[`${input.url}:${tableName}`];

          const tableNode: DataNode = {
            key: tableKey,
            title: tableName,
            isLeaf: false,
            children: undefined,
            icon: (
              <Icon
                className="text-text-secondary w-[18px]"
                component={() => <TableIcon />}
                id={`${draggedImageIdPrefix}${tableKey}`}
              />
            ),
          };

          // Tables columns
          if (table?.columns) {
            tableNode.children = table.columns.map((column) => ({
              key: `${excelTreeKey.column}${key}:${tableName}:${column}`,
              title: column,
              isLeaf: true,
              icon: (
                <Icon
                  className="text-text-secondary w-[18px]"
                  component={() => <ColumnsIcon />}
                />
              ),
            }));
          }

          return tableNode;
        }),
        icon: (
          <Icon
            className="text-text-secondary w-[18px]"
            component={() => <TableIcon />}
          />
        ),
      };

      categoryChildren.push(tablesCategoryNode);
    }

    excelNode.children = categoryChildren;
  }

  childData[excelFileKey] = input;

  if (catalog) {
    catalog.sheets.forEach((sheetName) => {
      childData[`${excelTreeKey.sheet}${key}:${sheetName}`] = input;
    });
    catalog.tables.forEach((tableName) => {
      childData[`${excelTreeKey.table}${key}:${tableName}`] = input;
    });
  }

  return { node: excelNode, childData };
}
