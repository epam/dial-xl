import { PreviewExcelDataParams } from '@frontend/common';

import { getExtendedRoundedBorders } from '../../../../context';
import { chunkSize } from './ExcelPreviewGridData';

type GridViewport = {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
};

const minCoordinate = 0;

type BlockRect = {
  rowStartBlock: number;
  rowEndBlock: number;
  colStartBlock: number;
  colEndBlock: number;
};

function blockKey(r: number, c: number): string {
  return `${r}:${c}`;
}

function parseBlockKey(key: string): [number, number] {
  const [r, c] = key.split(':');

  return [Number(r), Number(c)];
}

function getBlockRange(start: number, end: number): [number, number] | null {
  const last = end - 1;
  if (last < start) return null;

  const startBlock = Math.floor(start / chunkSize);
  const endBlock = Math.floor(last / chunkSize);

  return [startBlock, endBlock];
}

function buildRectsFromMissingBlocks(missing: Set<string>): BlockRect[] {
  if (missing.size === 0) return [];

  const rowToCols = new Map<number, number[]>();
  for (const key of missing) {
    const [r, c] = parseBlockKey(key);
    const cols = rowToCols.get(r);
    if (cols) cols.push(c);
    else rowToCols.set(r, [c]);
  }

  const rows = Array.from(rowToCols.keys()).sort((a, b) => a - b);
  for (const r of rows) rowToCols.get(r)!.sort((a, b) => a - b);

  type Segment = { row: number; cStart: number; cEnd: number };
  const segmentsByRow = new Map<number, Segment[]>();

  for (const r of rows) {
    const cols = rowToCols.get(r)!;
    const segments: Segment[] = [];

    let runStart = cols[0];
    let prev = cols[0];

    for (let i = 1; i < cols.length; i++) {
      const c = cols[i];
      if (c === prev + 1) {
        prev = c;
        continue;
      }
      segments.push({ row: r, cStart: runStart, cEnd: prev });
      runStart = c;
      prev = c;
    }

    segments.push({ row: r, cStart: runStart, cEnd: prev });
    segmentsByRow.set(r, segments);
  }

  const rects: BlockRect[] = [];
  const active = new Map<string, BlockRect>();

  for (const r of rows) {
    const segs = segmentsByRow.get(r) ?? [];
    const presentKeys = new Set<string>();

    for (const s of segs) {
      const key = `${s.cStart}:${s.cEnd}`;
      presentKeys.add(key);

      const existing = active.get(key);
      if (existing && existing.rowEndBlock === r - 1) {
        existing.rowEndBlock = r;
      } else {
        active.set(key, {
          rowStartBlock: r,
          rowEndBlock: r,
          colStartBlock: s.cStart,
          colEndBlock: s.cEnd,
        });
      }
    }

    for (const [key, rect] of Array.from(active.entries())) {
      if (!presentKeys.has(key)) {
        rects.push(rect);
        active.delete(key);
      }
    }
  }

  for (const rect of active.values()) rects.push(rect);

  rects.sort((a, b) => {
    const areaA =
      (a.rowEndBlock - a.rowStartBlock + 1) *
      (a.colEndBlock - a.colStartBlock + 1);
    const areaB =
      (b.rowEndBlock - b.rowStartBlock + 1) *
      (b.colEndBlock - b.colStartBlock + 1);

    return areaB - areaA;
  });

  return rects;
}

export class ExcelPreviewViewportBuilder {
  private path: string | null = null;

  private requestedBlocks = new Set<string>();
  private inflightBlocks = new Set<string>();

  buildPreviewRequest(
    path: string,
    viewport: GridViewport,
  ): PreviewExcelDataParams | null {
    if (!path) return null;

    if (this.path !== path) {
      this.clear();
      this.path = path;
    }

    const [startRow, endRow] = getExtendedRoundedBorders(
      Math.max(minCoordinate, viewport.startRow),
      viewport.endRow,
    );
    const [startCol, endCol] = getExtendedRoundedBorders(
      Math.max(minCoordinate, viewport.startCol),
      viewport.endCol,
    );

    const rowBlockRange = getBlockRange(startRow, endRow);
    const colBlockRange = getBlockRange(startCol, endCol);
    if (!rowBlockRange || !colBlockRange) return null;

    const [rowStartBlock, rowEndBlock] = rowBlockRange;
    const [colStartBlock, colEndBlock] = colBlockRange;

    const missing = new Set<string>();
    for (let r = rowStartBlock; r <= rowEndBlock; r++) {
      for (let c = colStartBlock; c <= colEndBlock; c++) {
        const k = blockKey(r, c);
        if (this.requestedBlocks.has(k)) continue;
        if (this.inflightBlocks.has(k)) continue;
        missing.add(k);
      }
    }

    if (missing.size === 0) return null;

    const rect = buildRectsFromMissingBlocks(missing)[0];
    if (!rect) return null;

    for (let r = rect.rowStartBlock; r <= rect.rowEndBlock; r++) {
      for (let c = rect.colStartBlock; c <= rect.colEndBlock; c++) {
        this.inflightBlocks.add(blockKey(r, c));
      }
    }

    return {
      path,
      startRow: rect.rowStartBlock * chunkSize,
      endRow: (rect.rowEndBlock + 1) * chunkSize,
      startCol: rect.colStartBlock * chunkSize,
      endCol: (rect.colEndBlock + 1) * chunkSize,
      suppressErrors: true,
    };
  }

  onRequestSuccess(params: PreviewExcelDataParams) {
    const rowBlockRange = getBlockRange(params.startRow, params.endRow);
    const colBlockRange = getBlockRange(params.startCol, params.endCol);
    if (!rowBlockRange || !colBlockRange) return;

    const [rs, re] = rowBlockRange;
    const [cs, ce] = colBlockRange;

    for (let r = rs; r <= re; r++) {
      for (let c = cs; c <= ce; c++) {
        const k = blockKey(r, c);
        this.inflightBlocks.delete(k);
        this.requestedBlocks.add(k);
      }
    }
  }

  onRequestFailure(params: PreviewExcelDataParams) {
    const rowBlockRange = getBlockRange(params.startRow, params.endRow);
    const colBlockRange = getBlockRange(params.startCol, params.endCol);
    if (!rowBlockRange || !colBlockRange) return;

    const [rs, re] = rowBlockRange;
    const [cs, ce] = colBlockRange;

    for (let r = rs; r <= re; r++) {
      for (let c = cs; c <= ce; c++) {
        this.inflightBlocks.delete(blockKey(r, c));
      }
    }
  }

  clear() {
    this.path = null;
    this.requestedBlocks.clear();
    this.inflightBlocks.clear();
  }
}
