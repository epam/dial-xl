import { findNearestOverlappingTable } from '../findNearestOverlappingTable';

describe('findNearestOverlappingTable', () => {
  const createGridTable = (
    tableName: string,
    startRow: number,
    endRow: number,
    startCol: number,
    endCol: number
  ): any => ({
    tableName,
    startRow,
    endRow,
    startCol,
    endCol,
  });

  const createParsedTable = (
    tableName: string,
    startOffset: number,
    stopOffset: number
  ): any => ({
    tableName,
    dslPlacement: {
      startOffset,
      stopOffset,
    },
  });

  it('should return undefined when there are no overlapping tables', () => {
    // Arrange
    const targetGridTable = createGridTable('Table1', 1, 2, 1, 2);
    const targetParsedTable = createParsedTable('Table1', 0, 10);

    const tableStructures = [targetGridTable];
    const parsedTables = [targetParsedTable];
    const isForward = true;

    // Act
    const result = findNearestOverlappingTable(
      targetGridTable,
      targetParsedTable,
      tableStructures,
      parsedTables,
      isForward
    );

    // Assert
    expect(result).toBeUndefined();
  });

  it('should find the nearest overlapping table when moving forward', () => {
    // Arrange
    const targetGridTable = createGridTable('Table1', 1, 2, 1, 2);
    const targetParsedTable = createParsedTable('Table1', 0, 10);

    const overlappingGridTable = createGridTable('Table2', 1, 2, 1, 2);
    const overlappingParsedTable = createParsedTable('Table2', 15, 25);

    const tableStructures = [targetGridTable, overlappingGridTable];
    const parsedTables = [targetParsedTable, overlappingParsedTable];
    const isForward = true;

    // Act
    const result = findNearestOverlappingTable(
      targetGridTable,
      targetParsedTable,
      tableStructures,
      parsedTables,
      isForward
    );

    // Assert
    expect(result).toEqual(overlappingParsedTable);
  });

  it('should find the nearest overlapping table when moving backward', () => {
    // Arrange
    const targetGridTable = createGridTable('Table2', 1, 2, 1, 2);
    const targetParsedTable = createParsedTable('Table2', 15, 25);

    const overlappingGridTable = createGridTable('Table1', 1, 2, 1, 2);
    const overlappingParsedTable = createParsedTable('Table1', 0, 10);

    const tableStructures = [overlappingGridTable, targetGridTable];
    const parsedTables = [overlappingParsedTable, targetParsedTable];
    const isForward = false;

    // Act
    const result = findNearestOverlappingTable(
      targetGridTable,
      targetParsedTable,
      tableStructures,
      parsedTables,
      isForward
    );

    // Assert
    expect(result).toEqual(overlappingParsedTable);
  });

  it('should find the nearest overlapping table among multiple tables', () => {
    // Arrange
    const targetGridTable = createGridTable('Table1', 1, 2, 1, 2);
    const targetParsedTable = createParsedTable('Table1', 20, 30);

    const overlappingGridTable1 = createGridTable('Table2', 1, 2, 1, 2);
    const overlappingParsedTable1 = createParsedTable('Table2', 10, 15);

    const overlappingGridTable2 = createGridTable('Table3', 1, 2, 1, 2);
    const overlappingParsedTable2 = createParsedTable('Table3', 35, 45);

    const tableStructures = [
      targetGridTable,
      overlappingGridTable1,
      overlappingGridTable2,
    ];
    const parsedTables = [
      targetParsedTable,
      overlappingParsedTable1,
      overlappingParsedTable2,
    ];
    const isForward = true;

    // Act
    const result = findNearestOverlappingTable(
      targetGridTable,
      targetParsedTable,
      tableStructures,
      parsedTables,
      isForward
    );

    // Assert
    expect(result).toEqual(overlappingParsedTable2);
  });

  it('should select the correct overlapping table when multiple tables have equal offset differences', () => {
    // Arrange
    const targetGridTable = createGridTable('Table1', 1, 2, 1, 2);
    const targetParsedTable = createParsedTable('Table1', 50, 60);

    const overlappingGridTable1 = createGridTable('Table2', 1, 2, 1, 2);
    const overlappingParsedTable1 = createParsedTable('Table2', 40, 50);

    const overlappingGridTable2 = createGridTable('Table3', 1, 2, 1, 2);
    const overlappingParsedTable2 = createParsedTable('Table3', 60, 70);

    const tableStructures = [
      overlappingGridTable1,
      targetGridTable,
      overlappingGridTable2,
    ];
    const parsedTables = [
      overlappingParsedTable1,
      targetParsedTable,
      overlappingParsedTable2,
    ];

    // Act & Assert for moving forward
    let result = findNearestOverlappingTable(
      targetGridTable,
      targetParsedTable,
      tableStructures,
      parsedTables,
      true // isForward
    );
    expect(result).toEqual(overlappingParsedTable2);

    // Act & Assert for moving backward
    result = findNearestOverlappingTable(
      targetGridTable,
      targetParsedTable,
      tableStructures,
      parsedTables,
      false // isForward
    );
    expect(result).toEqual(overlappingParsedTable1);
  });

  it('should handle overlapping tables in both directions', () => {
    // Arrange
    const targetGridTable = createGridTable('Table2', 2, 3, 2, 3);
    const targetParsedTable = createParsedTable('Table2', 30, 40);

    const overlappingGridTable1 = createGridTable('Table1', 1, 2, 1, 2);
    const overlappingParsedTable1 = createParsedTable('Table1', 20, 35);

    const overlappingGridTable2 = createGridTable('Table3', 3, 4, 3, 4);
    const overlappingParsedTable2 = createParsedTable('Table3', 35, 50);

    const tableStructures = [
      overlappingGridTable1,
      targetGridTable,
      overlappingGridTable2,
    ];
    const parsedTables = [
      overlappingParsedTable1,
      targetParsedTable,
      overlappingParsedTable2,
    ];

    // Act & Assert for moving forward
    let result = findNearestOverlappingTable(
      targetGridTable,
      targetParsedTable,
      tableStructures,
      parsedTables,
      true
    );
    expect(result).toEqual(overlappingParsedTable2);

    // Act & Assert for moving backward
    result = findNearestOverlappingTable(
      targetGridTable,
      targetParsedTable,
      tableStructures,
      parsedTables,
      false
    );
    expect(result).toEqual(overlappingParsedTable1);
  });
});
