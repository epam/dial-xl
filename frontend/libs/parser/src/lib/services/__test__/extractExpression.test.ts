import { extractExpression } from '../extractExpression';

describe('extractExpression', () => {
  it('should return expression as is', () => {
    // Arrange
    const value = '1+2+3';

    // Act
    const result = extractExpression(value);

    // Assert
    expect(result).toEqual(value);
  });

  it('should extract simple expression from error function', () => {
    // Arrange
    const value = `ERR("1+2+3")`;
    const expectedResult = '1+2+3';

    // Act
    const result = extractExpression(value);

    // Assert
    expect(result).toEqual(expectedResult);
  });

  it('should extract expression from error function', () => {
    // Arrange
    const value = `ERR("Table9.FILTER)Table9[a] > 1")`;
    const expectedResult = 'Table9.FILTER)Table9[a] > 1';

    // Act
    const result = extractExpression(value);

    // Assert
    expect(result).toEqual(expectedResult);
  });
});
