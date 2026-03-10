import {
  FilterOperator,
  naValue,
  ParsedConditionFilter,
} from '@frontend/parser';

import { GridCell, SheetControl } from '../../../../types';
import {
  defaultConditionState,
  DIVIDER_AFTER,
  DIVIDER_BEFORE,
} from '../constants';
import {
  areSelectedValuesEqual,
  getControlOptionValue,
  getInitialConditionState,
  getInitialCustomExpression,
  getInitialMode,
  getInitialSelectedControl,
  getInitialSelectedValues,
  getInitialUnselectedValues,
  isConditionMode,
  isConditionStateEqual,
  isDividerOption,
} from '../utils';

function makeConditionFilters(
  filters: ParsedConditionFilter[],
  hasNaWrapper = false,
  naIncluded?: boolean,
) {
  return { filters, hasNaWrapper, naIncluded };
}

const emptyListFilter: never[] = [];
const fieldName = 'MyField';

function makeListFilter(
  values: string[],
): { value: string; isSelected: boolean }[] {
  return values.map((value) => ({ value, isSelected: true }));
}

function makeCell(overrides: Partial<GridCell['field']> = {}): GridCell {
  return {
    col: 0,
    row: 0,
    startCol: 0,
    endCol: 1,
    startGroupColOrRow: 0,
    endGroupColOrRow: 0,
    field: {
      fieldName: 'MyField',
      expression: '',
      isKey: false,
      isDim: false,
      isNested: false,
      isPeriodSeries: false,
      isDynamic: false,
      isFiltered: false,
      sort: 'none' as const,
      isFieldUsedInSort: false,
      type: 'string' as const,
      format: undefined,
      hasError: false,
      isInput: false,
      isImport: false,
      isIndex: false,
      isControl: false,
      isDescription: false,
      dataLength: 0,
      hasOverrides: false,
      isAIFunctions: false,
      referenceTableName: 'T1',
      ...overrides,
    },
  } as GridCell;
}

function makeSheetControl(
  tableName: string,
  controlFieldName: string,
): SheetControl {
  return {
    tableName,
    fieldName: controlFieldName,
    controlType: 'dropdown' as const,
    controlSourcesTables: [],
  };
}

