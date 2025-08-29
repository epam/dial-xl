import { escapeValue } from '../escapeUtils';

describe('escapeOverrideValue', () => {
  it('should remove quotes at beginning and end of the override value and replace them with ""', () => {
    // Arrange
    const value = "'test'";
    const expectedResult = '"test"';

    // Act
    const result = escapeValue(value);

    // Assert
    expect(result).toEqual(expectedResult);
  });
  it('should remove single quotes at beginning of the override value and replace it with "', () => {
    // Arrange
    const value = "'test";
    const expectedResult = '"test"';

    // Act
    const result = escapeValue(value);

    // Assert
    expect(result).toEqual(expectedResult);
  });
  it('should escape the override value', () => {
    // Arrange
    const value = 'test "name"';
    const expectedResult = '"test \'"name\'""';

    // Act
    const result = escapeValue(value);

    // Assert
    expect(result).toEqual(expectedResult);
  });
  it('should escape the override value with "" already inside', () => {
    // Arrange
    const value = '"test "name"""';
    const expectedResult = '"\'"test \'"name\'"\'"\'""';

    // Act
    const result = escapeValue(value);

    // Assert
    expect(result).toEqual(expectedResult);
  });
});
