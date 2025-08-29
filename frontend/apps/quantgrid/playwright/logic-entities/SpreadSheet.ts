import { Table } from './Table';

export class SpreadSheet {
  private tables: Array<Table>;

  constructor() {
    this.tables = new Array<Table>(0);
  }

  public addTable(table: Table) {
    this.tables.push(table);
  }

  public removeTable(table: Table) {
    const ind = this.tables.findIndex((item) => item === table);
    this.removeTableByIndex(ind);
  }

  public removeTableByIndex(ind: number) {
    this.tables.splice(ind, 1);
  }

  public removeTableByName(name: string) {
    const ind = this.tables.findIndex((item) => item.getName() === name);
    this.removeTableByIndex(ind);
  }

  public toDsl() {
    let result = '';
    for (const table of this.tables) {
      result += table.toDsl();
      result += '\n';
    }

    return result;
  }

  public getTable(ind: number) {
    return this.tables[ind];
  }

  public getTables() {
    return this.tables;
  }
}
