import {
  escapeFieldName,
  escapeTableName,
  unescapeFieldName,
  unescapeTableName,
} from '../utils';

describe('escapeTableName', () => {
  describe('Full escaping', () => {
    it('should quote the table name with space', () => {
      // Arrange
      const name = 'test name';
      const expectedResult = "'test name'";

      // Act
      const result = escapeTableName(name, true);

      // Assert
      expect(result).toEqual(expectedResult);
    });
    it('should quote the table name with \\', () => {
      // Arrange
      const name = 'test \\name';
      const expectedResult = "'test \\name'";

      // Act
      const result = escapeTableName(name, true);

      // Assert
      expect(result).toEqual(expectedResult);
    });
    it('should quote and escape the table name with "\'" ', () => {
      // Arrange
      const name = "test 'name'";
      const expectedResult = "'test ''name'''";

      // Act
      const result = escapeTableName(name, true);

      // Assert
      expect(result).toEqual(expectedResult);
    });
    it('should quote and escape partially escaped table name with "\'" ', () => {
      // Arrange
      const name = "test ''name'";
      const expectedResult = "'test ''''name'''";

      // Act
      const result = escapeTableName(name, true);

      // Assert
      expect(result).toEqual(expectedResult);
    });
    it('should quote and escape table name which looks like escaped with "\'" ', () => {
      // Arrange
      const name = "test ''name''";
      const expectedResult = "'test ''''name'''''";

      // Act
      const result = escapeTableName(name, true);

      // Assert
      expect(result).toEqual(expectedResult);
    });
    it('should not quote and not escape normal table name without "\'" ', () => {
      // Arrange
      const name = 'Table';
      const expectedResult = 'Table';

      // Act
      const result = escapeTableName(name, true);

      // Assert
      expect(result).toEqual(expectedResult);
    });
  });

  describe('Partial escaping', () => {
    it('should quote the table name with space', () => {
      // Arrange
      const name = 'test name';
      const expectedResult = "'test name'";

      // Act
      const result = escapeTableName(name);

      // Assert
      expect(result).toEqual(expectedResult);
    });
    it('should quote the table name with \\', () => {
      // Arrange
      const name = 'test \\name';
      const expectedResult = "'test \\name'";

      // Act
      const result = escapeTableName(name);

      // Assert
      expect(result).toEqual(expectedResult);
    });
    it('should quote and escape the table name with "\'" ', () => {
      // Arrange
      const name = "test 'name'";
      const expectedResult = "'test ''name'''";

      // Act
      const result = escapeTableName(name);

      // Assert
      expect(result).toEqual(expectedResult);
    });
    it('should quote and escape partially escaped table name with "\'" ', () => {
      // Arrange
      const name = "test ''name'";
      const expectedResult = "'test ''name'''";

      // Act
      const result = escapeTableName(name);

      // Assert
      expect(result).toEqual(expectedResult);
    });
    it('should quote and not escape fully escaped table name with "\'" ', () => {
      // Arrange
      const name = "test ''name''";
      const expectedResult = "'test ''name'''";

      // Act
      const result = escapeTableName(name);

      // Assert
      expect(result).toEqual(expectedResult);
    });
    it('should not quote and not escape normal table name without "\'" ', () => {
      // Arrange
      const name = 'Table';
      const expectedResult = 'Table';

      // Act
      const result = escapeTableName(name);

      // Assert
      expect(result).toEqual(expectedResult);
    });
  });
});

describe('unescapeTableName', () => {
  it('should unquote the table name with spaces', () => {
    // Arrange
    const name = "'test name'";
    const expectedResult = 'test name';

    // Act
    const result = unescapeTableName(name);

    // Assert
    expect(result).toEqual(expectedResult);
  });
  it('should unquote and unescape the table name with "\'" ', () => {
    // Arrange
    const name = "'test ''name''";
    const expectedResult = "test 'name'";

    // Act
    const result = unescapeTableName(name);

    // Assert
    expect(result).toEqual(expectedResult);
  });
  it('should unquote the table name with \\', () => {
    // Arrange
    const name = "'test \\name'";
    const expectedResult = 'test \\name';

    // Act
    const result = unescapeTableName(name);

    // Assert
    expect(result).toEqual(expectedResult);
  });
  it('should not remove \' in table name with single "\'" ', () => {
    // Arrange
    const name = "test 'name''";
    const expectedResult = "test 'name'";

    // Act
    const result = unescapeTableName(name);

    // Assert
    expect(result).toEqual(expectedResult);
  });
  it('should normally unescape table name', () => {
    // Arrange
    // const name = "']test 'name''";
    const name = "'']Table1 '' '['";
    const expectedResult = "']Table1 ' '[";
    // const expectedResult = "]test 'name'";

    // Act
    const result = unescapeTableName(name);

    // Assert
    expect(result).toEqual(expectedResult);
  });
  it('should not touch normal table name without "\'" ', () => {
    // Arrange
    const name = 'Table';
    const expectedResult = 'Table';

    // Act
    const result = unescapeTableName(name);

    // Assert
    expect(result).toEqual(expectedResult);
  });
});

