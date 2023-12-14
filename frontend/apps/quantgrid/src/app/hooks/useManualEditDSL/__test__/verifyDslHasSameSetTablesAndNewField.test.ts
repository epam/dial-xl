import { verifyDslHasSameSetTablesAndNewField } from '../verifyDslHasSameSetTablesAndNewField';

describe('verifyDslHasSameSetTablesAndNewField', () => {
  it('should return false if one field added into target table', () => {
    // Arrange
    const dsl = 'table t1 key [f1]=1 [f2]=2 table t2 [f1]=1';
    const newDsl = 'table t1 key [f1]=1 [f2]=2 [f3]=3 table t2 [f1]=1';

    // Act
    const result = verifyDslHasSameSetTablesAndNewField(dsl, newDsl, 't1');

    // Assert
    expect(result).toBeFalsy();
  });
});
