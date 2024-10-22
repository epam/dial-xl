import { ColumnChunk } from '@frontend/common';

import { chunkSize } from './ViewGridData';

export function getNotLoadedChunks(
  chunks: { [index: number]: ColumnChunk },
  fields: string[],
  startRow: number,
  endRow: number
) {
  const start = Math.floor(startRow / chunkSize);
  const end = Math.floor(endRow / chunkSize);
  const notLoadedFields: Set<string> = new Set();

  let min: number | null = null;
  let max: number | null = null;

  for (let chunkIndex = start; chunkIndex <= end; ++chunkIndex) {
    const allFieldsLoaded =
      fields &&
      fields.every(
        (field) => chunks[chunkIndex] && field in chunks[chunkIndex]
      );

    fields.forEach((f) => {
      if (!(chunks[chunkIndex] && f in chunks[chunkIndex])) {
        notLoadedFields.add(f);
      }
    });

    if (!(chunkIndex in chunks) || !allFieldsLoaded) {
      if (min == null) {
        min = chunkIndex;
      }
      max = chunkIndex;
    }
  }

  if (min === null || max === null) return null;

  return {
    startRow: min * chunkSize,
    endRow: (max + 1) * chunkSize,
    fields: notLoadedFields,
  };
}
