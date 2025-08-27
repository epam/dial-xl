import { ChartType, SelectedChartKey } from '@frontend/common';
import { SheetReader } from '@frontend/parser';

import { ViewGridData } from '../../context';
import {
  applySelectorFiltersToChartTables,
  createVirtualChartTableDSL,
  createVirtualHistogramChartTableDSL,
} from '../chart';

describe('createVirtualHistogramChartTableDSL', () => {
  it('should create table dsl for histogram chart', () => {
    // Arrange
    const dsl = 'table t1 [f1]=1';
    const parsedDsl = SheetReader.parseSheet(dsl);
    const parsedTable = parsedDsl.tables[0];

    // Act
    const result = createVirtualHistogramChartTableDSL(
      parsedTable,
      'virtualTableName',
      'f1',
      10
    );

    // Assert
    const expectedDSL = `
table virtualTableName
  dim [BucketNumber] = RANGE(10)
  [LowerBound] = t1[f1].MIN() + ([BucketNumber] - 1) * (t1[f1].MAX() - t1[f1].MIN()) / 10
  [UpperBound] = t1[f1].MIN() + [BucketNumber] * (t1[f1].MAX() - t1[f1].MIN()) / 10
  [RowCount] = t1.FILTER( $[f1] >= [LowerBound] AND ([BucketNumber] = 10 OR $[f1] < [UpperBound])).COUNT()
`.replaceAll('\r\n', '\n');

    expect(result.replaceAll('\r\n', '\n').trim()).toBe(expectedDSL.trim());
  });
});

describe('createVirtualChartTableDSL', () => {
  it('should create table dsl for chart data', () => {
    // Arrange
    const dsl = 'table t1 [f1]=1';
    const parsedDsl = SheetReader.parseSheet(dsl);
    const parsedTable = parsedDsl.tables[0];
    const parsedField = parsedTable.fields[0];

    // Act
    const result = createVirtualChartTableDSL(
      parsedTable,
      parsedField,
      'virtualTableName'
    );

    // Assert
    const expectedDSL = `
table virtualTableName
  dim [f1] = t1[f1].UNIQUE()
  [has_values] = t1.FILTER([f1] = $[f1]).COUNT() > 0
apply
sort -[has_values],[f1]
`.replaceAll('\r\n', '\n');

    expect(result.replaceAll('\r\n', '\n').trim()).toBe(expectedDSL.trim());
  });

  it('should include other field filters in has_values formula', () => {
    // Arrange
    const dsl = `
table t1
  [f1]=1
  !selector(2)
  [f2]=2
  !selector(3)
  [f3]=3
`;
    const parsedDsl = SheetReader.parseSheet(dsl);
    const parsedTable = parsedDsl.tables[0];
    const parsedField = parsedTable.fields[0];

    // Act
    const result = createVirtualChartTableDSL(
      parsedTable,
      parsedField,
      'virtualTableName'
    );

    // Assert
    const expectedDSL = `
table virtualTableName
  dim [f1] = t1[f1].UNIQUE()
  [has_values] = t1.FILTER($[f2] = "2" AND $[f3] = "3" AND [f1] = $[f1]).COUNT() > 0
apply
sort -[has_values],[f1]
`.replaceAll('\r\n', '\n');

    expect(result.replaceAll('\r\n', '\n').trim()).toBe(expectedDSL.trim());
  });
});

describe('applySelectorFiltersToChartTables', () => {
  const mockViewGridData = {
    getTableData: () => ({
      types: {
        f1: 'string',
        f2: 'number',
      },
    }),
  } as unknown as ViewGridData;

  const selectedKeys: SelectedChartKey[] = [
    {
      tableName: 't1',
      fieldName: 'f1',
      key: 'value1',
      chartType: ChartType.BAR,
    },
    { tableName: 't1', fieldName: 'f2', key: '123', chartType: ChartType.BAR },
  ];

  it('should add new apply section with filter when no apply exists', () => {
    // Arrange
    const dsl = `
table t1
  [f1]=1
  [f2]=2`;
    const parsedDsl = SheetReader.parseSheet(dsl);
    const editableSheet = parsedDsl.editableSheet;
    const parsedTable = parsedDsl.tables[0];

    // Act
    const result = applySelectorFiltersToChartTables(
      editableSheet,
      dsl,
      parsedTable,
      selectedKeys,
      mockViewGridData
    );

    // Assert
    const expectedDSL = `
table t1
  [f1]=1
  [f2]=2
apply
filter [f1] = "value1" AND [f2] = "123"`.replaceAll('\r\n', '\n');

    expect(result.replaceAll('\r\n', '\n').trim()).toBe(expectedDSL.trim());
  });

  it('should add filter to existing apply section when no filter exists', () => {
    // Arrange
    const dsl = `
table t1
  [f1]=1
  [f2]=2
apply
sort [f1]`;
    const parsedDsl = SheetReader.parseSheet(dsl);
    const editableSheet = parsedDsl.editableSheet;
    const parsedTable = parsedDsl.tables[0];

    // Act
    const result = applySelectorFiltersToChartTables(
      editableSheet,
      dsl,
      parsedTable,
      selectedKeys,
      mockViewGridData
    );

    // Assert
    const expectedDSL = `
table t1
  [f1]=1
  [f2]=2
apply
sort [f1]
filter [f1] = "value1" AND [f2] = "123"
`.replaceAll('\r\n', '\n');

    expect(result.replaceAll('\r\n', '\n').trim()).toBe(expectedDSL.trim());
  });

  it('should combine new filter with existing filter when filter exists', () => {
    // Arrange
    const dsl = `
table t1
  [f1]=1
  [f2]=2
apply
sort [f1]
filter [f3] = "existing"
`;
    const parsedDsl = SheetReader.parseSheet(dsl);
    const editableSheet = parsedDsl.editableSheet;
    const parsedTable = parsedDsl.tables[0];

    // Act
    const result = applySelectorFiltersToChartTables(
      editableSheet,
      dsl,
      parsedTable,
      selectedKeys,
      mockViewGridData
    );

    // Assert
    const expectedDSL = `
table t1
  [f1]=1
  [f2]=2
apply
sort [f1]
filter ([f3] = "existing") AND [f1] = "value1" AND [f2] = "123"
`.replaceAll('\r\n', '\n');

    expect(result.replaceAll('\r\n', '\n').trim()).toBe(expectedDSL.trim());
  });
});
