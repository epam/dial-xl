import { instanceToPlain } from 'class-transformer';

import { ParsedTable } from '../ParsedTable';
import { Sheet } from './Sheet';
import { Reader } from './utils';

export function createEditableSheet(
  sheetName: string,
  dsl: string,
  tables: ParsedTable[]
): Sheet {
  const sortedTables = tables.slice().sort((a, b) => a.span.from - b.span.from);

  const parsedTablesSpans = instanceToPlain(sortedTables, {
    strategy: 'excludeAll',
    exposeUnsetFields: false,
  });

  const jsonData = {
    tables: parsedTablesSpans,
  };

  const fromSet = collectValues(jsonData, 'from');
  fromSet.add(dsl.length);
  const froms = Array.from(fromSet).sort((a, b) => a - b);
  const reader = new Reader(dsl, froms, jsonData, 0);

  return Sheet.deserialize(reader, sheetName);
}

export function collectValues(
  jsonData: any,
  key: string,
  collected = new Set<number>()
): Set<number> {
  if (Array.isArray(jsonData)) {
    for (const item of jsonData) {
      collectValues(item, key, collected);
    }
  } else if (jsonData && typeof jsonData === 'object') {
    if (Object.prototype.hasOwnProperty.call(jsonData, key)) {
      collected.add(jsonData[key]);
    }
    for (const value of Object.values(jsonData)) {
      collectValues(value, key, collected);
    }
  }

  return collected;
}
