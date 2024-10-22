import { getDSLChangeText } from '../getDSLChangeText';

describe('getDSLChangeText', () => {
  it('should return single line change text', () => {
    // Arrange
    const dsl = 'table t [f1]=2\r\n[f2]=3\r\n[f1]=4';
    const oldDSL = 'table t [f1]=2\r\n[f2]=3\r\n[f1]=5';

    // Act
    const result = getDSLChangeText(oldDSL, dsl);

    // Assert
    expect(result).toBe('DSL change (line 3)');
  });

  it('should return multiple change lines text', () => {
    // Arrange
    const dsl = 'table t\n[f1]=3\n[f2]=4\n[f1]=5';
    const oldDSL = 'table t\n[f1]=2\n[f2]=3\n[f1]=4';

    // Act
    const result = getDSLChangeText(oldDSL, dsl);

    // Assert
    expect(result).toBe('DSL change (lines 2, 3, 4)');
  });

  it('should return simple text if no changes', () => {
    // Arrange
    const dsl = 'table t\n[f1]=3\n[f2]=4\n[f1]=5';
    const oldDSL = 'table t\n[f1]=3\n[f2]=4\n[f1]=5';

    // Act
    const result = getDSLChangeText(oldDSL, dsl);

    // Assert
    expect(result).toBe('DSL change');
  });

  it('should cut lines if there are a lot of changes', () => {
    // Arrange
    const dsl =
      'table t\n[f1]=3\n[f2]=4\n[f3]=5\n[f4]=5\n[f5]=5\n[f6]=5\n[f7]=5\n';
    const oldDSL = 'table t\n[f1]=4\n[f2]=5\n[f3]=6';

    // Act
    const result = getDSLChangeText(oldDSL, dsl);

    // Assert
    expect(result).toBe('DSL change (lines 2, 3, 4, 5, 6...)');
  });
});
