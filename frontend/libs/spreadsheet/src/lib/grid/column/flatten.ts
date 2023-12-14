import { Column, ColumnGroup } from '@deltix/grid-it-core';

export const flatten = (group: ColumnGroup) => {
  const columns: Column[] = [];
  const buffer = [...group.columns];

  while (buffer.length) {
    const temp = buffer.shift();
    if (temp instanceof Column) {
      columns.push(temp);
    } else {
      buffer.unshift(...(temp?.columns || []));
    }
  }

  return columns;
};
