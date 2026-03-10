import { ParsedFilter } from '../ParsedFilter';
import { FilterOperator } from '../parser';
import { SheetReader } from '../SheetReader';

function createParsedFilter(formulaText: string): ParsedFilter {
  const parsed = SheetReader.parseFormula(formulaText);

  return new ParsedFilter(
    undefined,
    undefined,
    parsed.errors.length === 0 ? parsed.expression : undefined,
    formulaText,
  );
}

describe('ParsedFilter.getFieldConditionFilters', () => {
  describe('when parsedExpression is missing', () => {
    it('returns undefined when parsedExpression is undefined', () => {
      const filter = new ParsedFilter(undefined, undefined, undefined, '');

      expect(filter.getFieldConditionFilters('a')).toBeUndefined();
    });

    it('returns undefined when formula fails to parse', () => {
      const filter = createParsedFilter('invalid ( formula');

      expect(filter.getFieldConditionFilters('a')).toBeUndefined();
    });
  });

  describe('when field is not in filter', () => {
    it('returns undefined when asking for a different field', () => {
      const filter = createParsedFilter('[a] = 1');

      expect(filter.getFieldConditionFilters('b')).toBeUndefined();
    });
  });

  describe('binary operator conditions', () => {
    it('returns equals condition for [field] = value', () => {
      const filter = createParsedFilter('[a] = 1');

      const result = filter.getFieldConditionFilters('a');

      expect(result?.filters).toEqual([
        { operator: FilterOperator.Equals, value: '1' },
      ]);
    });

    it('returns condition for [field] = string value', () => {
      const filter = createParsedFilter('[name] = "hello"');

      const result = filter.getFieldConditionFilters('name');

      expect(result?.filters).toEqual([
        { operator: FilterOperator.Equals, value: 'hello' },
      ]);
    });

    it('returns not-equals condition for [field] <> value', () => {
      const filter = createParsedFilter('[a] <> 2');

      const result = filter.getFieldConditionFilters('a');

      expect(result?.filters).toEqual([
        { operator: FilterOperator.NotEquals, value: '2' },
      ]);
    });

    it('returns greater-than condition for [field] > value', () => {
      const filter = createParsedFilter('[x] > 10');

      const result = filter.getFieldConditionFilters('x');

      expect(result?.filters).toEqual([
        { operator: FilterOperator.GreaterThan, value: '10' },
      ]);
    });

    it('returns greater-than-or-equal for [field] >= value', () => {
      const filter = createParsedFilter('[x] >= 5');

      const result = filter.getFieldConditionFilters('x');

      expect(result?.filters).toEqual([
        { operator: FilterOperator.GreaterThanOrEqual, value: '5' },
      ]);
    });

    it('returns less-than condition for [field] < value', () => {
      const filter = createParsedFilter('[x] < 100');

      const result = filter.getFieldConditionFilters('x');

      expect(result?.filters).toEqual([
        { operator: FilterOperator.LessThan, value: '100' },
      ]);
    });

    it('returns less-than-or-equal for [field] <= value', () => {
      const filter = createParsedFilter('[x] <= 0');

      const result = filter.getFieldConditionFilters('x');

      expect(result?.filters).toEqual([
        { operator: FilterOperator.LessThanOrEqual, value: '0' },
      ]);
    });

    it('handles value on left side: value = [field]', () => {
      const filter = createParsedFilter('1 = [a]');

      const result = filter.getFieldConditionFilters('a');

      expect(result?.filters).toEqual([
        { operator: FilterOperator.Equals, value: '1' },
      ]);
    });

    it('returns value null when Equals RHS is an expression (e.g. [Column2] = 3 MOD 2)', () => {
      const filter = createParsedFilter('[Column2] = 3 MOD 2');

      const result = filter.getFieldConditionFilters('Column2');

      expect(result?.filters).toEqual([
        { operator: FilterOperator.Equals, value: null },
      ]);
    });
  });

  describe('CONTAINS', () => {
    it('returns contains condition for CONTAINS([field], "substring")', () => {
      const filter = createParsedFilter('CONTAINS([name], "abc")');

      const result = filter.getFieldConditionFilters('name');

      expect(result?.filters).toEqual([
        { operator: FilterOperator.Contains, value: 'abc' },
      ]);
    });
  });

  describe('NOT CONTAINS', () => {
    it('returns notContains condition for NOT CONTAINS([field], "x")', () => {
      const filter = createParsedFilter('NOT CONTAINS([name], "x")');

      const result = filter.getFieldConditionFilters('name');

      expect(result?.filters).toEqual([
        { operator: FilterOperator.NotContains, value: 'x' },
      ]);
    });
  });

  describe('BETWEEN', () => {
    it('returns between condition with value and secondaryValue', () => {
      const filter = createParsedFilter('BETWEEN([amount], 1, 10)');

      const result = filter.getFieldConditionFilters('amount');

      expect(result?.filters).toEqual([
        {
          operator: FilterOperator.Between,
          value: '1',
          secondaryValue: '10',
        },
      ]);
    });
  });

  describe('custom functions (e.g. IN)', () => {
    it('returns undefined for IN([field], list) so UI shows custom formula (unified with getModifiedFilters)', () => {
      const filter = createParsedFilter('IN([status], { "a", "b", "c" })');

      const result = filter.getFieldConditionFilters('status');

      expect(result).toBeUndefined();
    });

    it('returns undefined for unhandled function so UI shows custom formula (unified with getModifiedFilters)', () => {
      const filter = createParsedFilter('SOMECUSTOM([x], 1)');

      const result = filter.getFieldConditionFilters('x');

      expect(result).toBeUndefined();
    });
  });

  describe('LEFT/RIGHT (beginsWith/endsWith)', () => {
    it('returns beginsWith when LEFT([field], n) = "prefix"', () => {
      const filter = createParsedFilter('LEFT([code], 2) = "AB"');

      const result = filter.getFieldConditionFilters('code');

      expect(result?.filters).toEqual([
        { operator: FilterOperator.BeginsWith, value: 'AB' },
      ]);
    });

    it('returns endsWith when RIGHT([field], n) = "suffix"', () => {
      const filter = createParsedFilter('RIGHT([code], 3) = "xyz"');

      const result = filter.getFieldConditionFilters('code');

      expect(result?.filters).toEqual([
        { operator: FilterOperator.EndsWith, value: 'xyz' },
      ]);
    });
  });

  describe('AND/OR combinations', () => {
    it('returns single condition when field appears in one branch of AND', () => {
      const filter = createParsedFilter('[a] = 1 AND [b] = 2');

      const result = filter.getFieldConditionFilters('b');

      expect(result?.filters).toEqual([
        { operator: FilterOperator.Equals, value: '2' },
      ]);
    });

    it('returns multiple conditions when same field appears in OR', () => {
      const filter = createParsedFilter('[x] = 1 OR [x] = 2');

      const result = filter.getFieldConditionFilters('x');

      expect(result?.filters).toHaveLength(2);
      expect(result?.filters).toEqual(
        expect.arrayContaining([
          { operator: FilterOperator.Equals, value: '1' },
          { operator: FilterOperator.Equals, value: '2' },
        ]),
      );
    });

    it('returns condition for requested field only in multi-field filter', () => {
      const filter = createParsedFilter('[a] = 1 AND [b] <> "y" AND [c] > 0');

      const result = filter.getFieldConditionFilters('b');

      expect(result?.filters).toEqual([
        { operator: FilterOperator.NotEquals, value: 'y' },
      ]);
    });

    it('returns condition filters for AND of IF(ISNA(...), TRUE/FALSE, ...) per column (not custom)', () => {
      const filter = createParsedFilter(
        'IF(ISNA([Column3]),TRUE,[Column3] <> 1) AND IF(ISNA([Column2]),FALSE,[Column2] <> 37622)',
      );

      const column3Result = filter.getFieldConditionFilters('Column3');
      const column2Result = filter.getFieldConditionFilters('Column2');

      expect(column3Result).toBeDefined();
      expect(column3Result?.filters).toHaveLength(1);
      expect(column3Result!.filters[0].operator).toBe('<>');
      expect(column3Result!.filters[0].value).toBe('1');
      expect(column3Result?.hasNaWrapper).toBe(true);

      expect(column2Result).toBeDefined();
      expect(column2Result?.filters).toHaveLength(1);
      expect(column2Result!.filters[0].operator).toBe('<>');
      expect(column2Result!.filters[0].value).toBe('37622');
      expect(column2Result?.hasNaWrapper).toBe(true);
    });
  });

  describe('hasFieldFilter', () => {
    it('returns true for both fields when filter is custom expression [a] > [b]', () => {
      const filter = createParsedFilter('[a] > [b]');

      expect(filter.hasFieldFilter('a')).toBe(true);
      expect(filter.hasFieldFilter('b')).toBe(true);
    });

    it('returns false for field not in custom expression', () => {
      const filter = createParsedFilter('[a] > [b]');

      expect(filter.hasFieldFilter('c')).toBe(false);
    });

    it('returns true for Column2 when filter is [Column2] = Table6[Column1 control] (control reference)', () => {
      const filter = createParsedFilter('[Column2] = Table6[Column1 control]');

      expect(filter.hasFieldFilter('Column2')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('returns undefined for empty string field name when filter has no such field', () => {
      const filter = createParsedFilter('[a] = 1');

      expect(filter.getFieldConditionFilters('')).toBeUndefined();
    });

    it('handles field name with spaces when used in filter', () => {
      const filter = createParsedFilter('[my field] = 1');

      const result = filter.getFieldConditionFilters('my field');

      expect(result?.filters).toEqual([
        { operator: FilterOperator.Equals, value: '1' },
      ]);
    });
  });

  describe('hasNaWrapper in getFieldConditionFilters result', () => {
    it('returns hasNaWrapper true and naIncluded true for IF(ISNA([field]), TRUE, ...)', () => {
      const filter = createParsedFilter(
        'IF(ISNA([Column3]),TRUE,[Column3] <> 1)',
      );

      const result = filter.getFieldConditionFilters('Column3');

      expect(result?.hasNaWrapper).toBe(true);
      expect(result?.naIncluded).toBe(true);
    });

    it('returns hasNaWrapper true and naIncluded false for IF(ISNA([field]), FALSE, ...)', () => {
      const filter = createParsedFilter(
        'IF(ISNA([Column2]),FALSE,[Column2] <> 37622)',
      );

      const result = filter.getFieldConditionFilters('Column2');

      expect(result?.hasNaWrapper).toBe(true);
      expect(result?.naIncluded).toBe(false);
    });

    it('returns hasNaWrapper true and naIncluded false for IF(ISNA([Column2]),FALSE,TRUE) (exclude NA only, value mode)', () => {
      const filter = createParsedFilter('IF(ISNA([Column2]),FALSE,TRUE)');

      const result = filter.getFieldConditionFilters('Column2');

      expect(result).toBeDefined();
      expect(result?.hasNaWrapper).toBe(true);
      expect(result?.naIncluded).toBe(false);
      expect(result?.filters).toEqual([]);
    });

    it('returns hasNaWrapper false and no naIncluded for simple comparison', () => {
      const filter = createParsedFilter('[a] <> 1');

      const result = filter.getFieldConditionFilters('a');

      expect(result?.hasNaWrapper).toBe(false);
      expect(result?.naIncluded).toBeUndefined();
    });
  });
});
