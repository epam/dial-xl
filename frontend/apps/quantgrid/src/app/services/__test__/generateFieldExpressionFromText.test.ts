import { SheetReader } from '@frontend/parser';

import { generateFieldExpressionFromText } from '../generateFieldExpressionFromText';
import { functionsMock } from './functionsToUppercase.test';

describe('generateFieldExpressionFromText', () => {
  it('should return empty value field for a field name input', () => {
    // Arrange
    const fieldText = 'Field1';
    const dsl = 'table t1 [f1]=1';
    const parsedDsl = SheetReader.parseSheet(dsl);
    const targetTable = parsedDsl.tables[0];

    // Act
    const result = generateFieldExpressionFromText(
      fieldText,
      targetTable,
      [],
      {}
    );

    // Assert
    expect(result.fieldNames).toEqual([fieldText]);
    expect(result.expression).toBe(null);
  });

  it('should return empty field with a unique field name for a field name input', () => {
    // Arrange
    const fieldText = 'f1';
    const dsl = 'table t1 [f1]=1';
    const parsedDsl = SheetReader.parseSheet(dsl);
    const targetTable = parsedDsl.tables[0];

    // Act
    const result = generateFieldExpressionFromText(
      fieldText,
      targetTable,
      [],
      {}
    );

    // Assert
    expect(result.fieldNames).toEqual(['f2']);
    expect(result.expression).toBe(null);
  });

  it('should return given expression without field names', () => {
    // Arrange
    const fieldText = '= 2 + 2';
    const dsl = 'table t1 [f1]=1';
    const parsedDsl = SheetReader.parseSheet(dsl);
    const targetTable = parsedDsl.tables[0];

    // Act
    const result = generateFieldExpressionFromText(
      fieldText,
      targetTable,
      [],
      {}
    );

    // Assert
    expect(result.fieldNames).toEqual([]);
    expect(result.expression).toBe('2 + 2');
  });

  it('should return given expression and add braces to a given field name', () => {
    // Arrange
    const fieldText = 'f2 = 2 + 2';
    const dsl = 'table t1 [f1]=1';
    const parsedDsl = SheetReader.parseSheet(dsl);
    const targetTable = parsedDsl.tables[0];

    // Act
    const result = generateFieldExpressionFromText(
      fieldText,
      targetTable,
      [],
      {}
    );

    // Assert
    expect(result.fieldNames).toEqual(['f2']);
    expect(result.expression).toBe('2 + 2');
  });

  it('should return given expression and given field name', () => {
    // Arrange
    const fieldText = '[f2] = 2 + 2';
    const dsl = 'table t1 [f1]=1';
    const parsedDsl = SheetReader.parseSheet(dsl);
    const targetTable = parsedDsl.tables[0];

    // Act
    const result = generateFieldExpressionFromText(
      fieldText,
      targetTable,
      [],
      {}
    );

    // Assert
    expect(result.fieldNames).toEqual(['f2']);
    expect(result.expression).toBe('2 + 2');
  });

  it('should return expression with key field as is', () => {
    // Arrange
    const fieldText = 'key [f2] = 2 + 2';

    // Act
    const result = generateFieldExpressionFromText(fieldText, null, [], {});

    // Assert
    expect(result.fieldNames).toEqual(['f2']);
    expect(result.expression).toBe('2 + 2');
  });

  it('should return expression with dim field as is', () => {
    // Arrange
    const fieldText = 'dim [f2] = 2 + 2';

    // Act
    const result = generateFieldExpressionFromText(fieldText, null, [], {});

    // Assert
    expect(result.fieldNames).toEqual(['f2']);
    expect(result.expression).toBe('2 + 2');
  });

  it('should return expression if there are more than one equal sign', () => {
    // Arrange
    const fieldText = '[f2] = 2 + 2 <= 3 + 3';

    // Act
    const result = generateFieldExpressionFromText(fieldText, null, [], {});

    // Assert
    expect(result.fieldNames).toEqual(['f2']);
    expect(result.expression).toBe('2 + 2 <= 3 + 3');
  });

  it('should return expression if there are more than one equal sign with formatted field name', () => {
    // Arrange
    const fieldText = 'f2 = 2 + 2 <= 3 + 3';

    // Act
    const result = generateFieldExpressionFromText(fieldText, null, [], {});

    // Assert
    expect(result.fieldNames).toEqual(['f2']);
    expect(result.expression).toBe('2 + 2 <= 3 + 3');
  });

  it('should return expression with uppercase function names', () => {
    // Arrange
    const fieldText = 'f1 = range(10)';

    // Act
    const result = generateFieldExpressionFromText(
      fieldText,
      null,
      functionsMock,
      {}
    );

    // Assert
    expect(result.fieldNames).toEqual(['f1']);
    expect(result.expression).toBe('RANGE(10)');
  });

  it('should return multiple field names', () => {
    // Arrange
    const fieldText = '[q], [w], [e] = T1(1)[[a],[b],[c]]';

    // Act
    const result = generateFieldExpressionFromText(
      fieldText,
      null,
      functionsMock,
      {}
    );

    // Assert
    expect(result.fieldNames).toEqual(['q', 'w', 'e']);
    expect(result.expression).toBe('T1(1)[[a],[b],[c]]');
  });
});
