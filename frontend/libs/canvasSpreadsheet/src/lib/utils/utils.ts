import { GridCell } from '../types';

export function shouldNotOverrideCell(cell: GridCell | undefined): boolean {
  const sortedOrFiltered =
    cell?.field?.isFiltered ||
    cell?.field?.sort ||
    cell?.field?.isFieldUsedInSort;
  const hasKeys = cell?.table?.hasKeys;
  const isManual = cell?.table?.isManual;

  return !!sortedOrFiltered && !hasKeys && !isManual;
}
