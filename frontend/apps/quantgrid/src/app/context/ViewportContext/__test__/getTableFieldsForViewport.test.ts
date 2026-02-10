import { vi } from 'vitest';

import { dynamicFieldName, SheetReader } from '@frontend/parser';

import { getTableFieldsForViewport } from '../getTableFieldsForViewport';

describe('getTableFieldsForViewport', () => {
  it('should return all fields inside the viewport', () => {
    // Arrange
    const dsl = '!layout(1,1) table t\n [f1]=1\n [f2]=2\n [f3]=3';
    const table = SheetReader.parseSheet(dsl).tables[0];
    const viewport = { startCol: 0, endCol: 20, startRow: 0, endRow: 20 };

    // Act
    const res = getTableFieldsForViewport(viewport, table, []);

    // Assert
    expect(res.fields).toEqual(['f1', 'f2', 'f3']);
  });

  it('should return fields inside the viewport', () => {
    // Arrange
    const dsl =
      '!layout(1,9) table t [f1]=1\n [f2]=2\n [f3]=3\n!layout(1,100) table t [q1]=1\n [q2]=2\n [q3]=3';
    const table = SheetReader.parseSheet(dsl).tables[0];

    const viewport = { startCol: 20, endCol: 60, startRow: 0, endRow: 20 };

    // Act
    const res = getTableFieldsForViewport(viewport, table, []);

    // Assert
    expect(res.fields).toEqual(['f1', 'f2', 'f3']);
  });

  it('should not return fields from table not in viewport', () => {
    // Arrange
    const dsl = '!layout(50,100) table t [f1]=1\n [f2]=2\n [f3]=3';
    const table = SheetReader.parseSheet(dsl).tables[0];
    const viewport = { startCol: 0, endCol: 20, startRow: 0, endRow: 20 };

    // Act
    const res = getTableFieldsForViewport(viewport, table, []);

    // Assert
    expect(res.fields.length).toBe(0);
  });

  it('should not return fields if table has no fields', () => {
    // Arrange
    const dsl = '!layout(1,1) table t';
    const table = SheetReader.parseSheet(dsl).tables[0];
    const viewport = { startCol: 0, endCol: 20, startRow: 0, endRow: 20 };

    // Act
    const res = getTableFieldsForViewport(viewport, table, []);

    // Assert
    expect(res.fields.length).toBe(0);
  });

  it('should request dynamic placeholder and return dynamicRange when viewport overlaps dynamic block', () => {
    // Arrange
    const dsl =
      '!layout(1,1) table t\n [a]=1\n [*]=some_formula\n [b]=2\n [c]=3';
    const table = SheetReader.parseSheet(dsl).tables[0];

    const viewport = { startCol: 0, endCol: 50, startRow: 0, endRow: 50 };
    const dynamicFields = ['d1', 'd2', 'd3'];

    // Act
    const res = getTableFieldsForViewport(viewport, table, dynamicFields);

    // Assert
    expect(res.fields).toEqual(
      expect.arrayContaining(['a', 'b', 'c', dynamicFieldName]),
    );
    expect(res.dynamicRange).toEqual({ start: 0, end: 3 });
  });

  it('should NOT request dynamic placeholder if dynamicFields were already requested but came back empty', () => {
    // Arrange
    const dsl = '!layout(1,1) table t\n [a]=1\n [*]=some_formula\n [b]=2';
    const table = SheetReader.parseSheet(dsl).tables[0];

    const viewport = { startCol: 0, endCol: 50, startRow: 0, endRow: 50 };

    // Act
    const res = getTableFieldsForViewport(viewport, table, [], true);

    // Assert:
    expect(res.fields).not.toEqual(expect.arrayContaining([dynamicFieldName]));
    expect(res.dynamicRange).toBeUndefined();
  });

  it('should always include key fields even if they are outside viewport', () => {
    // Arrange
    const dsl = '!layout(50,100) table t\n key [id]=1\n [value]=2';
    const table = SheetReader.parseSheet(dsl).tables[0];

    const viewport = { startCol: 0, endCol: 10, startRow: 0, endRow: 10 };

    // Act
    const res = getTableFieldsForViewport(viewport, table, []);

    // Assert
    expect(res.fields).toEqual(['id']);
  });

  it('should use rows axis for horizontal tables (fields visibility depends on startRow/endRow)', () => {
    // Arrange
    const dsl = '!layout(10,1) table t\n [f1]=1\n [f2]=2\n [f3]=3';
    const table = SheetReader.parseSheet(dsl).tables[0];

    vi.spyOn(table, 'getIsTableDirectionHorizontal').mockReturnValue(true);
    const viewport = { startCol: 0, endCol: 0, startRow: 0, endRow: 100 };

    // Act
    const res = getTableFieldsForViewport(viewport, table, []);

    // Assert
    expect(res.fields).toEqual(['f1', 'f2', 'f3']);
  });
});
