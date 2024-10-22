import { SheetReader } from '@frontend/parser';

import { getTableFieldsForViewport } from '../getTableFieldsForViewport';

describe('getTableFieldsForViewport', () => {
  it('should return all fields inside the viewport', () => {
    // Arrange
    const dsl = '!placement(1,1) table t\n [f1]=1\n [f2]=2\n [f3]=3';
    const table = SheetReader.parseSheet(dsl).tables[0];
    const viewport = { startCol: 0, endCol: 20, startRow: 0, endRow: 20 };

    // Act
    const fields = getTableFieldsForViewport(viewport, table, [], false);

    // Assert
    expect(fields).toEqual(['f1', 'f2', 'f3']);
  });

  it('should return fields inside the viewport', () => {
    // Arrange
    const dsl = '!placement(1,9) table t [f1]=1\n [f2]=2\n [f3]=3';
    const table = SheetReader.parseSheet(dsl).tables[0];

    const viewport = { startCol: 20, endCol: 60, startRow: 0, endRow: 20 };

    // Act
    const fields = getTableFieldsForViewport(viewport, table, [], false);

    // Assert
    expect(fields).toEqual(['f3']);
  });

  it('should not return fields from table not in viewport', () => {
    // Arrange
    const dsl = '!placement(50,50) table t [f1]=1\n [f2]=2\n [f3]=3';
    const table = SheetReader.parseSheet(dsl).tables[0];
    const viewport = { startCol: 0, endCol: 20, startRow: 0, endRow: 20 };

    // Act
    const fields = getTableFieldsForViewport(viewport, table, [], false);

    // Assert
    expect(fields.length).toBe(0);
  });

  it('should not return fields if table has no fields', () => {
    // Arrange
    const dsl = '!placement(1,1) table t';
    const table = SheetReader.parseSheet(dsl).tables[0];
    const viewport = { startCol: 0, endCol: 20, startRow: 0, endRow: 20 };

    // Act
    const fields = getTableFieldsForViewport(viewport, table, [], false);

    // Assert
    expect(fields.length).toBe(0);
  });
});
