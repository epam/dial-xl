import { GridCell, GridData, GridTable } from '@frontend/common';

import { Grid } from '../grid';

// TODO: Remove this service, move all logic to Grid class
export class GridService {
  private api: Grid;
  private gridData: GridData = {};
  private tables: GridTable[] = [];

  constructor(api: Grid) {
    this.api = api;

    this.gridData = {};
    this.api.setData(JSON.parse(JSON.stringify(this.gridData)));
  }

  public setCell(row: number, col: number, cell: GridCell) {
    this.gridData[row][col] = cell;
    this.api.setCell(col, row, cell);
  }

  public setData(data: GridData) {
    this.api.setData(data);
    this.gridData = data;
  }

  public getCellValue(row: number, col: number): GridCell | undefined {
    return this.gridData?.[row]?.[col];
  }

  public getColumnContentMaxSymbols(
    col: number,
    viewportStartRow: number,
    viewportEndRow: number
  ) {
    let max = 0;

    for (let row = viewportStartRow; row < viewportEndRow; row++) {
      const cell = this.getCellValue(row, col);

      max = Math.max(max, cell?.value?.length || 0);
    }

    return max;
  }

  public getMaxRow(): number {
    return 100000;
  }

  public setTableStructure(tableStructure: GridTable[]) {
    this.tables = tableStructure;
  }

  public getTableStructure(): GridTable[] {
    return this.tables;
  }
}
