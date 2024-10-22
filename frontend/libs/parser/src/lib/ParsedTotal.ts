import {
  FullDSLPlacement,
  TableTotals,
  TotalItem,
  TotalItems,
  TotalType,
} from './parser';

export class ParsedTotal {
  constructor(
    public dslPlacement: FullDSLPlacement | undefined,
    public totals: TableTotals,
    public size: number
  ) {}

  public getFieldTotal(fieldName: string): TotalItems | null {
    return this.totals[fieldName] || null;
  }

  public getFieldTotalByIndex(
    fieldName: string,
    index: number
  ): TotalItem | null {
    const fieldTotal = this.getFieldTotal(fieldName);

    if (!fieldTotal) return null;

    return fieldTotal[index] || null;
  }

  public getTotalByIndex(index: number): TotalItem[] {
    const totals = [];

    for (const fieldName in this.totals) {
      const fieldTotal = this.totals[fieldName];

      if (fieldTotal[index]) {
        totals.push(fieldTotal[index]);
      }
    }

    return totals;
  }

  public getFieldTotalTypes(fieldName: string): TotalType[] {
    const fieldTotals = this.getFieldTotal(fieldName);

    if (!fieldTotals) return [];

    const totalFieldTypes = new Set<TotalType>();

    Object.keys(fieldTotals)
      .map((field) => fieldTotals[parseInt(field)].type)
      .forEach((type) => type && totalFieldTypes.add(type));

    return Array.from(totalFieldTypes);
  }
}
