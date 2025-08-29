import { autoFixSheetTableOrFieldName } from '../autoFixSheetTableOrFieldName';

describe('autoFixSheetTableOrFieldName', () => {
  it('should fix table name', () => {
    // Arrange
    const dsl = 'table tableName [f]=1\r\ntable t2 [f] = tablename[f]';
    const expectedDsl = 'table tableName [f]=1\r\ntable t2 [f] = tableName[f]';

    // Act
    const result = autoFixSheetTableOrFieldName(dsl, {});

    // Assert
    expect(result).toBe(expectedDsl);
  });

  it('should fix table name and table field', () => {
    // Arrange
    const dsl =
      'table tableName [fieldName]=1\r\ntable t2 [f] = tablename[fieldname]';
    const expectedDsl =
      'table tableName [fieldName]=1\r\ntable t2 [f] = tableName[fieldName]';

    // Act
    const result = autoFixSheetTableOrFieldName(dsl, {});

    // Assert
    expect(result).toBe(expectedDsl);
  });

  it('should fix multiple table and field names', () => {
    // Arrange
    const dsl =
      'table tableName [fieldName1]=1\r\n [fieldName2]=2\r\n table t2 [f1] = tablename[fieldname1]\r\n [f2] = tablename[Fieldname2]';
    const expectedDsl =
      'table tableName [fieldName1]=1\r\n [fieldName2]=2\r\n table t2 [f1] = tableName[fieldName1]\r\n [f2] = tableName[fieldName2]';

    // Act
    const result = autoFixSheetTableOrFieldName(dsl, {});

    // Assert
    expect(result).toBe(expectedDsl);
  });

  it('should fix field with row query', () => {
    // Arrange
    const dsl =
      'table t1 [fieldName1]=1\r\ntable t2 [f1]=1\r\n[f2]=t1.FILTER([f1] == $[fieldname1])';
    const expectedDsl =
      'table t1 [fieldName1]=1\r\ntable t2 [f1]=1\r\n[f2]=t1.FILTER([f1] == $[fieldName1])';

    // Act
    const result = autoFixSheetTableOrFieldName(dsl, {});

    // Assert
    expect(result).toBe(expectedDsl);
  });
});
