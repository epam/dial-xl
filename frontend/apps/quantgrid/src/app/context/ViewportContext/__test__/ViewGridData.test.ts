import { ColumnDataType, CompilationError } from '@frontend/common';
import { dynamicFieldName, SheetReader } from '@frontend/parser';

import { ViewGridData } from '../ViewGridData';
import {
  generateTablesWithData,
  getFirstTableFromDSL,
  getTablesFromDSL,
} from './utils';

describe('ViewGridData', () => {
  let viewGridData: ViewGridData;

  beforeEach(() => {
    viewGridData = new ViewGridData();
  });

  describe('updateTableMeta', () => {
    it("should init table data if table doesn't exists", () => {
      // Arrange
      const dsl = `
            table test
                [column1] = 1
                [column2] = 2
        `;
      const parsedSheet = SheetReader.parseSheet(dsl);
      const table = parsedSheet.tables[0];

      // Act
      viewGridData.updateTableMeta(table);

      // Assert
      const tableData = viewGridData.getTableData('test');
      expect(tableData).toEqual({
        table,
        chunks: {},
        fallbackChunks: {},

        nestedColumnNames: new Set(),
        isDynamicFieldsRequested: false,

        total: {},
        totalRows: 0,
        types: {},
        columnReferenceTableNames: {},

        fieldErrors: {},
      });
    });

    it('should move actual data to fallback data in case of changing table definition', () => {
      // Arrange
      const dsl = `
        table test
            [column1] = 1
            [column2] = 2
            [column3] = 3
        `;
      const table = getFirstTableFromDSL(dsl);
      const tablesWithData = generateTablesWithData(dsl, { rowCount: 30 });

      // Act
      viewGridData.updateTableMeta(table);
      tablesWithData.columnUpdates.forEach((columnUpdate) => {
        viewGridData.saveNewColumnData(columnUpdate);
      });

      const previousTableData = { ...viewGridData.getTableData('test') };
      viewGridData.updateTableMeta(table);

      // Assert
      const actualTableData = viewGridData.getTableData('test');

      expect(previousTableData).not.toBeUndefined();
      expect(actualTableData).not.toBeUndefined();
      // should clear actual chunks
      expect(actualTableData.chunks).toEqual({});
      expect(actualTableData.fallbackChunks).toEqual(previousTableData.chunks);
    });

    it('should remove not existing fields from chunks after update table definition', () => {
      // Arrange
      const dsl = `
        table test
          [column1] = 1
          [column2] = 2
          [column3] = 3`;

      const newDsl = `
        table test
          [newField] = 1
          [newField2] = 2
          [something] = 3
      `;
      const table = getFirstTableFromDSL(dsl);
      const newTable = getFirstTableFromDSL(newDsl);
      const tablesWithData = generateTablesWithData(dsl, { rowCount: 150 });

      // Act
      viewGridData.updateTableMeta(table);
      tablesWithData.columnUpdates.forEach((columnUpdate) => {
        viewGridData.saveNewColumnData(columnUpdate);
      });

      viewGridData.updateTableMeta(newTable);

      // Assert
      const actualTableData = viewGridData.getTableData('test');
      expect(actualTableData.chunks).toEqual({});

      for (const chunkIndex in actualTableData.fallbackChunks) {
        const chunk = actualTableData.fallbackChunks[chunkIndex];

        const hasSomeFieldFromPreviousTableDefinition = table.fields.some(
          ({ key: { fieldName } }) => fieldName in chunk
        );

        expect(hasSomeFieldFromPreviousTableDefinition).toBe(false);
      }
    });
  });

  describe('saveNewColumnData', () => {
    it('should create 1 chunk if size smaller < chunkSize', () => {
      // Arrange
      const dsl = `
        table t1
          [f1] = 1
          [f2] = 2
          [f3] = 3
      `;

      const { columnUpdates } = generateTablesWithData(dsl, { rowCount: 40 });
      const table = getFirstTableFromDSL(dsl);

      // Act
      viewGridData.updateTableMeta(table);
      columnUpdates.forEach((columnUpdate) =>
        viewGridData.saveNewColumnData(columnUpdate)
      );

      // Assert
      const tableData = viewGridData.getTableData(table.tableName);
      expect(Object.keys(tableData.chunks).length).toBe(1);
    });
    it('should create 2 chunks if summary size of data bigger than chunkSize', () => {
      // Arrange
      const dsl = `
            table t1
              [f1] = 1
              [f2] = 2
              [f3] = 3
          `;

      const { columnUpdates } = generateTablesWithData(dsl, { rowCount: 150 });
      const table = getFirstTableFromDSL(dsl);

      // Act
      viewGridData.updateTableMeta(table);
      columnUpdates.forEach((columnUpdate) =>
        viewGridData.saveNewColumnData(columnUpdate)
      );

      // Assert
      const tableData = viewGridData.getTableData(table.tableName);
      expect(Object.keys(tableData.chunks).length).toBe(1);
    });
    it('should create 10 chunks if summary size of data ~10 chunkSizes', () => {
      // Arrange
      const dsl = `
            table t1
              [f1] = 1
              [f2] = 2
              [f3] = 3
          `;

      const { columnUpdates } = generateTablesWithData(dsl, { rowCount: 1000 });
      const table = getFirstTableFromDSL(dsl);

      // Act
      viewGridData.updateTableMeta(table);
      columnUpdates.forEach((columnUpdate) =>
        viewGridData.saveNewColumnData(columnUpdate)
      );

      // Assert
      const tableData = viewGridData.getTableData(table.tableName);
      expect(Object.keys(tableData.chunks).length).toBe(2);
    });
    it('should insert chunks in right index if data come not from the start', () => {
      // Arrange
      const dsl = `
            table t1
              [f1] = 1
              [f2] = 2
              [f3] = 3
          `;

      const { columnUpdates } = generateTablesWithData(dsl, { rowCount: 4000 });
      const table = getFirstTableFromDSL(dsl);

      // skip 2 first batches
      const columnUpdatesWithoutTopBatches = columnUpdates.filter(
        (columnUpdate) => +columnUpdate.startRow >= 2000
      );

      // Act
      viewGridData.updateTableMeta(table);
      columnUpdatesWithoutTopBatches.forEach((columnUpdate) =>
        viewGridData.saveNewColumnData(columnUpdate)
      );

      // Assert
      const tableData = viewGridData.getTableData(table.tableName);

      expect(Object.keys(tableData.chunks).length).toBe(4);
      expect(tableData.chunks[0]).toBeUndefined();
      expect(tableData.chunks[1]).toBeUndefined();
      expect(tableData.chunks[2]).toBeUndefined();
      expect(tableData.chunks[3]).toBeUndefined();
      expect(tableData.chunks[4]).not.toBeUndefined();
      expect(tableData.chunks[5]).not.toBeUndefined();
      expect(tableData.chunks[6]).not.toBeUndefined();
      expect(tableData.chunks[7]).not.toBeUndefined();
    });
    it('should place chunks in right order if data comes not in right order', () => {
      // Arrange
      const dsl = `
            table t1
              [f1] = 1
              [f2] = 2
              [f3] = 3
          `;

      const { columnUpdates } = generateTablesWithData(dsl, { rowCount: 400 });
      const table = getFirstTableFromDSL(dsl);
      const columnUpdatesTopBatch = columnUpdates.filter(
        (columnUpdate) => +columnUpdate.startRow < 200
      );
      const columnUpdatesBottomBatch = columnUpdates.filter(
        (columnUpdate) => +columnUpdate.startRow >= 200
      );

      // Act
      viewGridData.updateTableMeta(table);
      columnUpdatesBottomBatch.forEach((columnUpdate) =>
        viewGridData.saveNewColumnData(columnUpdate)
      );
      columnUpdatesTopBatch.forEach((columnUpdate) =>
        viewGridData.saveNewColumnData(columnUpdate)
      );

      // Assert
      const tableData = viewGridData.getTableData(table.tableName);
      expect(Object.keys(tableData.chunks).length).toBe(1);
      expect(tableData.chunks[0]).not.toBeUndefined();
    });
    it('should clear fallback column data if new data come', () => {
      // Arrange
      const dsl = `
            table t1
              [f1] = 1
              [f2] = 2
              [f3] = 3
          `;

      const { columnUpdates } = generateTablesWithData(dsl, { rowCount: 100 });
      const table = getFirstTableFromDSL(dsl);
      const columnUpdatesOnlyOnFieldF1 = columnUpdates.filter(
        (columnUpdate) => columnUpdate.fieldKey?.field === 'f1'
      );
      // Act
      viewGridData.updateTableMeta(table);
      columnUpdates.forEach((columnUpdate) =>
        viewGridData.saveNewColumnData(columnUpdate)
      );
      viewGridData.updateTableMeta(table);
      columnUpdatesOnlyOnFieldF1.forEach((columnUpdate) =>
        viewGridData.saveNewColumnData(columnUpdate)
      );

      // Assert
      const tableData = viewGridData.getTableData(table.tableName);
      expect(Object.keys(tableData.chunks).length).toBe(1);
      expect(Object.keys(tableData.chunks[0]).length).toBe(1);
      expect(Object.keys(tableData.chunks[0])).toEqual(['f1']);

      expect(Object.keys(tableData.fallbackChunks).length).toBe(1);
      expect(Object.keys(tableData.fallbackChunks[0]).length).toBe(2);
      expect(Object.keys(tableData.fallbackChunks[0])).toEqual(['f2', 'f3']);
    });
    it('should save dynamic fields', () => {
      // Arrange
      const dsl = `
            table t1
              key dim [country] = Countries[country]
              [rows] = InputData.FILTER([country] == $[country])
              [Communication Ext] = EXTRAPOLATE([Communication])
              [*] = PIVOT([rows], $[indicator], PERIODSERIES($, $[time], $[value], "YEAR"))
          `;

      const table = getFirstTableFromDSL(dsl);
      const dynamicFields = ['f1', 'f2', 'f3', 'f4'];

      // Act
      viewGridData.updateTableMeta(table);
      viewGridData.saveNewColumnData({
        fieldKey: {
          table: table.tableName,
          field: dynamicFieldName,
        },
        data: dynamicFields,
        endRow: '4',
        startRow: '0',
        totalRows: '4',
        isNested: false,
        errorMessage: '',
        type: ColumnDataType.STRING,
        referenceTableName: '',
        periodSeries: [],
        isPending: false,
        version: 0,
      });

      // Assert
      const tableDynamicFields = viewGridData.getTableDynamicFields(
        table.tableName
      );
      const tableData = viewGridData.getTableData(table.tableName);
      expect(tableDynamicFields).toEqual(dynamicFields);
      expect(tableData.isDynamicFieldsRequested).toBeTruthy();
    });
    it('should update runtime errors', () => {
      // Arrange
      const dsl = `
            table t1
              [f1] = 1
              [f2] = 2
              [f3] = 3
              [f4] = 3

            table t5
              [f1] = 1
              [f2] = 2
              [f3] = 3
              [f4] = 3
          `;

      const { columnUpdates } = generateTablesWithData(dsl, {
        rowCount: 40,
        hasErrors: true,
      });
      const tables = getTablesFromDSL(dsl);
      const fieldErrorsFromData = [];

      // Act
      tables.forEach((table) => {
        viewGridData.updateTableMeta(table);
      });
      columnUpdates.forEach((columnUpdate) => {
        if (columnUpdate.errorMessage) {
          fieldErrorsFromData.push({
            fieldKey: columnUpdate.fieldKey,
            errorMessage: columnUpdate.errorMessage,
          });
        }
        viewGridData.saveNewColumnData(columnUpdate);
      });
      viewGridData.updateTableOrder(tables.map((i) => i.tableName));

      // Assert
      const runtimeErrors = viewGridData.getRuntimeErrors();
      expect(runtimeErrors.length).toBe(fieldErrorsFromData.length);
    });

    it("should remove runtime error if field has update for field which currently doesn't have error", () => {
      // Arrange
      const dsl = `
            table t1
              [f1] = 1
              [f2] = 2
              [f3] = 3
              [f4] = 3
          `;

      const { columnUpdates } = generateTablesWithData(dsl, {
        rowCount: 40,
        hasErrors: true,
      });
      const table = getFirstTableFromDSL(dsl);

      // Act
      viewGridData.updateTableMeta(table);
      columnUpdates.forEach((columnUpdate) => {
        viewGridData.saveNewColumnData(columnUpdate);
      });
      columnUpdates.forEach((columnUpdate) => {
        if (columnUpdate.errorMessage) {
          viewGridData.saveNewColumnData({
            ...columnUpdate,
            errorMessage: undefined,
          });
        }
      });

      // Assert
      const runtimeErrors = viewGridData.getRuntimeErrors();
      expect(runtimeErrors.length).toBe(0);
    });
  });

  describe('toGridData', () => {
    it('should show tables from actual data', () => {
      // Arrange
      const dsl = `
      !layout(5, 5, "title", "headers")
      table this_table
        [f1] = 1
        [f2] = 2
        [f3] = 3
        [f4] = 4
        [f5] = 4

      !layout(10, 10, "title", "headers")
      table another_table
        [somef] = 1
        [wtf1] = 2
        [sss] = 3
        [dddd] = 4
      `;
      const { columnUpdates, tablesWithData } = generateTablesWithData(dsl, {
        rowCount: 100,
      });
      const viewport = {
        startRow: 0,
        startCol: 0,
        endRow: 100,
        endCol: 100,
      };

      // Act
      tablesWithData.forEach(({ table }) => {
        viewGridData.updateTableMeta(table);
      });
      columnUpdates.forEach((columnUpdate) => {
        viewGridData.saveNewColumnData(columnUpdate);
      });
      viewGridData.updateTableOrder(
        tablesWithData.map(({ table }) => table.tableName)
      );

      // Assert
      const gridData = viewGridData.toGridData(viewport);

      tablesWithData.forEach(({ table, data }) => {
        const [startRow, startCol] = table.getPlacement();
        // has tableName
        expect(gridData[startRow][startCol]?.value).toBe(table.tableName);

        table.fields.forEach(({ key: { fieldName } }, index) => {
          const currentCol = startCol + index;
          const currentRow = startRow + 1;

          // has fields headers
          expect(gridData[currentRow][currentCol]?.value).toBe(fieldName);

          const columnData = data[fieldName];

          for (let i = 0; i < columnData.length; ++i) {
            // has received data in columns
            expect(gridData[currentRow + i + 1][currentCol]?.value).toBe(
              columnData[i]
            );
          }
        });
      });
    });
    it('should show tables from fallback data', () => {
      // Arrange
      const dsl = `
      !layout(5, 5, "title", "headers")
      table this_table
        [f1] = 1
        [f2] = 2
        [f3] = 3
        [f4] = 4
        [f5] = 4

      !layout(10, 10, "title", "headers")
      table another_table
        [somef] = 1
        [wtf1] = 2
        [sss] = 3
        [dddd] = 4
      `;
      const { columnUpdates, tablesWithData } = generateTablesWithData(dsl, {
        rowCount: 100,
      });
      const viewport = {
        startRow: 0,
        startCol: 0,
        endRow: 100,
        endCol: 100,
      };

      // Act
      tablesWithData.forEach(({ table }) => {
        viewGridData.updateTableMeta(table);
      });
      columnUpdates.forEach((columnUpdate) => {
        viewGridData.saveNewColumnData(columnUpdate);
      });
      // triggering moving data to fallback
      tablesWithData.forEach(({ table }) => {
        viewGridData.updateTableMeta(table);
      });
      viewGridData.updateTableOrder(
        tablesWithData.map(({ table }) => table.tableName)
      );

      // Assert
      const gridData = viewGridData.toGridData(viewport);

      tablesWithData.forEach(({ table, data }) => {
        const [startRow, startCol] = table.getPlacement();
        // has tableName
        expect(gridData[startRow][startCol]?.value).toBe(table.tableName);

        table.fields.forEach(({ key: { fieldName } }, index) => {
          const currentCol = startCol + index;
          const currentRow = startRow + 1;

          // has fields headers
          expect(gridData[currentRow][currentCol]?.value).toBe(fieldName);

          const columnData = data[fieldName];

          for (let i = 0; i < columnData.length; ++i) {
            // has received data in columns
            expect(gridData[currentRow + i + 1][currentCol]?.value).toBe(
              columnData[i]
            );
          }
        });
      });
    });
    it('should show table data from actual and from fallback data', () => {
      // Arrange
      const dsl = `
      !layout(5, 5, "title", "headers")
      table this_table
        [f1] = 1
        [f2] = 2
        [f3] = 3
        [f4] = 4
        [f5] = 4

      !layout(10, 10, "title", "headers")
      table another_table
        [somef] = 1
        [wtf1] = 2
        [sss] = 3
        [dddd] = 4
      `;
      const { columnUpdates, tablesWithData } = generateTablesWithData(dsl, {
        rowCount: 100,
      });
      const viewport = {
        startRow: 0,
        startCol: 0,
        endRow: 100,
        endCol: 100,
      };

      const firstBatch = columnUpdates.filter(
        (_, index) => index < columnUpdates.length / 2
      );
      const secondBatch = columnUpdates.filter(
        (_, index) => index >= columnUpdates.length / 2
      );

      // Act
      tablesWithData.forEach(({ table }) => {
        viewGridData.updateTableMeta(table);
      });
      firstBatch.forEach((columnUpdate) => {
        viewGridData.saveNewColumnData(columnUpdate);
      });
      // triggering moving data to fallback
      tablesWithData.forEach(({ table }) => {
        viewGridData.updateTableMeta(table);
      });
      secondBatch.forEach((columnUpdate) => {
        viewGridData.saveNewColumnData(columnUpdate);
      });
      viewGridData.updateTableOrder(
        tablesWithData.map(({ table }) => table.tableName)
      );

      // Assert
      const gridData = viewGridData.toGridData(viewport);

      tablesWithData.forEach(({ table, data }) => {
        const [startRow, startCol] = table.getPlacement();
        // has tableName
        expect(gridData[startRow][startCol]?.value).toBe(table.tableName);

        table.fields.forEach(({ key: { fieldName } }, index) => {
          const currentCol = startCol + index;
          const currentRow = startRow + 1;

          // has fields headers
          expect(gridData[currentRow][currentCol]?.value).toBe(fieldName);

          const columnData = data[fieldName];

          for (let i = 0; i < columnData.length; ++i) {
            // has received data in columns
            expect(gridData[currentRow + i + 1][currentCol]?.value).toBe(
              columnData[i]
            );
          }
        });
      });
    });
  });

  describe('setCompilationErrors', () => {
    it('should add compilation error to ViewGridData', () => {
      // Arrange
      const dsl = `
        table t1
          [f1] = 1
      `;
      const errors = [
        {
          tableName: 't1',
          fieldName: 'f1',
          message: 'Compilation error',
        },
      ];

      const { columnUpdates } = generateTablesWithData(dsl, { rowCount: 100 });
      const table = getFirstTableFromDSL(dsl);

      // Act
      viewGridData.updateTableMeta(table);
      columnUpdates.forEach((columnUpdate) =>
        viewGridData.saveNewColumnData(columnUpdate)
      );
      viewGridData.setCompilationErrors(errors);

      // Assert
      const compilationErrors = viewGridData.getCompilationErrors();
      expect(compilationErrors).toBe(errors);
    });
  });

  it('should remove all field chunks with compilation error', () => {
    // Arrange
    const dsl = `
        table t1
          [f1] = 1
          [f2] = 2
          [f3] = 3
      `;
    const errors: CompilationError[] = [
      {
        fieldKey: {
          field: 'f2',
          table: 't1',
        },
        message: 'Compilation error',
      },
      {
        fieldKey: {
          field: 'f3',
          table: 't1',
        },
        message: 'Compilation error',
      },
    ];

    const { columnUpdates } = generateTablesWithData(dsl, { rowCount: 100 });
    const table = getFirstTableFromDSL(dsl);

    // Act
    viewGridData.updateTableMeta(table);
    columnUpdates.forEach((columnUpdate) =>
      viewGridData.saveNewColumnData(columnUpdate)
    );
    viewGridData.setCompilationErrors(errors);

    // Assert
    const tableData = viewGridData.getTableData(table.tableName);
    expect(Object.keys(tableData.chunks).length).toBe(1);
    expect(Object.keys(tableData.chunks[0])).toStrictEqual(['f1']);
  });
});
