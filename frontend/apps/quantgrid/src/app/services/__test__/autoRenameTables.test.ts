import { autoRenameTables, getAllTableNames } from '../autoRenameTables';

const sheetName = 'sheet1';
const projectSheets = [
  {
    sheetName,
    content: '',
    projectName: 'project1',
    version: 1,
    isDeleted: false,
  },
];

describe('autoRenameTables', () => {
  it('should rename duplicated table', () => {
    // Arrange
    const dsl = 'table t1 [f1]=1\r\ntable t1 [f2]=2';
    const expectedDsl = 'table t1 [f1]=1\r\ntable t2 [f2]=2';

    // Act
    const result = autoRenameTables(dsl, sheetName, projectSheets);

    // Assert
    expect(result).toBe(expectedDsl);
  });

  it('should rename multiple duplicated table', () => {
    // Arrange
    const dsl = 'table t1 [f1]=1\r\ntable t1 [f2]=2\r\ntable t1 [f3]=2';
    const expectedDsl = 'table t1 [f1]=1\r\ntable t2 [f2]=2\r\ntable t3 [f3]=2';

    // Act
    const result = autoRenameTables(dsl, sheetName, projectSheets);

    // Assert
    expect(result).toBe(expectedDsl);
  });

  it('should rename duplicated table with name in quotes', () => {
    // Arrange
    const dsl = `table 't1 1' [f1]=1\r\ntable 't1 1' [f2]=2`;
    const expectedDsl = `table 't1 1' [f1]=1\r\ntable 't1 2' [f2]=2`;

    // Act
    const result = autoRenameTables(dsl, sheetName, projectSheets);

    // Assert
    expect(result).toBe(expectedDsl);
  });

  it('should return same dsl if no duplicated fields', () => {
    // Arrange
    const dsl = 'table t1 [f1]=1\r\ntable t2 [f2]=2';

    // Act
    const result = autoRenameTables(dsl, sheetName, projectSheets);

    // Assert
    expect(result).toBe(dsl);
  });

  it('should return same dsl if unable to parse dsl', () => {
    // Arrange
    const dsl = '!tablet1 [f1]=2';

    // Act
    const result = autoRenameTables(dsl, sheetName, projectSheets);

    // Assert
    expect(result).toBe(dsl);
  });
});

describe('getAllTableNames', () => {
  it('should return table names if sheets are broken', () => {
    // Arrange
    const sheets = [
      {
        sheetName: 'Sheet1',
        content: 'table t1 [f1]=1\r\ntable t2 [f2]=2',
        projectName: 'project1',
        version: 1,
        isDeleted: false,
      },
      {
        sheetName: 'Sheet2',
        content: 'table t3 [f1]=1\r\ntable t4 [f2]=2',
        projectName: 'project1',
        version: 1,
        isDeleted: false,
      },
      {
        sheetName: 'Sheet3',
        content: 'tablet5 [f1]=1\r\ntable t6 [f2]=2',
        projectName: 'project1',
        version: 1,
        isDeleted: false,
      },
    ];
    const expectedTableNames = ['t1', 't2', 't3', 't4'];

    // Act
    const result = getAllTableNames(sheets);

    // Assert
    expect(result).toStrictEqual(expectedTableNames);
  });

  it('should return all table names', () => {
    // Arrange
    const sheets = [
      {
        sheetName: 'Sheet1',
        content: 'table t1 [f1]=1\r\ntable t2 [f2]=2',
        projectName: 'project1',
        version: 1,
        isDeleted: false,
      },
      {
        sheetName: 'Sheet2',
        content: 'table t3 [f1]=1\r\ntable t4 [f2]=2',
        projectName: 'project1',
        version: 1,
        isDeleted: false,
      },
      {
        sheetName: 'Sheet3',
        content: 'table t5 [f1]=1\r\ntable t6 [f2]=2',
        projectName: 'project1',
        version: 1,
        isDeleted: false,
      },
    ];
    const expectedTableNames = ['t1', 't2', 't3', 't4', 't5', 't6'];

    // Act
    const result = getAllTableNames(sheets);

    // Assert
    expect(result).toStrictEqual(expectedTableNames);
  });

  it('should unquote simple quoted table name', () => {
    // Arrange
    const dsl = `table 'T1' [f1]=1`;
    const expectedDsl = `table T1 [f1]=1`;

    // Act
    const result = autoRenameTables(dsl, sheetName, projectSheets);

    // Assert
    expect(result).toBe(expectedDsl);
  });
});
