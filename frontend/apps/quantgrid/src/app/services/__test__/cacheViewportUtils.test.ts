import { SheetReader } from '@frontend/parser';

import {
  getExtendedRoundedBorders,
  getNotLoadedChunks,
  getTableFieldsForViewport,
} from '../cacheViewportUtils';

describe('getExtendedRoundedBorders', () => {
  it('should return rounded borders for small viewport', () => {
    // Act
    const [start, end] = getExtendedRoundedBorders(0, 20);

    // Assert
    expect(start).toBe(0);
    expect(end).toBe(200);
  });

  it('should return rounded borders for large viewport', () => {
    // Act
    const [start, end] = getExtendedRoundedBorders(0, 120);

    // Assert
    expect(start).toBe(0);
    expect(end).toBe(300);
  });

  it('should return rounded borders for scrolled viewport', () => {
    // Act
    const [start, end] = getExtendedRoundedBorders(20, 80);

    // Assert
    expect(start).toBe(0);
    expect(end).toBe(200);
  });
});

describe('getTableFieldsForViewport', () => {
  it('should return all fields inside the viewport', () => {
    // Arrange
    const dsl = '!placement(1,1) table t [f1]=1 [f2]=2 [f3]=3';
    const table = SheetReader.parseSheet(dsl).tables[0];
    const columnDataLoaded: Set<string> = new Set();

    // Act
    const fields = getTableFieldsForViewport(table, columnDataLoaded, 0, 20);

    // Assert
    expect(fields).toEqual(['f1', 'f2', 'f3']);
  });

  it('should return fields inside the viewport', () => {
    // Arrange
    const dsl = '!placement(1,9) table t [f1]=1 [f2]=2 [f3]=3';
    const table = SheetReader.parseSheet(dsl).tables[0];
    const columnDataLoaded: Set<string> = new Set();

    // Act
    const fields = getTableFieldsForViewport(table, columnDataLoaded, 20, 60);

    // Assert
    expect(fields).toEqual(['f3']);
  });

  it('should not return fields from table not in viewport', () => {
    // Arrange
    const dsl = '!placement(50,50) table t [f1]=1 [f2]=2 [f3]=3';
    const table = SheetReader.parseSheet(dsl).tables[0];
    const columnDataLoaded: Set<string> = new Set();

    // Act
    const fields = getTableFieldsForViewport(table, columnDataLoaded, 0, 20);

    // Assert
    expect(fields.length).toBe(0);
  });

  it('should return fields that are not completely loaded', () => {
    // Arrange
    const dsl = '!placement(1,1) table t [f1]=1 [f2]=2 [f3]=3';
    const table = SheetReader.parseSheet(dsl).tables[0];
    const columnDataLoaded: Set<string> = new Set(['f1', 'f2']);

    // Act
    const fields = getTableFieldsForViewport(table, columnDataLoaded, 0, 20);

    // Assert
    expect(fields).toEqual(['f3']);
  });

  it('should return dynamic fields that are inside viewport', () => {
    // Arrange
    const dynamicFields = ['f4', 'f5'];
    const dsl = '!placement(1,1) table t [f1]=1 [f2]=2 [f3]=3 [*] = 4';
    const table = SheetReader.parseSheet(dsl).tables[0];
    table.addDynamicFields(dynamicFields);
    const columnDataLoaded: Set<string> = new Set([]);

    // Act
    const fields = getTableFieldsForViewport(
      table,
      columnDataLoaded,
      0,
      20,
      dynamicFields
    );

    // Assert
    expect(fields).toEqual(dynamicFields);
  });
});

describe('getNotLoadedChunks', () => {
  it('should return nothing when all data loaded', () => {
    // Arrange
    const fields = ['f1', 'f2', 'f3'];
    const chunks = {
      0: {
        f1: new Array(100),
        f2: new Array(100),
        f3: new Array(100),
      },
    };

    // Act
    const notLoadedChunks = getNotLoadedChunks(chunks, fields, 0, 40);

    // Assert
    expect(notLoadedChunks?.startRow).toBeUndefined();
    expect(notLoadedChunks?.endRow).toBeUndefined();
    expect(notLoadedChunks?.fields).toBeUndefined();
  });

  it('should return all not loaded chunks when chunks are empty', () => {
    // Arrange
    const chunks = {};
    const fields = ['f1', 'f2', 'f3'];
    const expectedFields = new Set(fields);

    // Act
    const notLoadedChunks = getNotLoadedChunks(chunks, fields, 0, 40);

    // Assert
    expect(notLoadedChunks?.startRow).toEqual(0);
    expect(notLoadedChunks?.endRow).toEqual(100);
    expect(notLoadedChunks?.fields).toEqual(expectedFields);
  });

  it('should return only not loaded fields', () => {
    // Arrange
    const chunks = {
      0: {
        f1: new Array(100),
      },
    };
    const fields = ['f1', 'f2', 'f3'];
    const expectedFields = new Set(fields.slice(1));

    // Act
    const notLoadedChunks = getNotLoadedChunks(chunks, fields, 0, 40);

    // Assert
    expect(notLoadedChunks?.startRow).toEqual(0);
    expect(notLoadedChunks?.endRow).toEqual(100);
    expect(notLoadedChunks?.fields).toEqual(expectedFields);
  });
});
