import { SheetReader } from '@frontend/parser';

import { createVirtualTableUniqueFieldValuesDSL } from '../filter';

describe('createVirtualTableUniqueFieldValuesDSL', () => {
  it('should create new tables for simple case without any apply in source table', () => {
    // Arrange
    const dsl = 'table t1 [f1]=1';
    const parsedDsl = SheetReader.parseSheet(dsl);
    const targetTable = parsedDsl.tables[0];
    const targetField = targetTable.fields[0];

    // Act
    const result = createVirtualTableUniqueFieldValuesDSL({
      sheetContent: dsl,
      table: targetTable,
      field: targetField,
      virtualTableName: 'virtualTableName',
      searchValue: '',
      sort: 1,
    });

    // Assert
    const expectedDSL = `
table virtualTableName_clone_source_table_without_full_apply [f1]=1

table virtualTableName_clone_source_table_with_other_apply [f1]=1



table virtualTableName
dim [f1] = virtualTableName_clone_source_table_without_full_apply[f1].UNIQUE()
[f1_filtered] = IN([f1], virtualTableName_clone_source_table_with_other_apply[f1])
apply
sort [f1]`.replaceAll('\n', '\r\n');
    expect(result.trim()).toBe(expectedDSL.trim());
  });

  it('should create new virtual tables with filtered values', () => {
    // Arrange
    const dsl =
      'table t1\r\n[f1]=1\r\n[f2]=2\r\napply\r\nfilter [f1]=1 AND [f2]=2';
    const parsedDsl = SheetReader.parseSheet(dsl);
    const targetTable = parsedDsl.tables[0];
    const targetField = targetTable.fields[0];

    // Act
    const result = createVirtualTableUniqueFieldValuesDSL({
      sheetContent: dsl,
      table: targetTable,
      field: targetField,
      virtualTableName: 'virtualTableName',
      searchValue: '',
      sort: 1,
    });

    // Assert
    const expectedDSL = `
table virtualTableName_clone_source_table_without_full_apply
[f1]=1
[f2]=2
apply


table virtualTableName_clone_source_table_with_other_apply
[f1]=1
[f2]=2
apply
filter [f2] = 2



table virtualTableName
dim [f1] = virtualTableName_clone_source_table_without_full_apply[f1].UNIQUE()
[f1_filtered] = IN([f1], virtualTableName_clone_source_table_with_other_apply[f1])
apply
sort [f1]`.replaceAll('\n', '\r\n');
    expect(result.trim()).toBe(expectedDSL.trim());
  });
  it('should create new virtual tables filtered by search query', () => {
    // Arrange
    const dsl = 'table t1\r\n[f1]=1\r\n[f2]=2';
    const parsedDsl = SheetReader.parseSheet(dsl);
    const targetTable = parsedDsl.tables[0];
    const targetField = targetTable.fields[0];

    // Act
    const result = createVirtualTableUniqueFieldValuesDSL({
      sheetContent: dsl,
      table: targetTable,
      field: targetField,
      virtualTableName: 'virtualTableName',
      searchValue: '12',
      sort: 1,
    });

    // Assert
    const expectedDSL = `
table virtualTableName_clone_source_table_without_full_apply
[f1]=1
[f2]=2

table virtualTableName_clone_source_table_with_other_apply
[f1]=1
[f2]=2



table virtualTableName
dim [f1] = virtualTableName_clone_source_table_without_full_apply[f1].UNIQUE()
[f1_filtered] = IN([f1], virtualTableName_clone_source_table_with_other_apply[f1])
apply
filter CONTAINS([f1].LOWER(),12)
sort [f1]`.replaceAll('\n', '\r\n');
    expect(result.trim()).toBe(expectedDSL.trim());
  });
  it('should create new virtual tables with negative sorting', () => {
    // Arrange
    const dsl = 'table t1\r\n[f1]=1\r\n[f2]=2';
    const parsedDsl = SheetReader.parseSheet(dsl);
    const targetTable = parsedDsl.tables[0];
    const targetField = targetTable.fields[0];

    // Act
    const result = createVirtualTableUniqueFieldValuesDSL({
      sheetContent: dsl,
      table: targetTable,
      field: targetField,
      virtualTableName: 'virtualTableName',
      searchValue: '',
      sort: -1,
    });

    // Assert
    const expectedDSL = `
table virtualTableName_clone_source_table_without_full_apply
[f1]=1
[f2]=2

table virtualTableName_clone_source_table_with_other_apply
[f1]=1
[f2]=2



table virtualTableName
dim [f1] = virtualTableName_clone_source_table_without_full_apply[f1].UNIQUE()
[f1_filtered] = IN([f1], virtualTableName_clone_source_table_with_other_apply[f1])
apply
sort -[f1]`.replaceAll('\n', '\r\n');
    expect(result.trim()).toBe(expectedDSL.trim());
  });
});
