import { autoRenameFields } from '../autoRenameFields';

describe('autoRenameFields', () => {
  it('should rename duplicated field', () => {
    // Arrange
    const dsl = 'table t [f1]=2\n [f2]=3\n [f1]=4';
    const expectedDsl = 'table t [f1]=2\n [f2]=3\n [f3]=4\r\n';

    // Act
    const result = autoRenameFields(dsl);

    // Assert
    expect(result).toBe(expectedDsl);
  });

  it('should rename multiple duplicated fields in one table', () => {
    // Arrange
    const dsl = 'table t [f1]=2\n [f1]=3\n [f1]=4';
    const expectedDsl = 'table t [f1]=2\n [f2]=3\n [f3]=4\r\n';

    // Act
    const result = autoRenameFields(dsl);

    // Assert
    expect(result).toBe(expectedDsl);
  });

  it('should rename duplicated fields in all tables', () => {
    // Arrange
    const dsl =
      'table t [f1]=2\n [f2]=3\n [f1]=4\n table t1 [f1]=2\n [f2]=3\n [f1]=4';
    const expectedDsl =
      'table t [f1]=2\n [f2]=3\n [f3]=4\n table t1 [f1]=2\n [f2]=3\n [f3]=4\r\n';

    // Act
    const result = autoRenameFields(dsl);

    // Assert
    expect(result).toBe(expectedDsl);
  });

  it('should rename fields inside one field group', () => {
    // Arrange
    const dsl = 'table t [f1],[f1],[f1] = INPUT("url")';
    const expectedDsl = 'table t [f1],[f2],[f3] = INPUT("url")\r\n';

    // Act
    const result = autoRenameFields(dsl);

    // Assert
    expect(result).toBe(expectedDsl);
  });

  it('should return same dsl if no duplicated fields', () => {
    // Arrange
    const dsl = 'table t [f1]=2\n [f2]=3\n [f3]=4';

    // Act
    const result = autoRenameFields(dsl);

    // Assert
    expect(result).toBe(dsl);
  });

  it('should return same dsl if unable to parse dsl', () => {
    // Arrange
    const dsl = 'table! t [f1]=2\n [f2]=3\n [f3]=4';

    // Act
    const result = autoRenameFields(dsl);

    // Assert
    expect(result).toBe(dsl);
  });
});