describe('FilterPanelItem utils', () => {
  describe('isConditionMode', () => {
    it('returns true for mode starting with "condition:"', () => {
      expect(isConditionMode('condition:=')).toBe(true);
      expect(isConditionMode('condition:>')).toBe(true);
      expect(isConditionMode('condition:between')).toBe(true);
    });

    it('returns false for other modes', () => {
      expect(isConditionMode('value')).toBe(false);
      expect(isConditionMode('control')).toBe(false);
      expect(isConditionMode('customFormula')).toBe(false);
      expect(isConditionMode('' as any)).toBe(false);
    });
  });

  describe('getInitialSelectedControl', () => {
    it('returns null when cell is null', () => {
      expect(getInitialSelectedControl(null, [], fieldName)).toBeNull();
    });

    it('returns null when cell has no filterControlRef', () => {
      const cell = makeCell();
      expect(getInitialSelectedControl(cell, [], fieldName)).toBeNull();
    });

    it('returns null when ref does not match any sheet control', () => {
      const cell = makeCell({
        filterControlRef: { controlTableName: 'T1', controlFieldName: 'F1' },
      });
      expect(getInitialSelectedControl(cell, [], fieldName)).toBeNull();
    });

    it('returns the matching sheet control', () => {
      const control = makeSheetControl('T1', 'F1');
      const cell = makeCell({
        filterControlRef: { controlTableName: 'T1', controlFieldName: 'F1' },
      });
      expect(getInitialSelectedControl(cell, [control], fieldName)).toBe(
        control,
      );
    });

    it('returns null when table/field name does not match', () => {
      const control = makeSheetControl('T2', 'F1');
      const cell = makeCell({
        filterControlRef: { controlTableName: 'T1', controlFieldName: 'F1' },
      });
      expect(getInitialSelectedControl(cell, [control], fieldName)).toBeNull();
    });

    it('returns matching control when multiple controls and one matches', () => {
      const control1 = makeSheetControl('T1', 'F1');
      const control2 = makeSheetControl('T2', 'F2');
      const cell = makeCell({
        filterControlRef: { controlTableName: 'T1', controlFieldName: 'F1' },
      });
      expect(
        getInitialSelectedControl(cell, [control1, control2], fieldName),
      ).toBe(control1);
    });
  });

  describe('getInitialMode', () => {
    it('returns "value" when cell is null', () => {
      expect(getInitialMode(null, emptyListFilter, [], fieldName)).toBe(
        'value',
      );
    });

    it('returns "value" when cell has no field', () => {
      const cell = {
        col: 0,
        row: 0,
        startCol: 0,
        endCol: 1,
        startGroupColOrRow: 0,
        endGroupColOrRow: 0,
      } as GridCell;
      expect(getInitialMode(cell, emptyListFilter, [], fieldName)).toBe(
        'value',
      );
    });

    it('returns "value" when field is not filtered', () => {
      const cell = makeCell({ isFiltered: false });
      expect(getInitialMode(cell, emptyListFilter, [], fieldName)).toBe(
        'value',
      );
    });

    it('returns "control" when filterControlRef matches a sheet control', () => {
      const control = makeSheetControl('T1', 'F1');
      const cell = makeCell({
        isFiltered: true,
        filterControlRef: { controlTableName: 'T1', controlFieldName: 'F1' },
      });
      expect(getInitialMode(cell, emptyListFilter, [control], fieldName)).toBe(
        'control',
      );
    });

    it('returns "control" when both filterControlRef and conditionFilters exist (control takes precedence)', () => {
      const control = makeSheetControl('T1', 'F1');
      const cell = makeCell({
        isFiltered: true,
        filterControlRef: { controlTableName: 'T1', controlFieldName: 'F1' },
        conditionFilters: makeConditionFilters([
          { operator: FilterOperator.GreaterThan, value: '10' },
        ]),
      });
      expect(getInitialMode(cell, emptyListFilter, [control], fieldName)).toBe(
        'control',
      );
    });

    it('returns "condition:<operator>" for single non-value condition filter', () => {
      const cell = makeCell({
        isFiltered: true,
        conditionFilters: makeConditionFilters([
          { operator: FilterOperator.GreaterThan, value: '10' },
        ]),
      });
      expect(getInitialMode(cell, emptyListFilter, [], fieldName)).toBe(
        'condition:>',
      );
    });

    it('returns "condition:between" for single Between filter', () => {
      const cell = makeCell({
        isFiltered: true,
        conditionFilters: makeConditionFilters([
          {
            operator: FilterOperator.Between,
            value: '1',
            secondaryValue: '100',
          },
        ]),
      });
      expect(getInitialMode(cell, emptyListFilter, [], fieldName)).toBe(
        'condition:between',
      );
    });

    it('returns "value" when all condition filters are Equals (value filter)', () => {
      const cell = makeCell({
        isFiltered: true,
        conditionFilters: makeConditionFilters([
          { operator: FilterOperator.Equals, value: 'a' },
          { operator: FilterOperator.Equals, value: 'b' },
        ]),
      });
      const listFilter = makeListFilter(['a', 'b']);
      expect(getInitialMode(cell, listFilter, [], fieldName)).toBe('value');
    });

    it('returns "value" when single NotEquals filter references own table', () => {
      const cell = makeCell({
        isFiltered: true,
        referenceTableName: 'T1',
        conditionFilters: makeConditionFilters([
          { operator: FilterOperator.NotEquals, value: 'T1' },
        ]),
      });
      expect(getInitialMode(cell, emptyListFilter, [], fieldName)).toBe(
        'value',
      );
    });

    it('returns "value" when all condition filters are NotEquals (exclude values)', () => {
      const cell = makeCell({
        isFiltered: true,
        fieldName: 'MyField',
        conditionFilters: makeConditionFilters([
          { operator: FilterOperator.NotEquals, value: 'x' },
          { operator: FilterOperator.NotEquals, value: 'y' },
        ]),
      });
      const listFilter = makeListFilter(['x', 'y']);
      expect(getInitialMode(cell, listFilter, [], fieldName)).toBe('value');
    });

    it('returns "customFormula" when Equals filters exist but valueList does not cover them', () => {
      const cell = makeCell({
        isFiltered: true,
        conditionFilters: makeConditionFilters([
          { operator: FilterOperator.Equals, value: 'a' },
          { operator: FilterOperator.Equals, value: 'b' },
        ]),
      });
      expect(getInitialMode(cell, emptyListFilter, [], fieldName)).toBe(
        'customFormula',
      );
    });

    it('returns "value" when filter is IF(ISNA([field]), FALSE, TRUE) (exclude NA only)', () => {
      const cell = makeCell({
        isFiltered: true,
        conditionFilters: makeConditionFilters([], true, false),
      });
      expect(getInitialMode(cell, emptyListFilter, [], fieldName)).toBe(
        'value',
      );
    });

    it('returns "condition:<>" for single NotEquals when value not in valueList', () => {
      const cell = makeCell({
        isFiltered: true,
        fieldName: 'MyField',
        conditionFilters: makeConditionFilters([
          { operator: FilterOperator.NotEquals, value: 'z' },
        ]),
      });
      const listFilter = makeListFilter(['a', 'b']);
      expect(getInitialMode(cell, listFilter, [], fieldName)).toBe(
        'condition:<>',
      );
    });

    it('returns "customFormula" when multiple condition filters and not value-style', () => {
      const cell = makeCell({
        isFiltered: true,
        conditionFilters: makeConditionFilters([
          { operator: FilterOperator.GreaterThan, value: '1' },
          { operator: FilterOperator.LessThan, value: '10' },
        ]),
      });
      expect(getInitialMode(cell, emptyListFilter, [], fieldName)).toBe(
        'customFormula',
      );
    });

    it('returns "customFormula" when no conditionFilters but filterExpression exists', () => {
      const cell = makeCell({
        isFiltered: true,
        conditionFilters: undefined,
        filterExpression: '= [F] > 1',
      });
      expect(getInitialMode(cell, emptyListFilter, [], fieldName)).toBe(
        'customFormula',
      );
    });

    it('returns "customFormula" when conditionFilters length > 1 and not value-style', () => {
      const cell = makeCell({
        isFiltered: true,
        conditionFilters: makeConditionFilters([
          { operator: FilterOperator.Equals, value: 'a' },
          { operator: FilterOperator.GreaterThan, value: '0' },
        ]),
      });
      expect(getInitialMode(cell, emptyListFilter, [], fieldName)).toBe(
        'customFormula',
      );
    });

    it('returns "customFormula" when filterExpression is expression like [Column2] MOD 3', () => {
      const cell = makeCell({
        isFiltered: true,
        conditionFilters: undefined,
        filterExpression: '[Column2] MOD 3 = 1',
      });
      expect(getInitialMode(cell, emptyListFilter, [], fieldName)).toBe(
        'customFormula',
      );
    });

    it('returns condition mode for AND of IF(ISNA(...)) when conditionFilters are set (split per column) and field is not in IF(ISNA)', () => {
      const cell = makeCell({
        isFiltered: true,
        conditionFilters: makeConditionFilters([
          { operator: FilterOperator.NotEquals, value: '1' },
        ]),
        filterExpression:
          'IF(ISNA([Column3]),TRUE,[Column3] <> 1) AND IF(ISNA([Column2]),FALSE,[Column2] <> 37622)',
      });
      expect(getInitialMode(cell, emptyListFilter, [], fieldName)).toBe(
        'condition:<>',
      );
    });

    it('returns "value" when filter is IF(ISNA([field]), TRUE/FALSE, ...) for this field (hasNaWrapper in conditionFilters)', () => {
      const cell = makeCell({
        isFiltered: true,
        conditionFilters: makeConditionFilters(
          [{ operator: FilterOperator.NotEquals, value: '1' }],
          true,
        ),
      });
      expect(getInitialMode(cell, emptyListFilter, [], fieldName)).toBe(
        'value',
      );
    });

    it('returns "value" when filters empty but hasNaWrapper is true (IF(ISNA) from parser)', () => {
      const cell = makeCell({
        isFiltered: true,
        conditionFilters: makeConditionFilters([], true),
      });
      expect(getInitialMode(cell, emptyListFilter, [], fieldName)).toBe(
        'value',
      );
    });

    it('returns "condition:=" when single Equals filter has empty string value ([Column2] = "" is a valid literal)', () => {
      const cell = makeCell({
        isFiltered: true,
        conditionFilters: makeConditionFilters([
          { operator: FilterOperator.Equals, value: '' },
        ]),
      });
      expect(getInitialMode(cell, emptyListFilter, [], fieldName)).toBe(
        'condition:=',
      );
    });

    it('returns "customFormula" when single Equals filter has value null (parser signals non-simple RHS e.g. [Column2] = 3 MOD 2)', () => {
      const cell = makeCell({
        isFiltered: true,
        conditionFilters: makeConditionFilters([
          { operator: FilterOperator.Equals, value: null },
        ]),
        filterExpression: '[Column2] = 3 MOD 2',
      });
      expect(getInitialMode(cell, emptyListFilter, [], fieldName)).toBe(
        'customFormula',
      );
      expect(
        getInitialCustomExpression(cell, emptyListFilter, [], fieldName),
      ).toBe('[Column2] = 3 MOD 2');
    });

    it('returns "customFormula" when single condition filter has operator not in condition options', () => {
      const cell = makeCell({
        isFiltered: true,
        conditionFilters: makeConditionFilters([
          { operator: 'CUSTOM_OP', value: 'x' },
        ]),
      });
      expect(getInitialMode(cell, emptyListFilter, [], fieldName)).toBe(
        'customFormula',
      );
    });

    it('returns "customFormula" when Equals filters exist but valueList only partially matches', () => {
      const cell = makeCell({
        isFiltered: true,
        conditionFilters: makeConditionFilters([
          { operator: FilterOperator.Equals, value: 'a' },
          { operator: FilterOperator.Equals, value: 'b' },
        ]),
      });
      const listFilter = makeListFilter(['a']);
      expect(getInitialMode(cell, listFilter, [], fieldName)).toBe(
        'customFormula',
      );
    });

    it('returns "customFormula" when NotEquals filters exist but valueList missing one excluded value', () => {
      const cell = makeCell({
        isFiltered: true,
        conditionFilters: makeConditionFilters([
          { operator: FilterOperator.NotEquals, value: 'x' },
          { operator: FilterOperator.NotEquals, value: 'y' },
        ]),
      });
      const listFilter = makeListFilter(['x']);
      expect(getInitialMode(cell, listFilter, [], fieldName)).toBe(
        'customFormula',
      );
    });

    it('returns "condition:>" and getInitialCustomExpression returns empty when both conditionFilters and filterExpression are set', () => {
      const cell = makeCell({
        isFiltered: true,
        conditionFilters: makeConditionFilters([
          { operator: FilterOperator.GreaterThan, value: '5' },
        ]),
        filterExpression: '[MyField] > 99',
      });
      expect(getInitialMode(cell, emptyListFilter, [], fieldName)).toBe(
        'condition:>',
      );
      expect(
        getInitialCustomExpression(cell, emptyListFilter, [], fieldName),
      ).toBe('');
    });
  });

  describe('getInitialCustomExpression', () => {
    it('returns empty string when mode is not customFormula', () => {
      const cell = makeCell({ isFiltered: false });
      expect(
        getInitialCustomExpression(cell, emptyListFilter, [], fieldName),
      ).toBe('');
    });

    it('returns filterExpression when mode is customFormula', () => {
      const cell = makeCell({
        isFiltered: true,
        conditionFilters: undefined,
        filterExpression: '= [F] > 1 AND [F] < 10',
      });
      expect(
        getInitialCustomExpression(cell, emptyListFilter, [], fieldName),
      ).toBe('= [F] > 1 AND [F] < 10');
    });

    it('returns empty string when mode is customFormula but filterExpression is undefined', () => {
      const cell = makeCell({
        isFiltered: true,
        conditionFilters: undefined,
        filterExpression: undefined,
      });
      expect(
        getInitialCustomExpression(cell, emptyListFilter, [], fieldName),
      ).toBe('');
    });
  });

  describe('getInitialSelectedValues', () => {
    const filtersEq = [
      { operator: FilterOperator.Equals, value: 'MyField' },
      { operator: FilterOperator.Equals, value: 'a' },
      { operator: FilterOperator.Equals, value: 'b' },
    ];

    it('returns null when mode is not "value"', () => {
      const cell = makeCell({
        isFiltered: true,
        conditionFilters: makeConditionFilters([
          { operator: FilterOperator.GreaterThan, value: '0' },
        ]),
      });
      expect(
        getInitialSelectedValues(
          cell,
          emptyListFilter,
          undefined,
          [],
          fieldName,
        ),
      ).toBeNull();
    });

    it('returns null when filters is undefined', () => {
      const cell = makeCell({
        isFiltered: true,
        fieldName: 'MyField',
        conditionFilters: makeConditionFilters([
          { operator: FilterOperator.Equals, value: 'a' },
        ]),
      });
      expect(
        getInitialSelectedValues(
          cell,
          emptyListFilter,
          undefined,
          [],
          fieldName,
        ),
      ).toBeNull();
    });

    it('returns null when some filter has operator not Equals and value not fieldName', () => {
      const cell = makeCell({
        isFiltered: true,
        fieldName: 'MyField',
        conditionFilters: makeConditionFilters([
          { operator: FilterOperator.Equals, value: 'MyField' },
          { operator: FilterOperator.Equals, value: 'a' },
        ]),
      });
      const badFilters = [
        { operator: FilterOperator.NotEquals, value: 'x' },
        { operator: FilterOperator.Equals, value: 'a' },
      ];
      expect(
        getInitialSelectedValues(
          cell,
          emptyListFilter,
          badFilters,
          [],
          fieldName,
        ),
      ).toBeNull();
    });

    it('returns [] when only one filter and it equals fieldName (select-all)', () => {
      const cell = makeCell({
        isFiltered: true,
        fieldName: 'MyField',
        conditionFilters: makeConditionFilters([
          { operator: FilterOperator.Equals, value: 'MyField' },
        ]),
      });
      const filters = [{ operator: FilterOperator.Equals, value: 'MyField' }];
      const listFilter = makeListFilter(['MyField']);
      expect(
        getInitialSelectedValues(cell, listFilter, filters, [], fieldName),
      ).toEqual([]);
    });

    it('returns selected values excluding fieldName', () => {
      const cell = makeCell({
        isFiltered: true,
        fieldName: 'MyField',
        conditionFilters: makeConditionFilters([
          { operator: FilterOperator.Equals, value: 'MyField' },
          { operator: FilterOperator.Equals, value: 'a' },
          { operator: FilterOperator.Equals, value: 'b' },
        ]),
      });
      const listFilter = makeListFilter(['MyField', 'a', 'b']);
      expect(
        getInitialSelectedValues(cell, listFilter, filtersEq, [], fieldName),
      ).toEqual(['a', 'b']);
    });

    it('returns [naValue] when only NA is selected (hasNaWrapper + naIncluded, no other filters)', () => {
      const cell = makeCell({
        isFiltered: true,
        fieldName: 'MyField',
        conditionFilters: makeConditionFilters([], true, true),
      });
      const listFilter = makeListFilter([naValue]);
      expect(
        getInitialSelectedValues(cell, listFilter, [], [], fieldName),
      ).toEqual([naValue]);
    });

    it('includes naValue in selected when hasNaWrapper and naIncluded with other values', () => {
      const cell = makeCell({
        isFiltered: true,
        fieldName: 'MyField',
        conditionFilters: makeConditionFilters(
          [
            { operator: FilterOperator.Equals, value: 'MyField' },
            { operator: FilterOperator.Equals, value: 'a' },
            { operator: FilterOperator.Equals, value: naValue },
          ],
          true,
          true,
        ),
      });
      const filters = [
        { operator: FilterOperator.Equals, value: 'MyField' },
        { operator: FilterOperator.Equals, value: 'a' },
        { operator: FilterOperator.Equals, value: naValue },
      ];
      const listFilter = makeListFilter(['MyField', 'a', naValue]);
      expect(
        getInitialSelectedValues(cell, listFilter, filters, [], fieldName),
      ).toEqual(['a', naValue]);
    });

    it('returns selected values from filters when mode is value (valueList not used for mapping)', () => {
      const cell = makeCell({
        isFiltered: true,
        fieldName: 'MyField',
        conditionFilters: makeConditionFilters([
          { operator: FilterOperator.Equals, value: 'MyField' },
          { operator: FilterOperator.Equals, value: 'a' },
          { operator: FilterOperator.Equals, value: 'b' },
        ]),
      });
      const filters = [
        { operator: FilterOperator.Equals, value: 'MyField' },
        { operator: FilterOperator.Equals, value: 'a' },
        { operator: FilterOperator.Equals, value: 'b' },
      ];
      const listFilter = makeListFilter(['MyField', 'a', 'b']);
      expect(
        getInitialSelectedValues(cell, listFilter, filters, [], fieldName),
      ).toEqual(['a', 'b']);
    });

    it('returns [naValue] when filters is undefined but cell has IF(ISNA(.), TRUE, FALSE) (hasNaWrapper + naIncluded)', () => {
      const cell = makeCell({
        isFiltered: true,
        fieldName: 'MyField',
        conditionFilters: makeConditionFilters([], true, true),
      });
      const listFilter = makeListFilter([naValue]);
      expect(
        getInitialSelectedValues(cell, listFilter, undefined, [], fieldName),
      ).toEqual([naValue]);
    });

    it('returns [naValue] for IF(ISNA([Column2]), TRUE, FALSE) when filters is empty (parser returns filters: [])', () => {
      const column2FieldName = 'Column2';
      const cell = makeCell({
        isFiltered: true,
        fieldName: column2FieldName,
        filterExpression: 'IF(ISNA([Column2]), TRUE, FALSE)',
        conditionFilters: makeConditionFilters([], true, true),
      });
      const listFilter = makeListFilter([naValue]);
      const filters: ParsedConditionFilter[] = [];
      expect(
        getInitialSelectedValues(
          cell,
          listFilter,
          filters,
          [],
          column2FieldName,
        ),
      ).toEqual([naValue]);
    });
  });

  describe('getInitialUnselectedValues', () => {
    it('returns null when mode is not "value"', () => {
      const cell = makeCell({
        isFiltered: true,
        conditionFilters: makeConditionFilters([
          { operator: FilterOperator.GreaterThan, value: '0' },
        ]),
      });
      expect(
        getInitialUnselectedValues(
          cell,
          emptyListFilter,
          undefined,
          [],
          fieldName,
        ),
      ).toBeNull();
    });

    it('returns null when some filter is not NotEquals', () => {
      const cell = makeCell({
        isFiltered: true,
        fieldName: 'MyField',
        conditionFilters: makeConditionFilters([
          { operator: FilterOperator.NotEquals, value: 'x' },
          { operator: FilterOperator.NotEquals, value: 'y' },
        ]),
      });
      const filters = [
        { operator: FilterOperator.NotEquals, value: 'x' },
        { operator: FilterOperator.Equals, value: 'y' },
      ];
      expect(
        getInitialUnselectedValues(
          cell,
          emptyListFilter,
          filters,
          [],
          fieldName,
        ),
      ).toBeNull();
    });

    it('returns [] when filters is undefined', () => {
      const cell = makeCell({
        isFiltered: true,
        fieldName: 'MyField',
        conditionFilters: makeConditionFilters([
          { operator: FilterOperator.NotEquals, value: 'a' },
        ]),
      });
      const listFilter = makeListFilter(['a']);
      expect(
        getInitialUnselectedValues(cell, listFilter, undefined, [], fieldName),
      ).toEqual([]);
    });

    it('returns unselected values excluding fieldName', () => {
      const cell = makeCell({
        isFiltered: true,
        fieldName: 'MyField',
        conditionFilters: makeConditionFilters([
          { operator: FilterOperator.NotEquals, value: 'a' },
          { operator: FilterOperator.NotEquals, value: 'b' },
        ]),
      });
      const filters = [
        { operator: FilterOperator.NotEquals, value: 'a' },
        { operator: FilterOperator.NotEquals, value: 'b' },
      ];
      const listFilter = makeListFilter(['a', 'b']);
      expect(
        getInitialUnselectedValues(cell, listFilter, filters, [], fieldName),
      ).toEqual(['a', 'b']);
    });

    it('includes naValue in unselected when hasNaWrapper and naIncluded is false', () => {
      const cell = makeCell({
        isFiltered: true,
        fieldName: 'MyField',
        conditionFilters: makeConditionFilters(
          [{ operator: FilterOperator.NotEquals, value: 'a' }],
          true,
          false,
        ),
      });
      const filters = [{ operator: FilterOperator.NotEquals, value: 'a' }];
      const listFilter = makeListFilter(['a', naValue]);
      expect(
        getInitialUnselectedValues(cell, listFilter, filters, [], fieldName),
      ).toEqual(['a', naValue]);
    });

    it('adds naValue to unselected list when hasNaWrapper and naIncluded false even if valueList does not include NA', () => {
      const cell = makeCell({
        isFiltered: true,
        fieldName: 'MyField',
        conditionFilters: makeConditionFilters(
          [{ operator: FilterOperator.NotEquals, value: 'a' }],
          true,
          false,
        ),
      });
      const filters = [{ operator: FilterOperator.NotEquals, value: 'a' }];
      const listFilter = makeListFilter(['a']);
      expect(
        getInitialUnselectedValues(cell, listFilter, filters, [], fieldName),
      ).toEqual(['a', naValue]);
    });

    it('returns null when both NotEquals filters reference fieldName (exclude-all / select-none)', () => {
      const cell = makeCell({
        isFiltered: true,
        fieldName: 'MyField',
        conditionFilters: makeConditionFilters([
          { operator: FilterOperator.NotEquals, value: 'MyField' },
          { operator: FilterOperator.NotEquals, value: 'MyField' },
        ]),
      });
      const filters = [
        { operator: FilterOperator.NotEquals, value: 'MyField' },
        { operator: FilterOperator.NotEquals, value: 'MyField' },
      ];
      const listFilter = makeListFilter(['MyField', 'a', 'b']);
      expect(
        getInitialUnselectedValues(cell, listFilter, filters, [], fieldName),
      ).toBeNull();
    });

    it('returns null for IF(ISNA(.), TRUE, FALSE) when filters is undefined or empty (NA only, no unselected list)', () => {
      const cell = makeCell({
        isFiltered: true,
        fieldName: 'MyField',
        conditionFilters: makeConditionFilters([], true, true),
      });
      const listFilter = makeListFilter([naValue]);
      expect(
        getInitialUnselectedValues(cell, listFilter, undefined, [], fieldName),
      ).toBeNull();
      expect(
        getInitialUnselectedValues(cell, listFilter, [], [], fieldName),
      ).toBeNull();
    });
  });

  describe('getInitialConditionState', () => {
    it('returns defaultConditionState when mode is not condition', () => {
      const cell = makeCell({ isFiltered: false });
      expect(
        getInitialConditionState(
          cell,
          emptyListFilter,
          undefined,
          [],
          fieldName,
        ),
      ).toEqual(defaultConditionState);
    });

    it('returns defaultConditionState when filters is undefined', () => {
      const cell = makeCell({
        isFiltered: true,
        conditionFilters: makeConditionFilters([
          { operator: FilterOperator.GreaterThan, value: '5' },
        ]),
      });
      expect(
        getInitialConditionState(
          cell,
          emptyListFilter,
          undefined,
          [],
          fieldName,
        ),
      ).toEqual(defaultConditionState);
    });

    it('returns state from first filter for single condition', () => {
      const cell = makeCell({
        isFiltered: true,
        conditionFilters: makeConditionFilters([
          { operator: FilterOperator.GreaterThan, value: '42' },
        ]),
      });
      const filters = [{ operator: FilterOperator.GreaterThan, value: '42' }];
      expect(
        getInitialConditionState(cell, emptyListFilter, filters, [], fieldName),
      ).toEqual({
        operator: FilterOperator.GreaterThan,
        expressionValue: '42',
        secondaryExpressionValue: '',
      });
    });

    it('returns secondaryExpressionValue for Between', () => {
      const cell = makeCell({
        isFiltered: true,
        conditionFilters: makeConditionFilters([
          {
            operator: FilterOperator.Between,
            value: '1',
            secondaryValue: '100',
          },
        ]),
      });
      const filters = [
        {
          operator: FilterOperator.Between,
          value: '1',
          secondaryValue: '100',
        },
      ];
      expect(
        getInitialConditionState(cell, emptyListFilter, filters, [], fieldName),
      ).toEqual({
        operator: FilterOperator.Between,
        expressionValue: '1',
        secondaryExpressionValue: '100',
      });
    });

    it('uses first filter when multiple condition filters are passed', () => {
      const cell = makeCell({
        isFiltered: true,
        conditionFilters: makeConditionFilters([
          { operator: FilterOperator.GreaterThan, value: '10' },
        ]),
      });
      const filters = [
        { operator: FilterOperator.GreaterThan, value: '10' },
        { operator: FilterOperator.LessThan, value: '100' },
      ];
      expect(
        getInitialConditionState(cell, emptyListFilter, filters, [], fieldName),
      ).toEqual({
        operator: FilterOperator.GreaterThan,
        expressionValue: '10',
        secondaryExpressionValue: '',
      });
    });

    it('returns defaultConditionState when mode is condition but filters is empty array', () => {
      const cell = makeCell({
        isFiltered: true,
        conditionFilters: makeConditionFilters([
          { operator: FilterOperator.GreaterThan, value: '5' },
        ]),
      });
      expect(
        getInitialConditionState(cell, emptyListFilter, [], [], fieldName),
      ).toEqual(defaultConditionState);
    });

    it('returns condition state with empty expressionValue when single Equals has empty string value ([Column2] = "")', () => {
      const cell = makeCell({
        isFiltered: true,
        conditionFilters: makeConditionFilters([
          { operator: FilterOperator.Equals, value: '' },
        ]),
      });
      const filters = [{ operator: FilterOperator.Equals, value: '' }];
      expect(
        getInitialConditionState(cell, emptyListFilter, filters, [], fieldName),
      ).toEqual({
        operator: FilterOperator.Equals,
        expressionValue: '',
        secondaryExpressionValue: '',
      });
    });

    it('returns defaultConditionState when single Equals has value null (mode is customFormula for e.g. [Column2] = 3 MOD 2)', () => {
      const cell = makeCell({
        isFiltered: true,
        conditionFilters: makeConditionFilters([
          { operator: FilterOperator.Equals, value: null },
        ]),
      });
      const filters = [{ operator: FilterOperator.Equals, value: null }];
      expect(
        getInitialConditionState(cell, emptyListFilter, filters, [], fieldName),
      ).toEqual(defaultConditionState);
    });
  });

  describe('areSelectedValuesEqual', () => {
    it('returns true for same values in same order', () => {
      expect(areSelectedValuesEqual(['a', 'b'], ['a', 'b'])).toBe(true);
    });

    it('returns true for same values in different order', () => {
      expect(areSelectedValuesEqual(['b', 'a'], ['a', 'b'])).toBe(true);
    });

    it('returns false for different lengths', () => {
      expect(areSelectedValuesEqual(['a'], ['a', 'b'])).toBe(false);
    });

    it('returns false for different values', () => {
      expect(areSelectedValuesEqual(['a', 'c'], ['a', 'b'])).toBe(false);
    });

    it('returns true for empty arrays', () => {
      expect(areSelectedValuesEqual([], [])).toBe(true);
    });
  });

  describe('isConditionStateEqual', () => {
    it('returns true when all fields match', () => {
      const a = {
        operator: FilterOperator.GreaterThan,
        expressionValue: '10',
        secondaryExpressionValue: '',
      };
      const b = { ...a };
      expect(isConditionStateEqual(a, b)).toBe(true);
    });

    it('returns false when operator differs', () => {
      const a = {
        operator: FilterOperator.GreaterThan,
        expressionValue: '10',
        secondaryExpressionValue: '',
      };
      const b = {
        operator: FilterOperator.LessThan,
        expressionValue: '10',
        secondaryExpressionValue: '',
      };
      expect(isConditionStateEqual(a, b)).toBe(false);
    });

    it('returns false when expressionValue differs', () => {
      const a = {
        operator: FilterOperator.Equals,
        expressionValue: '10',
        secondaryExpressionValue: '',
      };
      const b = {
        operator: FilterOperator.Equals,
        expressionValue: '20',
        secondaryExpressionValue: '',
      };
      expect(isConditionStateEqual(a, b)).toBe(false);
    });

    it('returns false when secondaryExpressionValue differs', () => {
      const a = {
        operator: FilterOperator.Between,
        expressionValue: '1',
        secondaryExpressionValue: '10',
      };
      const b = {
        operator: FilterOperator.Between,
        expressionValue: '1',
        secondaryExpressionValue: '20',
      };
      expect(isConditionStateEqual(a, b)).toBe(false);
    });
  });

  describe('getControlOptionValue', () => {
    it('returns "tableName|fieldName"', () => {
      const control = makeSheetControl('MyTable', 'MyField');
      expect(getControlOptionValue(control)).toBe('MyTable|MyField');
    });
  });

  describe('isDividerOption', () => {
    it('returns true for DIVIDER_BEFORE and DIVIDER_AFTER', () => {
      expect(isDividerOption(DIVIDER_BEFORE)).toBe(true);
      expect(isDividerOption(DIVIDER_AFTER)).toBe(true);
    });

    it('returns false for other strings', () => {
      expect(isDividerOption('value')).toBe(false);
      expect(isDividerOption('control')).toBe(false);
      expect(isDividerOption('')).toBe(false);
    });
  });
});
