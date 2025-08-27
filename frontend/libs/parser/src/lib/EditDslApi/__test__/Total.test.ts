import { Field, FieldGroup } from '../Field';
import { Total } from '../Total/Total';
import { createEditableTestSheet } from './utils';

describe('Totals', () => {
  it('should add total', () => {
    // Arrange
    const dsl = 'table A\n  [a] = 1\n  [b] = 2\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const total1 = new Total();
    total1.fieldGroups.append(
      FieldGroup.fromField(new Field('a'), 'A[a].SUM()')
    );
    const total2 = new Total();
    total2.fieldGroups.append(
      FieldGroup.fromField(new Field('b'), 'A[b].COUNT()')
    );

    const table = sheet.getTable('A');
    const totals = table.totals;
    totals.append(total1);
    totals.append(total2);

    // Assert
    expect(totals.length).toBe(2);
    expect(totals.getItem(0).fieldGroups.length).toEqual(1);
    expect(totals.getItem(1).fieldGroups.length).toEqual(1);
    expect(sheet.toDSL()).toEqual(
      'table A\n  [a] = 1\n  [b] = 2\ntotal\n  [a] = A[a].SUM()\ntotal\n  [b] = A[b].COUNT()\n'
    );
  });

  it('should edit total', () => {
    // Arrange
    const dsl =
      'table A\n  [a] = 1\n  [b] = 2\ntotal\n  [a] = A[a].SUM()\n  [b] = A[b].SUM()\n' +
      'total\n  [b] = A[b].COUNT()\n';
    const sheet = createEditableTestSheet(dsl);
    const table = sheet.getTable('A');

    // Act
    const total1 = table.totals.getItem(0);
    total1.fieldGroups.deleteItem(1);
    total1.fieldGroups.getItem(0).formula = 'A[a].COUNT()';
    const total2 = table.totals.getItem(1);
    total2.fieldGroups.append(
      FieldGroup.fromField(new Field('a'), 'A[a].SUM()')
    );
    total2.fieldGroups.getItem(0).formula = 'A[b].SUM()';

    // Assert
    expect(sheet.toDSL()).toEqual(
      'table A\n  [a] = 1\n  [b] = 2\ntotal\n  [a] = A[a].COUNT()\ntotal\n  [b] = A[b].SUM()\n  [a] = A[a].SUM()\n'
    );
  });

  it('should remove total', () => {
    // Arrange
    const dsl =
      'table A\n  [a] = 1\n  [b] = 2\ntotal\n  [a] = A[a].SUM()\n  [b] = A[b].SUM()\n' +
      'total\n  [b] = A[b].COUNT()\n';
    const sheet = createEditableTestSheet(dsl);
    const table = sheet.getTable('A');

    // Act
    const totalCount = table.totals.length;
    const totals = table.totals;
    for (let i = 0; i < totalCount; i++) {
      totals.deleteItem(0);
    }

    // Assert
    expect(sheet.toDSL()).toEqual('table A\n  [a] = 1\n  [b] = 2\n');
  });

  it('should insert totals at specific indexes', () => {
    // Arrange
    const dsl =
      'table A\n  [a] = 1\ntotal\n  [a] = A[a].SUM()\napply\nsort A[a]\ntotal\n  [a] = A[a].COUNT()\n';
    const sheet = createEditableTestSheet(dsl);
    const table = sheet.getTable('A');
    const totals = table.totals;

    // Create two new Total objects
    const total1 = new Total();
    total1.fieldGroups.append(
      FieldGroup.fromField(new Field('a'), 'A[a].AVERAGE()')
    );
    const total2 = new Total();
    total2.fieldGroups.append(
      FieldGroup.fromField(new Field('a'), 'A[a].MAX()')
    );

    // Act
    totals.insert(0, total1);
    totals.insert(2, total2);

    // Assert
    const expected =
      'table A\n  [a] = 1\ntotal\n  [a] = A[a].AVERAGE()\n' +
      'total\n  [a] = A[a].SUM()\napply\nsort A[a]\n' +
      'total\n  [a] = A[a].MAX()\ntotal\n  [a] = A[a].COUNT()\n';
    expect(sheet.toDSL()).toEqual(expected);
  });

  it('should pop totals one by one', () => {
    // Arrange
    const dsl =
      'table A\n  [a] = 1\n  [b] = 2\ntotal\n  [a] = A[a].SUM()\n  [b] = A[b].SUM()\ntotal\n  [b] = A[b].COUNT()\n';
    const sheet = createEditableTestSheet(dsl);
    const table = sheet.getTable('A');
    const totals = table.totals;

    // Act
    const length = totals.length;
    for (let i = 0; i < length; i++) {
      totals.pop(0);
    }

    // Assert
    expect(sheet.toDSL()).toEqual('table A\n  [a] = 1\n  [b] = 2\n');
  });

  it('should not break apply after removing total', () => {
    // Arrange
    const dsl =
      'table A\n  [a] = 1\ntotal\n  [a] = A[a].SUM()\napply\nsort A[a]\n';
    const sheet = createEditableTestSheet(dsl);

    // Act
    const table = sheet.getTable('A');
    const oldApply = table.apply;

    table.totals.deleteItem(0);

    // Assert
    expect(table.apply).toBe(oldApply);
    expect(sheet.toDSL()).toEqual('table A\n  [a] = 1\napply\nsort A[a]\n');
  });
});
