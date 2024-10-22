import { sanitizeExpression } from '../sanitizeExpression';

describe('sanitizeExpression', () => {
  it('should return trimmed expression', () => {
    // Arrange
    const initialExpression = '1 + 1';
    const expression = '= 2 + 2';
    const sanitizedExpression = '2 + 2';

    // Act
    const result = sanitizeExpression(expression, initialExpression);

    // Assert
    expect(result).toBe(sanitizedExpression);
  });

  it('should return same expression if already sanitized', () => {
    // Arrange
    const initialExpression = '1 + 1';
    const expression = '2 + 2';

    // Act
    const result = sanitizeExpression(expression, initialExpression);

    // Assert
    expect(result).toBe(expression);
  });

  it('should return empty expression if empty', () => {
    // Arrange
    const initialExpression = '1 + 1';
    const expression = ' ';

    // Act
    const result = sanitizeExpression(expression, initialExpression);

    // Assert
    expect(result).toBe(expression);
  });

  it('should return empty expression if have only equal sign', () => {
    // Arrange
    const initialExpression = '1 + 1';
    const expression = '= ';

    // Act
    const result = sanitizeExpression(expression, initialExpression);

    // Assert
    expect(result).toBe('');
  });

  it('should return expression with equal if initial expression is empty', () => {
    // Arrange
    const initialExpression = ' \r\n';
    const expression = '2 + 2';
    const sanitizedExpression = '= 2 + 2';

    // Act
    const result = sanitizeExpression(expression, initialExpression);

    // Assert
    expect(result).toBe(sanitizedExpression);
  });
});
