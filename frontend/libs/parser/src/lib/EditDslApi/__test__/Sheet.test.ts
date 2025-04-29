import { Table } from '../Table';
import { createEditableTestSheet } from './utils';

describe('Sheet', () => {
  it('should remove table and not remove text around', () => {
    // Arrange
    const dsl =
      '#comment 1\ntable A\n  [a] = 1\nerror 2\ntable B\n  [b] = 2\nerror 3\n';
    const expectedResult = '#comment 1\nerror 2\nerror 3\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    sheet.removeTable('A');
    sheet.removeTable('B');
    const result = sheet.toDSL();

    // Assert
    expect(result).toEqual(expectedResult);
  });

  it('should preserve the DSL exactly after a round trip', () => {
    // Arrange
    const dsl = [
      'table A\n  key [a] = 1 # comment here\n\n',
      " table 'Another table' # comment there\n  !size(2) dim [b] = RANGE(1)\n",
      'override\nrow,key [a],[b]\n1,,3\n4,5,\n',
      'table C\n  [a] = 1\n  [b]\ntotal [a] = C[a].SUM()\napply\nsort -A[a]\nfilter 1\ntotal\n  [b] = C[b].COUNT()\n',
      '#comment\napply\n #comment\nsort\n',
    ].join('');
    const sheet = createEditableTestSheet(dsl);

    // Act
    const result = sheet.toDSL();

    // Assert
    expect(result).toEqual(dsl);
  });

  it('should handle a sheet with no trailing newline', () => {
    // Arrange
    const dsl = 'table A\n  [a] = 1';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const result = sheet.toDSL();

    // Assert
    expect(result).toEqual(dsl);
  });

  it('should add a new table after removing the original table, preserving leftover text', () => {
    // Arrange
    const dsl = '#comment 1\ntable A\n  [a] = 1\n';
    const expectedDSL = '#comment 1\ntable B\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    sheet.removeTable('A');
    sheet.addTable(new Table('B'));
    const result = sheet.toDSL();

    // Assert
    expect(result).toEqual(expectedDSL);
  });

  it('should move table to the end DSL position', () => {
    // Arrange
    const dsl = 'table A\n[a] = 1\ntable B\n[b] = 2\ntable C\n[c] = 3\n';
    const expectedDSL =
      'table B\n[b] = 2\ntable C\n[c] = 3\ntable A\n[a] = 1\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    sheet.moveTableToIndex('A', 2);
    const result = sheet.toDSL();

    // Assert
    expect(result).toEqual(expectedDSL);
  });

  it('should move table to the middle DSL position', () => {
    // Arrange
    const dsl = 'table A\n[a] = 1\ntable B\n[b] = 2\ntable C\n[c] = 3\n';
    const expectedDSL =
      'table A\n[a] = 1\ntable C\n[c] = 3\ntable B\n[b] = 2\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    sheet.moveTableToIndex('C', 1);
    const result = sheet.toDSL();

    // Assert
    expect(result).toEqual(expectedDSL);
  });
});
