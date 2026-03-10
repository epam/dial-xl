import { debounceTime, Observable, Subject } from 'rxjs';

import {
  GridData,
  GridTable,
  ViewportEdges,
} from '@frontend/canvas-spreadsheet';
import {
  ExcelPreviewCell,
  GridViewport,
  PreviewExcelDataParams,
} from '@frontend/common';

import { GridBuilder } from '../../../../context/ViewportContext/GridBuilder';
import { ExcelPreviewViewportBuilder } from './ExcelPreviewViewportBuilder';

export const chunkSize = 500;
export const dataUpdateDebounceTime = 50;

export class ExcelPreviewGridData {
  protected _shouldUpdate$: Subject<boolean>;

  protected gridBuilder: GridBuilder;
  protected viewportBuilder: ExcelPreviewViewportBuilder;
  protected previewGridData: GridData;

  constructor() {
    this._shouldUpdate$ = new Subject();

    this.gridBuilder = new GridBuilder(this as any);
    this.viewportBuilder = new ExcelPreviewViewportBuilder();
    this.previewGridData = {};
  }

  get shouldUpdate$(): Observable<boolean> {
    return this._shouldUpdate$.pipe(debounceTime(dataUpdateDebounceTime));
  }

  protected triggerDataUpdate(): void {
    this._shouldUpdate$.next(true);
  }

  public getGridTableStructure(): GridTable[] {
    return this.gridBuilder.getGridTableStructure();
  }

  public saveNewData(cells: ExcelPreviewCell[]) {
    if (!Array.isArray(cells) || cells.length === 0) {
      this.triggerDataUpdate();

      return;
    }

    for (const cell of cells) {
      const row = Math.max(0, Math.floor(cell.row) + 1);
      const col = Math.max(0, Math.floor(cell.column) + 1);

      const rowKey = String(row);
      const colKey = String(col);

      if (!this.previewGridData[rowKey]) {
        this.previewGridData[rowKey] = {};
      }

      this.previewGridData[rowKey][colKey] = {
        col,
        row,
        value: cell.value ?? '',
        startCol: col,
        endCol: col,
        startGroupColOrRow: col,
        endGroupColOrRow: col,
        table: {
          tableName: 'table',
          endCol: col,
          endRow: row,
          startCol: col,
          startRow: row,
          isTableFieldsHeaderHidden: true,
          isTableNameHeaderHidden: true,
          isTableHorizontal: false,
          totalSize: 0,
          hasKeys: false,
          isManual: false,
          fieldNames: [],
        },
      };
    }

    this.triggerDataUpdate();
  }

  public buildViewportsToRequest(
    path: string,
    viewport: GridViewport,
  ): PreviewExcelDataParams | null {
    return this.viewportBuilder.buildPreviewRequest(path, viewport);
  }

  public markViewportRequestSuccess(params: PreviewExcelDataParams) {
    this.viewportBuilder.onRequestSuccess(params);
  }

  public markViewportRequestFailure(params: PreviewExcelDataParams) {
    this.viewportBuilder.onRequestFailure(params);
    this.triggerDataUpdate();
  }

  public toGridData(viewport: ViewportEdges): GridData {
    const result: GridData = {};

    const startRow = Math.max(1, Math.floor(viewport.startRow));
    const endRow = Math.max(startRow, Math.floor(viewport.endRow));
    const startCol = Math.max(1, Math.floor(viewport.startCol));
    const endCol = Math.max(startCol, Math.floor(viewport.endCol));

    for (let r = startRow; r <= endRow; r++) {
      const rowData = this.previewGridData[String(r)];
      if (!rowData) continue;

      for (let c = startCol; c <= endCol; c++) {
        const cell = rowData[String(c)];
        if (!cell) continue;

        const rowKey = String(r);
        if (!result[rowKey]) result[rowKey] = {};
        result[rowKey][String(c)] = cell;
      }
    }

    return result;
  }

  public clearCachedViewports() {
    this.viewportBuilder.clear();
  }

  public clear() {
    this.previewGridData = {};
    this.clearCachedViewports();
  }
}