describe('escapeFieldName', () => {
  describe('Full escaping', () => {
    it('should remove not needed [ and ] if they wrap full name', () => {
      // Arrange
      const name = '[test]';
      const expectedResult = 'test';

      // Act
      const result = escapeFieldName(name, true);

      // Assert
      expect(result).toEqual(expectedResult);
    });
    it('should escape the field name with "\'"', () => {
      // Arrange
      const name = "test'name";
      const expectedResult = "test''name";

      // Act
      const result = escapeFieldName(name, true);

      // Assert
      expect(result).toEqual(expectedResult);
    });
    it('should not escape normal field name', () => {
      // Arrange
      const name = 'test name';
      const expectedResult = 'test name';

      // Act
      const result = escapeFieldName(name, true);

      // Assert
      expect(result).toEqual(expectedResult);
    });
    it('should not escape the field name with " ', () => {
      // Arrange
      const name = 'test "name"';
      const expectedResult = 'test "name"';

      // Act
      const result = escapeFieldName(name, true);

      // Assert
      expect(result).toEqual(expectedResult);
    });
    it('should escape the field name with [ and ] ', () => {
      // Arrange
      const name = 'test [name]';
      const expectedResult = "test '[name']";

      // Act
      const result = escapeFieldName(name, true);

      // Assert
      expect(result).toEqual(expectedResult);
    });
    it('should escape partially escaped field name with [ and ] ', () => {
      // Arrange
      const name = "test '['value''] from name]";
      const expectedResult = "test '''[''value'''''] from name']";

      // Act
      const result = escapeFieldName(name, true);

      // Assert
      expect(result).toEqual(expectedResult);
    });
  });
  describe('Partial escaping', () => {
    it('should remove not needed [ and ] if they wrap full name', () => {
      // Arrange
      const name = '[test]';
      const expectedResult = 'test';

      // Act
      const result = escapeFieldName(name);

      // Assert
      expect(result).toEqual(expectedResult);
    });
    it('should escape the field name with "\'"', () => {
      // Arrange
      const name = "test'name";
      const expectedResult = "test''name";

      // Act
      const result = escapeFieldName(name);

      // Assert
      expect(result).toEqual(expectedResult);
    });
    it('should not escape normal field name', () => {
      // Arrange
      const name = 'test name';
      const expectedResult = 'test name';

      // Act
      const result = escapeFieldName(name);

      // Assert
      expect(result).toEqual(expectedResult);
    });
    it('should not escape the field name with " ', () => {
      // Arrange
      const name = 'test "name"';
      const expectedResult = 'test "name"';

      // Act
      const result = escapeFieldName(name);

      // Assert
      expect(result).toEqual(expectedResult);
    });
    it('should escape the field name with [ and ] ', () => {
      // Arrange
      const name = 'test [name]';
      const expectedResult = "test '[name']";

      // Act
      const result = escapeFieldName(name);

      // Assert
      expect(result).toEqual(expectedResult);
    });
    it('should escape partially escaped field name with [ and ] ', () => {
      // Arrange
      const name = "test '['value''] from name]";
      const expectedResult = "test '[''value'''] from name']";

      // Act
      const result = escapeFieldName(name);

      // Assert
      expect(result).toEqual(expectedResult);
    });
  });
});

describe('unescapeFieldName', () => {
  it('should unescape the field name', () => {
    // Arrange
    const name = "test''name";
    const expectedResult = "test'name";

    // Act
    const result = unescapeFieldName(name);

    // Assert
    expect(result).toEqual(expectedResult);
  });

  it('should not unescape normal field name', () => {
    // Arrange
    const name = 'test name';
    const expectedResult = 'test name';

    // Act
    const result = unescapeFieldName(name);

    // Assert
    expect(result).toEqual(expectedResult);
  });
  it('should not unescape the field name with " ', () => {
    // Arrange
    const name = 'test \'"name\'"';
    const expectedResult = 'test \'"name\'"';

    // Act
    const result = unescapeFieldName(name);

    // Assert
    expect(result).toEqual(expectedResult);
  });
  it('should unescape the field name with [ and ] ', () => {
    // Arrange
    const name = "test '[name']";
    const expectedResult = 'test [name]';

    // Act
    const result = unescapeFieldName(name);

    // Assert
    expect(result).toEqual(expectedResult);
  });

  it('should unescape partially escaped field name with [ and ] ', () => {
    // Arrange
    const name = "test '[''value'''] from name']";
    const expectedResult = "test ['value'] from name]";

    // Act
    const result = unescapeFieldName(name);

    // Assert
    expect(result).toEqual(expectedResult);
  });
});
