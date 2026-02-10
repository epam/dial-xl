import { GridApi, GridTable } from '@frontend/canvas-spreadsheet';

import { autoTablePlacement } from '../autoTablePlacement';

describe('autoTablePlacement', () => {
  it('should do nothing if tables have placement', () => {
    // Arrange
    const dsl =
      '!layout(1,1) table t1 [f1]=2\n[f2]=3\n[f1]=4\n!layout(3,3) table t2 [f1]=2\n[f2]=3\n[f1]=4';

    // Act
    const result = autoTablePlacement(dsl, [], null, null, null);

    // Assert
    expect(result).toBe(dsl);
  });

  it('should place table vertically after table with placement', () => {
    // Arrange
    const dsl =
      '!layout(1,1) table t1 [f1]=2\n[f2]=3\n[f1]=4\ntable t2 [f1]=2\n[f2]=3\n[f1]=4';
    const expectedDsl =
      '!layout(1,1) table t1 [f1]=2\n[f2]=3\n[f1]=4\n!layout(3, 1, "title", "headers")\ntable t2 [f1]=2\n[f2]=3\n[f1]=4\r\n';
    const tableStructures: GridTable[] = [
      {
        tableName: 't1',
        startRow: 1,
        startCol: 1,
        endRow: 1,
        endCol: 3,
      },
    ] as GridTable[];

    // Act
    const result = autoTablePlacement(dsl, tableStructures, null, null, null);

    // Assert
    expect(result).toBe(expectedDsl);
  });

  it('should place table horizontally after table with placement', () => {
    // Arrange
    const dsl =
      '!layout(1,1) table t1 dim [f1]=RANGE(5)\n\ntable t2 [f1]=2\n[f2]=3\n[f1]=4';
    const expectedDsl =
      '!layout(1,1) table t1 dim [f1]=RANGE(5)\n\n!layout(1, 3, "title", "headers")\ntable t2 [f1]=2\n[f2]=3\n[f1]=4\r\n';
    const tableStructures: GridTable[] = [
      {
        tableName: 't1',
        startRow: 1,
        startCol: 1,
        endRow: 5,
        endCol: 1,
      },
    ] as GridTable[];

    // Act
    const result = autoTablePlacement(dsl, tableStructures, null, null, null);

    // Assert
    expect(result).toBe(expectedDsl);
  });

  it('should place multiple tables with expanded field sizes after table with placement', () => {
    // Arrange
    const dsl =
      '!layout(1,1)\ntable t1\n[f1]=2\n[f2]=3\n[f3]=4\ntable t2\n[very_very_very_long_name_field_1]=2\n[very_very_very_long_name_field_2]=3\n[f3]=4\ntable t3\n[f1]=2\n[f2]=3\n[f1]=4';
    const expectedDsl =
      '!layout(1,1)\ntable t1\n[f1]=2\n[f2]=3\n[f3]=4\n!layout(3, 1, "title", "headers")\ntable t2\n[very_very_very_long_name_field_1]=2\n[very_very_very_long_name_field_2]=3\n[f3]=4\n!layout(7, 1, "title", "headers")\ntable t3\n[f1]=2\n[f2]=3\n[f1]=4\r\n';

    const grid = {
      getCanvasSymbolWidth: () => 6,
      gridSizes: {
        colNumber: {
          width: 65,
        },
        cell: {
          padding: 4,
        },
        edges: {
          col: 1000,
          row: 1000,
        },
      },
    };
    const tableStructures: GridTable[] = [
      {
        tableName: 't1',
        startRow: 1,
        startCol: 1,
        endRow: 1,
        endCol: 3,
      },
    ] as GridTable[];
    // Act
    const result = autoTablePlacement(
      dsl,
      tableStructures,
      grid as GridApi,
      'projectName',
      'sheetName'
    );

    // Assert
    expect(result).toBe(expectedDsl);
  });

  it('should place table correctly with comment starting', () => {
    // Arrange
    const dsl =
      '!layout(1,1) table t1 [f1]=2\n[f2]=3\n[f1]=4\n##note\ntable t2 [f1]=2\n[f2]=3\n[f1]=4';
    const expectedDsl =
      '!layout(1,1) table t1 [f1]=2\n[f2]=3\n[f1]=4\n##note\n!layout(3, 1, "title", "headers")\ntable t2 [f1]=2\n[f2]=3\n[f1]=4\r\n';
    const tableStructures: GridTable[] = [
      {
        tableName: 't1',
        startRow: 1,
        startCol: 1,
        endRow: 1,
        endCol: 3,
      },
    ] as GridTable[];
    // Act
    const result = autoTablePlacement(dsl, tableStructures, null, null, null);

    // Assert
    expect(result).toBe(expectedDsl);
  });

  it('should place two tables in the nearest free spot', () => {
    // Arrange
    const dsl =
      '!layout(1,4) table t1 [f1]=2\n!layout(1,7) table t2 [f1]=2\n[f2]=3\ntable t3 [f1]=2\n[f2]=3\n[f3]=4\ntable t4 [f1]=1';
    const expectedDsl =
      '!layout(1,4) table t1 [f1]=2\n!layout(1,7) table t2 [f1]=2\n[f2]=3\n!layout(5, 1, "title", "headers")\ntable t3 [f1]=2\n[f2]=3\n[f3]=4\n!layout(1, 1, "title", "headers")\ntable t4 [f1]=1\r\n';

    // Act
    const result = autoTablePlacement(dsl, [], null, null, null);

    // Assert
    expect(result).toBe(expectedDsl);
  });

  it('should fix table position to be inside spreadsheet edges', () => {
    // Arrange
    const dsl = '!layout(0, 0)\ntable t1 [f1]=2\n[f2]=3\n[f1]=4';
    const expectedDsl = '!layout(1, 1)\ntable t1 [f1]=2\n[f2]=3\n[f1]=4\r\n';

    // Act
    const result = autoTablePlacement(dsl, [], null, null, null);

    // Assert
    expect(result).toBe(expectedDsl);
  });

  it('should fix multiple table positions to be inside spreadsheet edges', () => {
    // Arrange
    const dsl =
      '!layout(0, 0)\ntable t1 [f1]=2\n!layout(0, 11)\ntable t2 [f1]=2';
    const expectedDsl =
      '!layout(1, 1)\ntable t1 [f1]=2\n!layout(1, 11)\ntable t2 [f1]=2\r\n';

    // Act
    const result = autoTablePlacement(dsl, [], null, null, null);

    // Assert
    expect(result).toBe(expectedDsl);
  });
});
