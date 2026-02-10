import { chunkSize } from './ViewGridData';

export function getExtendedRoundedBorders(
  start: number,
  end: number,
  maxSize = Number.MAX_SAFE_INTEGER
) {
  const startRow =
    Math.floor(Math.max(0, start - chunkSize) / chunkSize) * chunkSize;
  const endRow =
    (1 + Math.floor((end + chunkSize - 1) / chunkSize)) * chunkSize;

  return [startRow, maxSize && endRow > maxSize ? maxSize : endRow];
}
