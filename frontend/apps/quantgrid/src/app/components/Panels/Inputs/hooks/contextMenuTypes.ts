import { CommonMetadata } from '@frontend/common';

export const importTreeKey = {
  source: 'import-source:',
  catalog: 'import-catalog:',
  column: 'import-column:',
};

export const excelTreeKey = {
  file: 'excel-file-',
  sheetsCategory: 'excel-sheets-category-',
  tablesCategory: 'excel-tables-category-',
  sheet: 'excel-sheet-',
  table: 'excel-table-',
  column: 'excel-column-',
};

export const contextMenuActionKeys = {
  createTable: 'createTable',
  createTableInNewSheet: 'createTableInNewSheet',
  download: 'download',
  rename: 'rename',
  clone: 'clone',
  moveTo: 'moveTo',
  share: 'share',
  delete: 'delete',
  copyPath: 'copyPath',
  editImportSource: 'editImportSource',
  deleteImportSource: 'deleteImportSource',
  viewVersions: 'viewVersions',
  pullNewData: 'pullNewData',
  syncImportSource: 'syncImportSource',
  syncDataset: 'syncDataset',
} as const;

export type InputChildData = {
  [keyIndex: string]: CommonMetadata;
};

export type ContextMenuEntityType =
  | 'file'
  | 'excel-file'
  | 'excel-sheet'
  | 'excel-table'
  | 'import-source'
  | 'import-catalog'
  | 'import-column';

export const csvFileKey = 'file';
export const excelFileKey = 'excel-file';
export const excelSheetKey = 'excel-sheet';
export const excelTableKey = 'excel-table';

export type ContextMenuItemData = {
  action: string;
  entityType: ContextMenuEntityType;
  entityKey: string;
  childData?: CommonMetadata;
};

export function parseContextMenuKey(key: string): ContextMenuItemData {
  return JSON.parse(key);
}

export function getContextMenuKey(
  action: string,
  entityType: ContextMenuEntityType,
  entityKey: string,
  childData?: CommonMetadata,
): string {
  return JSON.stringify({
    action,
    entityType,
    entityKey,
    childData,
  });
}

// Mapping of prefixes to entity types
const entityTypePrefixMap: Array<{
  prefix: string;
  type: ContextMenuEntityType;
}> = [
  { prefix: importTreeKey.source, type: 'import-source' },
  { prefix: importTreeKey.catalog, type: 'import-catalog' },
  { prefix: importTreeKey.column, type: 'import-column' },
  { prefix: excelTreeKey.file, type: 'excel-file' },
  { prefix: excelTreeKey.sheet, type: 'excel-sheet' },
  { prefix: excelTreeKey.table, type: 'excel-table' },
];

export function determineEntityType(key: string): {
  entityType: ContextMenuEntityType;
  entityKey: string;
} {
  // Find the first matching prefix
  const match = entityTypePrefixMap.find(({ prefix }) =>
    key.startsWith(prefix),
  );

  if (match) {
    return {
      entityType: match.type,
      entityKey: key.replace(match.prefix, ''),
    };
  }

  // Default to csv file
  return {
    entityType: csvFileKey,
    entityKey: key,
  };
}
