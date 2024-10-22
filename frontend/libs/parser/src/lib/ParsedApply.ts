import { NumericFilter, ParsedFilter } from './ParsedFilter';
import { ParsedSort } from './ParsedSort';
import { FieldSortOrder, FullDSLPlacement } from './parser';

export class ParsedApply {
  constructor(
    public dslPlacement: FullDSLPlacement | undefined,
    public sort: ParsedSort | undefined,
    public filter: ParsedFilter | undefined
  ) {}

  public getFieldSortOrder(fieldName: string): FieldSortOrder {
    if (!this.sort) return null;

    return this.sort.getFieldSortOrder(fieldName);
  }

  public isFieldUsedInSort(fieldName: string): boolean {
    return this.sort?.isFieldUsedInSort(fieldName) || false;
  }

  public isFieldFiltered(fieldName: string): boolean {
    return this.filter?.hasFieldFilter(fieldName) || false;
  }

  public getFieldNumericFilterValue(
    fieldName: string
  ): NumericFilter | undefined {
    return this.filter?.getFieldNumericFilterValue(fieldName);
  }

  public getFieldTextFilterValues(fieldName: string): string[] {
    return this.filter?.getFieldTextFilterValues(fieldName) || [];
  }
}
