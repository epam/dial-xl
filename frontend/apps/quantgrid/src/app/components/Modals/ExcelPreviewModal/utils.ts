import { SelectionEdges } from '@frontend/canvas-spreadsheet';
import { toExcelColName } from '@frontend/common';

export type ExcelEntities = {
  sheets: string[];
  tables: string[];
};

export type ExcelTarget =
  | { kind: 'sheet'; name: string }
  | { kind: 'table'; name: string }
  | null;

export function pickDefaultTarget(e: ExcelEntities): ExcelTarget {
  if (e.sheets[0]) return { kind: 'sheet', name: e.sheets[0] };
  if (e.tables[0]) return { kind: 'table', name: e.tables[0] };

  return null;
}

export function formatSelectionA1(selection: SelectionEdges | null): string {
  if (!selection) return '—';

  const sr = Math.max(
    1,
    Math.floor(Math.min(selection.startRow, selection.endRow)),
  );
  const er = Math.max(
    1,
    Math.floor(Math.max(selection.startRow, selection.endRow)),
  );
  const sc = Math.max(
    1,
    Math.floor(Math.min(selection.startCol, selection.endCol)),
  );
  const ec = Math.max(
    1,
    Math.floor(Math.max(selection.startCol, selection.endCol)),
  );

  const from = `${toExcelColName(sc)}${sr}`;
  const to = `${toExcelColName(ec)}${er}`;

  return from === to ? from : `${from}:${to}`;
}
