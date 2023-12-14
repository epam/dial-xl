import { SheetReader } from '@frontend/parser';

import { generateFieldExpressionFromText } from '../generateFieldExpressionFromText';

describe('generateFieldExpressionFromText', () => {
  it('should return NA expression for a field name input', () => {
    // Arrange
    const fieldText = 'Field1';
    const dsl = 'table t1 [f1]=1';
    const parsedDsl = SheetReader.parseSheet(dsl);
    const targetTable = parsedDsl.tables[0];

    // Act
    const result = generateFieldExpressionFromText(fieldText, targetTable);

    // Assert
    expect(result.fieldName).toBe(fieldText);
    expect(result.fieldDsl).toBe('[Field1] = NA');
  });

  it('should return NA expression with a unique field name for a field name input', () => {
    // Arrange
    const fieldText = 'f1';
    const dsl = 'table t1 [f1]=1';
    const parsedDsl = SheetReader.parseSheet(dsl);
    const targetTable = parsedDsl.tables[0];

    // Act
    const result = generateFieldExpressionFromText(fieldText, targetTable);

    // Assert
    expect(result.fieldName).toBe('f2');
    expect(result.fieldDsl).toBe('[f2] = NA');
  });

  it('should return given expression and generate field name', () => {
    // Arrange
    const fieldText = '= 2 + 2';
    const dsl = 'table t1 [f1]=1';
    const parsedDsl = SheetReader.parseSheet(dsl);
    const targetTable = parsedDsl.tables[0];

    // Act
    const result = generateFieldExpressionFromText(fieldText, targetTable);

    // Assert
    expect(result.fieldName).toBe('Field1');
    expect(result.fieldDsl).toBe('[Field1] = 2 + 2');
  });

  it('should return given expression and add braces to a given field name', () => {
    // Arrange
    const fieldText = 'f2 = 2 + 2';
    const dsl = 'table t1 [f1]=1';
    const parsedDsl = SheetReader.parseSheet(dsl);
    const targetTable = parsedDsl.tables[0];

    // Act
    const result = generateFieldExpressionFromText(fieldText, targetTable);

    // Assert
    expect(result.fieldName).toBe('f2');
    expect(result.fieldDsl).toBe('[f2] = 2 + 2');
  });

  it('should return given expression and given field name', () => {
    // Arrange
    const fieldText = '[f2] = 2 + 2';
    const dsl = 'table t1 [f1]=1';
    const parsedDsl = SheetReader.parseSheet(dsl);
    const targetTable = parsedDsl.tables[0];

    // Act
    const result = generateFieldExpressionFromText(fieldText, targetTable);

    // Assert
    expect(result.fieldName).toBe('f2');
    expect(result.fieldDsl).toBe('[f2] = 2 + 2');
  });

  it('should return expression with default field name if missed targetTable', () => {
    // Arrange
    const fieldText = '= 2 + 2';

    // Act
    const result = generateFieldExpressionFromText(fieldText);

    // Assert
    expect(result.fieldName).toBe('Field1');
    expect(result.fieldDsl).toBe('[Field1] = 2 + 2');
  });

  it('should return expression with key field as is', () => {
    // Arrange
    const fieldText = 'key [f2] = 2 + 2';

    // Act
    const result = generateFieldExpressionFromText(fieldText);

    // Assert
    expect(result.fieldName).toBe('');
    expect(result.fieldDsl).toBe('key [f2] = 2 + 2');
  });

  it('should return expression with dim field as is', () => {
    // Arrange
    const fieldText = 'dim [f2] = 2 + 2';

    // Act
    const result = generateFieldExpressionFromText(fieldText);

    // Assert
    expect(result.fieldName).toBe('');
    expect(result.fieldDsl).toBe('dim [f2] = 2 + 2');
  });

  it('should return expression if there are more than one equal sign', () => {
    // Arrange
    const fieldText = '[f2] = 2 + 2 <= 3 + 3';

    // Act
    const result = generateFieldExpressionFromText(fieldText);

    // Assert
    expect(result.fieldName).toBe('f2');
    expect(result.fieldDsl).toBe(fieldText);
  });

  it('should return expression if there are more than one equal sign with formatted field name', () => {
    // Arrange
    const fieldText = 'f2 = 2 + 2 <= 3 + 3';

    // Act
    const result = generateFieldExpressionFromText(fieldText);

    // Assert
    expect(result.fieldName).toBe('f2');
    expect(result.fieldDsl).toBe('[f2] = 2 + 2 <= 3 + 3');
  });
});
