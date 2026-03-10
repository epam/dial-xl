import { SheetReader } from '../../SheetReader';
import {
  FieldControlRef,
  getFieldControlRefFromFilter,
} from '../findFieldControlRefInFilter';

function parse(
  formulaText: string,
): ReturnType<typeof SheetReader.parseFormula> {
  return SheetReader.parseFormula(formulaText);
}

function getExpression(formulaText: string) {
  const parsed = parse(formulaText);

  return parsed.errors.length === 0 ? parsed.expression : undefined;
}

describe('getFieldControlRefFromFilter', () => {
  describe('when parsedExpression is missing', () => {
    it('returns empty array when parsedExpression is undefined', () => {
      expect(getFieldControlRefFromFilter(undefined, 'status')).toEqual([]);
    });

    it('returns empty array when formula fails to parse', () => {
      const expression = getExpression('invalid ( formula');
      expect(getFieldControlRefFromFilter(expression, 'a')).toEqual([]);
    });
  });

  describe('when field is not in filter', () => {
    it('returns empty array when asking for a different field', () => {
      const expression = getExpression('[a] = Controls[Selected]');
      expect(getFieldControlRefFromFilter(expression, 'b')).toEqual([]);
    });
  });

  describe('binary operator [field] = Table[ControlField]', () => {
    it('returns control ref when field is on left: [field] = Table[ControlField]', () => {
      const expression = getExpression('[status] = Controls[Selected]');
      const result = getFieldControlRefFromFilter(expression, 'status');

      expect(result).toEqual<FieldControlRef[]>([
        { controlTableName: 'Controls', controlFieldName: 'Selected' },
      ]);
    });

    it('returns control ref when field is on right: Table[ControlField] = [field]', () => {
      const expression = getExpression('Controls[Selected] = [status]');
      const result = getFieldControlRefFromFilter(expression, 'status');

      expect(result).toEqual<FieldControlRef[]>([
        { controlTableName: 'Controls', controlFieldName: 'Selected' },
      ]);
    });

    it('returns table name as parsed for quoted multi-word table', () => {
      const expression = getExpression("[status] = 'My Table'[Selected]");
      const result = getFieldControlRefFromFilter(expression, 'status');

      expect(result).toEqual<FieldControlRef[]>([
        { controlTableName: "'My Table'", controlFieldName: 'Selected' },
      ]);
    });

    it('strips brackets from field name', () => {
      const expression = getExpression('[status] = Controls[Selected]');
      const result = getFieldControlRefFromFilter(expression, 'status');

      expect(result[0].controlFieldName).toBe('Selected');
    });

    it('returns empty array when right side is not a table reference', () => {
      const expression = getExpression('[status] = 1');
      expect(getFieldControlRefFromFilter(expression, 'status')).toEqual([]);
    });

    it('returns empty array when right side is literal string', () => {
      const expression = getExpression('[status] = "active"');
      expect(getFieldControlRefFromFilter(expression, 'status')).toEqual([]);
    });
  });

  describe('IN([field], Table[ControlField])', () => {
    it('returns control ref for IN([field], Table[ControlField])', () => {
      const expression = getExpression('IN([status], Controls[Selected])');
      const result = getFieldControlRefFromFilter(expression, 'status');

      expect(result).toEqual<FieldControlRef[]>([
        { controlTableName: 'Controls', controlFieldName: 'Selected' },
      ]);
    });

    it('matches IN case-insensitively', () => {
      const expression = getExpression('in([status], Controls[Selected])');
      const result = getFieldControlRefFromFilter(expression, 'status');

      expect(result).toEqual<FieldControlRef[]>([
        { controlTableName: 'Controls', controlFieldName: 'Selected' },
      ]);
    });

    it('returns empty array when second argument is not a table reference', () => {
      const expression = getExpression('IN([status], { "a", "b" })');
      expect(getFieldControlRefFromFilter(expression, 'status')).toEqual([]);
    });
  });

  describe('multiple occurrences', () => {
    it('returns one ref per match when same control appears in OR', () => {
      const expression = getExpression(
        '[status] = Controls[Selected] OR [status] = Controls[Selected]',
      );
      const result = getFieldControlRefFromFilter(expression, 'status');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        controlTableName: 'Controls',
        controlFieldName: 'Selected',
      });
      expect(result[1]).toEqual(result[0]);
    });

    it('returns one ref for requested field only in AND', () => {
      const expression = getExpression(
        '[a] = 1 AND [status] = Controls[Selected] AND [b] = Other[X]',
      );
      const result = getFieldControlRefFromFilter(expression, 'status');

      expect(result).toEqual<FieldControlRef[]>([
        { controlTableName: 'Controls', controlFieldName: 'Selected' },
      ]);
    });

    it('returns 2 refs for requested field with IN and equal', () => {
      const expression = getExpression(
        '[a] = 1 AND [status] = Controls[Selected] AND [b] = Other[X] AND IN([status], Controls2[Selected])',
      );
      const result = getFieldControlRefFromFilter(expression, 'status');

      expect(result).toHaveLength(2);
      expect(result).toEqual<FieldControlRef[]>([
        { controlTableName: 'Controls', controlFieldName: 'Selected' },
        { controlTableName: 'Controls2', controlFieldName: 'Selected' },
      ]);
    });
  });
});
