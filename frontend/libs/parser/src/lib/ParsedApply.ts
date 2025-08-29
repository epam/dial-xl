import { Expose } from 'class-transformer';

import { ParsedConditionFilter, ParsedFilter } from './ParsedFilter';
import { ParsedSort } from './ParsedSort';
import { FieldSortOrder } from './parser';
import { Span } from './Span';

export class ParsedApply {
  @Expose()
  span: Span | undefined;

  @Expose()
  filter: ParsedFilter | undefined;

  @Expose()
  sort: ParsedSort | undefined;

  constructor(
    span: Span | undefined,
    sort: ParsedSort | undefined,
    filter: ParsedFilter | undefined
  ) {
    this.span = span;
    this.sort = sort;
    this.filter = filter;
  }

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

  public getFieldConditionFilter(
    fieldName: string
  ): ParsedConditionFilter | undefined {
    return this.filter?.getFieldConditionFilter(fieldName);
  }

  public getFieldListFilterValues(fieldName: string): string[] {
    return this.filter?.getFieldListFilterValues(fieldName) || [];
  }
}
