import { verifyDslHasSameSetTablesAndFields } from '../verifyDslHasSameSetTablesAndFields';

describe('verifyDslHasSameSetTablesAndFields', () => {
  it('should return false if new dsl is correct', () => {
    // Arrange
    const dsl = 'table t1 key [f1]=1 [f2]=2 table t2 [f1]=1';
    const newDsl = 'table t1 key [f1]=1 [f2]=2 table t2 [f1]=1';

    // Act
    const result = verifyDslHasSameSetTablesAndFields(dsl, newDsl);

    // Assert
    expect(result).toBeFalsy();
  });

  it('should return false if both dsl are the same', () => {
    // Arrange
    const dsl = 'table t1 key [f1]=1 [f2]=2 table t2 [f1]=1';

    // Act
    const result = verifyDslHasSameSetTablesAndFields(dsl, dsl);

    // Assert
    expect(result).toBeFalsy();
  });

  it('should return true if number of tables are different', () => {
    // Arrange
    const dsl = 'table t1 key [f1]=1 [f2]=2 table t2 [f1]=1';
    const newDsl = 'table t1 key [f1]=1 [f2]=2 table t2 [f1]=1 table t3 [f]=22';

    // Act
    const result = verifyDslHasSameSetTablesAndFields(dsl, newDsl);

    // Assert
    expect(result).toBeTruthy();
  });

  it('should return true if table names are different', () => {
    // Arrange
    const dsl = 'table t1 key [f1]=1 [f2]=2 table t2 [f1]=1';
    const newDsl = 'table t111 key [f1]=1 [f2]=2 table t2 [f1]=1';

    // Act
    const result = verifyDslHasSameSetTablesAndFields(dsl, newDsl);

    // Assert
    expect(result).toBeTruthy();
  });

  it('should return true if field names count are different', () => {
    // Arrange
    const dsl = 'table t1 key [f1]=1 [f2]=2 table t2 [f1]=1';
    const newDsl = 'table t1 key [f1]=1 [f2]=2 [f3]=3 table t2 [f1]=1';

    // Act
    const result = verifyDslHasSameSetTablesAndFields(dsl, newDsl);

    // Assert
    expect(result).toBeTruthy();
  });

  it('should return true if field names are different', () => {
    // Arrange
    const dsl = 'table t1 key [f1]=1 [f2]=2 table t2 [f1]=1';
    const newDsl = 'table t1 key [f111]=1 [f2]=2 table t2 [f1]=1';

    // Act
    const result = verifyDslHasSameSetTablesAndFields(dsl, newDsl);

    // Assert
    expect(result).toBeTruthy();
  });
});
