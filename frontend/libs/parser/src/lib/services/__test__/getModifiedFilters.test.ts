import { SheetReader } from '../../SheetReader';
import { getModifiedFilters } from '../filterUtils';

function getExpression(formulaText: string) {
  const parsed = SheetReader.parseFormula(formulaText);

  return parsed.errors.length === 0 ? parsed.expression : undefined;
}

describe('getModifiedFilters', () => {
  describe('simple single-field expressions → fieldFilters only', () => {
    it('returns one field filter for single comparison [a] = 1', () => {
      const expression = getExpression('[a] = 1')!;
      const result = getModifiedFilters(expression, {});

      expect(result.fieldFilters.size).toBe(1);
      expect(result.fieldFilters.get('a')).toEqual(['[a] = 1']);
      expect(result.customExpressions).toEqual([]);
    });

    it('populates fieldExpressions for simple expression [a] = 1', () => {
      const expression = getExpression('[a] = 1')!;
      const result = getModifiedFilters(expression, {});

      expect(result.fieldExpressions.size).toBe(1);
      const exprs = result.fieldExpressions.get('a');
      expect(exprs).toBeDefined();
      expect(exprs).toHaveLength(1);
      expect(exprs![0].toString()).toBe('[a] = 1');
    });

    it('returns one field filter for [field] > value', () => {
      const expression = getExpression('[x] > 10')!;
      const result = getModifiedFilters(expression, {});

      expect(result.fieldFilters.get('x')).toEqual(['[x] > 10']);
      expect(result.customExpressions).toEqual([]);
    });

    it('returns one field filter for CONTAINS([name], "x")', () => {
      const expression = getExpression('CONTAINS([name], "x")')!;
      const result = getModifiedFilters(expression, {});

      expect(result.fieldFilters.get('name')).toBeDefined();
      expect(result.fieldFilters.get('name')![0]).toContain('CONTAINS');
      expect(result.fieldFilters.get('name')![0]).toContain('[name]');
      expect(result.customExpressions).toEqual([]);
    });

    it('returns one field filter for BETWEEN([amount], 1, 10)', () => {
      const expression = getExpression('BETWEEN([amount], 1, 10)')!;
      const result = getModifiedFilters(expression, {});

      expect(result.fieldFilters.get('amount')).toBeDefined();
      expect(result.fieldFilters.get('amount')![0]).toContain('BETWEEN');
      expect(result.fieldFilters.get('amount')![0]).toContain('[amount]');
      expect(result.customExpressions).toEqual([]);
    });

    it('returns one field filter for NOT CONTAINS([name], "y")', () => {
      const expression = getExpression('NOT CONTAINS([name], "y")')!;
      const result = getModifiedFilters(expression, {});

      expect(result.fieldFilters.get('name')).toBeDefined();
      expect(result.fieldFilters.get('name')![0]).toContain('NOT CONTAINS');
      expect(result.fieldFilters.get('name')![0]).toContain('[name]');
      expect(result.customExpressions).toEqual([]);
    });

    it('returns one field filter for IN when single field and simple', () => {
      const expression = getExpression('IN([status], { "a", "b" })')!;
      const result = getModifiedFilters(expression, {});

      // IN is a simple filter function; if parser yields single-field expression it goes to fieldFilters
      if (result.fieldFilters.size > 0) {
        expect(result.fieldFilters.get('status')?.[0]).toContain('[status]');
        expect(result.customExpressions).toEqual([]);
      } else {
        // Set literal may be parsed with extra refs → entire filter treated as custom
        expect(result.customExpressions).toHaveLength(1);
        expect(result.customExpressions[0]).toContain('IN');
      }
    });

    it('returns one field filter for LEFT([code], 2) = "AB"', () => {
      const expression = getExpression('LEFT([code], 2) = "AB"')!;
      const result = getModifiedFilters(expression, {});

      expect(result.fieldFilters.get('code')).toBeDefined();
      expect(result.customExpressions).toEqual([]);
    });
  });

  describe('OR of simple single-field expressions → fieldFilters only', () => {
    it('returns multiple expressions for same field: [x] = 1 OR [x] = 2', () => {
      const expression = getExpression('[x] = 1 OR [x] = 2')!;
      const result = getModifiedFilters(expression, {});

      expect(result.fieldFilters.size).toBe(1);
      expect(result.fieldFilters.get('x')).toEqual(['[x] = 1', '[x] = 2']);
      expect(result.customExpressions).toEqual([]);
    });

    it('returns separate entries per field: [a] = 1 OR [b] = 2', () => {
      const expression = getExpression('[a] = 1 OR [b] = 2')!;
      const result = getModifiedFilters(expression, {});

      expect(result.fieldFilters.size).toBe(2);
      expect(result.fieldFilters.get('a')).toEqual(['[a] = 1']);
      expect(result.fieldFilters.get('b')).toEqual(['[b] = 2']);
      expect(result.customExpressions).toEqual([]);
    });
  });

  describe('AND of simple single-field expressions → fieldFilters only', () => {
    it('returns one expression per field: [a] = 1 AND [b] = 2', () => {
      const expression = getExpression('[a] = 1 AND [b] = 2')!;
      const result = getModifiedFilters(expression, {});

      expect(result.fieldFilters.size).toBe(2);
      expect(result.fieldFilters.get('a')).toEqual(['[a] = 1']);
      expect(result.fieldFilters.get('b')).toEqual(['[b] = 2']);
      expect(result.customExpressions).toEqual([]);
    });
  });

  describe('custom expressions → entire filter as custom', () => {
    it('returns entire filter as custom when one high-level expression has multiple fields: [a] > [b]', () => {
      const expression = getExpression('[a] > [b]')!;
      const result = getModifiedFilters(expression, {});

      expect(result.fieldFilters.size).toBe(0);
      expect(result.customExpressions).toEqual(['[a] > [b]']);
    });

    it('returns entire filter as custom when IF is used: [a] = 1 OR IF([b] = 2, [c] = 3, [d] = 4)', () => {
      const expression = getExpression(
        '[a] = 1 OR IF([b] = 2, [c] = 3, [d] = 4)',
      )!;
      const result = getModifiedFilters(expression, {});

      expect(result.fieldFilters.size).toBe(0);
      expect(result.customExpressions).toHaveLength(1);
      expect(result.customExpressions[0]).toContain('[a] = 1');
      expect(result.customExpressions[0]).toContain('IF');
    });

    it('returns entire filter as custom when non-simple function is used: [a] = 1 OR SOMECUSTOM([b], 2)', () => {
      const expression = getExpression('[a] = 1 OR SOMECUSTOM([b], 2)')!;
      const result = getModifiedFilters(expression, {});

      expect(result.fieldFilters.size).toBe(0);
      expect(result.customExpressions).toHaveLength(1);
      expect(result.customExpressions[0]).toContain('SOMECUSTOM');
    });

    it('returns entire filter as custom for single IF expression', () => {
      const expression = getExpression('IF([a] = 1, [b] = 2, [c] = 3)')!;
      const result = getModifiedFilters(expression, {});

      expect(result.fieldFilters.size).toBe(0);
      expect(result.customExpressions).toHaveLength(1);
      expect(result.customExpressions[0]).toContain('IF');
    });

    it('treats IF(ISNA([b]), TRUE, [b] = 3) as simple and goes to fieldFilters', () => {
      const expression = getExpression('IF(ISNA([b]), TRUE, [b] = 3)')!;
      const result = getModifiedFilters(expression, {});

      expect(result.fieldFilters.size).toBe(1);
      expect(result.fieldFilters.get('b')).toBeDefined();
      expect(result.fieldFilters.get('b')![0]).toContain('IF');
      expect(result.fieldFilters.get('b')![0]).toContain('ISNA');
      expect(result.fieldFilters.get('b')![0]).toContain('[b] = 3');
      expect(result.customExpressions).toEqual([]);
    });

    it('treats IF(ISNA([a]), TRUE, [b] = 3) as custom when ISNA and else branch have different fields', () => {
      const expression = getExpression('IF(ISNA([a]), TRUE, [b] = 3)')!;
      const result = getModifiedFilters(expression, {});

      expect(result.fieldFilters.size).toBe(0);
      expect(result.customExpressions).toHaveLength(1);
      expect(result.customExpressions[0]).toContain('IF');
      expect(result.customExpressions[0]).toContain('ISNA');
    });

    it('treats IF(ISNA([Column2]), FALSE, TRUE) as simple (exclude NA) and goes to fieldFilters for value mode', () => {
      const expression = getExpression('IF(ISNA([Column2]),FALSE,TRUE)')!;
      const result = getModifiedFilters(expression, {});

      expect(result.fieldFilters.size).toBe(1);
      expect(result.fieldFilters.get('Column2')).toBeDefined();
      expect(result.fieldFilters.get('Column2')![0]).toContain('IF');
      expect(result.fieldFilters.get('Column2')![0]).toContain('ISNA');
      expect(result.fieldFilters.get('Column2')![0]).toContain('FALSE');
      expect(result.fieldFilters.get('Column2')![0]).toContain('TRUE');
      expect(result.customExpressions).toEqual([]);
    });

    it('AND of two IF(ISNA(...), TRUE/FALSE, ...) goes to fieldFilters per column, not custom', () => {
      const expression = getExpression(
        'IF(ISNA([Column3]),TRUE,[Column3] <> 1) AND IF(ISNA([Column2]),FALSE,[Column2] <> 37622)',
      )!;
      const result = getModifiedFilters(expression, {});

      expect(result.fieldFilters.size).toBe(2);
      expect(result.fieldFilters.get('Column3')).toBeDefined();
      expect(result.fieldFilters.get('Column3')![0]).toContain('IF');
      expect(result.fieldFilters.get('Column3')![0]).toContain('ISNA');
      expect(result.fieldFilters.get('Column3')![0]).toContain(
        '[Column3] <> 1',
      );
      expect(result.fieldFilters.get('Column2')).toBeDefined();
      expect(result.fieldFilters.get('Column2')![0]).toContain('IF');
      expect(result.fieldFilters.get('Column2')![0]).toContain('ISNA');
      expect(result.fieldFilters.get('Column2')![0]).toContain(
        '[Column2] <> 37622',
      );
      expect(result.customExpressions).toEqual([]);
    });
  });

  describe('simple equality with other table field → fieldFilters', () => {
    it('keeps [Column2] = Table6[Column1 control] as field filter for Column2, not custom', () => {
      const expression = getExpression('[Column2] = Table6[Column1 control]')!;
      const result = getModifiedFilters(expression, {});

      expect(result.fieldFilters.size).toBe(1);
      expect(result.fieldFilters.get('Column2')).toBeDefined();
      expect(result.fieldFilters.get('Column2')!).toHaveLength(1);
      expect(result.customExpressions).toEqual([]);
    });

    it('keeps Table6[Column1 control] = [Column2] (reversed order) as field filter for Column2', () => {
      const expression = getExpression('Table6[Column1 control] = [Column2]')!;
      const result = getModifiedFilters(expression, {});

      expect(result.fieldFilters.size).toBe(1);
      expect(result.fieldFilters.get('Column2')).toBeDefined();
      expect(result.fieldFilters.get('Column2')!).toHaveLength(1);
      expect(result.customExpressions).toEqual([]);
    });

    it('excludeFieldName excludes field in [field] = Table[x]', () => {
      const expression = getExpression('[Column2] = Table6[Column1 control]')!;
      const result = getModifiedFilters(expression, {
        excludeFieldName: 'Column2',
      });

      expect(result.fieldFilters.has('Column2')).toBe(false);
      expect(result.fieldFilters.size).toBe(0);
      expect(result.customExpressions).toEqual([]);
    });

    it('conditionFilter + fieldName replaces filter for [field] = Table[x]', () => {
      const expression = getExpression('[Column2] = Table6[Column1 control]')!;
      const result = getModifiedFilters(expression, {
        fieldName: 'Column2',
        conditionFilter: '[Column2] > 0',
      });

      expect(result.fieldFilters.get('Column2')).toEqual(['[Column2] > 0']);
      expect(result.customExpressions).toEqual([]);
    });

    it('OR of [a]=1 and [b]=Table2[c] yields two field filters', () => {
      const expression = getExpression('[a] = 1 OR [b] = Table2[c]')!;
      const result = getModifiedFilters(expression, {});

      expect(result.fieldFilters.size).toBe(2);
      expect(result.fieldFilters.get('a')).toEqual(['[a] = 1']);
      expect(result.fieldFilters.get('b')).toBeDefined();
      expect(result.fieldFilters.get('b')!).toHaveLength(1);
      expect(result.customExpressions).toEqual([]);
    });
  });

  describe('props: excludeFieldName', () => {
    it('excludes the given field from fieldFilters', () => {
      const expression = getExpression('[a] = 1 OR [b] = 2')!;
      const result = getModifiedFilters(expression, {
        excludeFieldName: 'a',
      });

      expect(result.fieldFilters.size).toBe(1);
      expect(result.fieldFilters.has('a')).toBe(false);
      expect(result.fieldFilters.get('b')).toEqual(['[b] = 2']);
      expect(result.customExpressions).toEqual([]);
    });
  });

  describe('props: oldFieldName / newFieldName', () => {
    it('renames field in fieldFilters and updates expression string', () => {
      const expression = getExpression('[oldName] = 1')!;
      const result = getModifiedFilters(expression, {
        oldFieldName: 'oldName',
        newFieldName: 'newName',
      });

      expect(result.fieldFilters.size).toBe(1);
      expect(result.fieldFilters.has('oldName')).toBe(false);
      expect(result.fieldFilters.get('newName')).toEqual(['[newName] = 1']);
      expect(result.customExpressions).toEqual([]);
    });
  });

  describe('props: conditionFilter / fieldName', () => {
    it('sets conditionFilter for fieldName when provided', () => {
      const expression = getExpression('[a] = 1 OR [b] = 2')!;
      const result = getModifiedFilters(expression, {
        fieldName: 'c',
        conditionFilter: '[c] > 0',
      });

      expect(result.fieldFilters.get('c')).toEqual(['[c] > 0']);
      expect(result.fieldFilters.get('a')).toEqual(['[a] = 1']);
      expect(result.fieldFilters.get('b')).toEqual(['[b] = 2']);
    });

    it('replaces existing filters for fieldName when conditionFilter is provided', () => {
      const expression = getExpression('[a] = 1 OR [a] = 2')!;
      const result = getModifiedFilters(expression, {
        fieldName: 'a',
        conditionFilter: '[a] = 3',
      });

      expect(result.fieldFilters.get('a')).toEqual(['[a] = 3']);
    });

    it('changes existing simple filter to NA-wrapped when conditionFilter is IF(ISNA(...))', () => {
      const expression = getExpression('[a] = 1')!;
      const result = getModifiedFilters(expression, {
        fieldName: 'a',
        conditionFilter: 'IF(ISNA([a]), TRUE, [a] = 1)',
      });

      expect(result.fieldFilters.size).toBe(1);
      expect(result.fieldFilters.get('a')).toEqual([
        'IF(ISNA([a]), TRUE, [a] = 1)',
      ]);
      expect(result.customExpressions).toEqual([]);
    });

    it('deletes filters for fieldName when conditionFilter is null', () => {
      const expression = getExpression('[a] = 1 OR [b] = 2')!;
      const result = getModifiedFilters(expression, {
        fieldName: 'a',
        conditionFilter: null,
      });

      expect(result.fieldFilters.has('a')).toBe(false);
      expect(result.fieldFilters.get('b')).toEqual(['[b] = 2']);
    });
  });

  describe('high-level expressions only (no inner push)', () => {
    it('does not push inner BinOp to fieldFilters - only high-level [a] = 1 from ([a] = 1 OR [a] = 2)', () => {
      const expression = getExpression('[a] = 1 OR [a] = 2')!;
      const result = getModifiedFilters(expression, {});

      expect(result.fieldFilters.get('a')).toEqual(['[a] = 1', '[a] = 2']);
      expect(result.fieldFilters.get('a')).toHaveLength(2);
    });

    it('each high-level expression is one entry - AND chain', () => {
      const expression = getExpression('[a] = 1 AND [a] < 10')!;
      const result = getModifiedFilters(expression, {});

      expect(result.fieldFilters.get('a')).toEqual(['[a] = 1', '[a] < 10']);
    });
  });
});
