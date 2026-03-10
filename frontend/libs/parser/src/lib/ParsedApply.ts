import { Expose } from 'class-transformer';

import {
  FieldConditionFiltersResult,
  GetModifiedFiltersResult,
  ParsedFilter,
} from './ParsedFilter';
import { ParsedSort } from './ParsedSort';
import { FieldSortOrder, ModifyFilterProps } from './parser';
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
    filter: ParsedFilter | undefined,
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

  public getFieldConditionFilters(
    fieldName: string,
  ): FieldConditionFiltersResult | undefined {
    return this.filter?.getFieldConditionFilters(fieldName);
  }

  /**
   * Returns getModifiedFilters result for the apply filter, or undefined when there is no filter.
   * Use to unify logic: customExpressions.length > 0 means entire filter is custom;
   * otherwise fieldFilters has per-field expression strings for simple filters.
   */
  public getModifiedFiltersResult(
    props?: ModifyFilterProps,
  ): GetModifiedFiltersResult | undefined {
    return this.filter?.getModifiedFiltersResult(props);
  }

  public getFieldFilterExpression(fieldName: string): string | undefined {
    return this.filter?.getFieldFilterExpression(fieldName);
  }

  public getFieldFilterControlRef(
    fieldName: string,
  ): { controlTableName: string; controlFieldName: string }[] {
    return this.filter?.getFieldControlRef(fieldName) ?? [];
  }

  public getFieldListFilterValues(fieldName: string): string[] {
    return this.filter?.getFieldListFilterValues(fieldName) || [];
  }
}
