import { checkAndWrapExpression } from '../checkAndWrapExpression';

describe('checkAndWrapExpression', () => {
  it('should wrap expression with error', () => {
    // Arrange
    const dsl = '43,44';
    const expectedDsl = `ERR("43,44")`;

    // Act
    const result = checkAndWrapExpression(dsl);

    // Assert
    expect(result).toBe(expectedDsl);
  });

  it('should return initial expression if it can be parsed', () => {
    // Arrange
    const dsl = 'RANGE(20)';

    // Act
    const result = checkAndWrapExpression(dsl);

    // Assert
    expect(result).toBe(dsl);
  });
});
