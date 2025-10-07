import { GridTable } from '../../../types';

export function getTableZIndex(tableStructure: GridTable[], tableName: string) {
  const tableIndex = tableStructure.findIndex((t) => t.tableName === tableName);

  return tableIndex !== -1 ? tableIndex + 1 : 1;
}
