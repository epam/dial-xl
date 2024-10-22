import { act, renderHook } from '@testing-library/react';

import { useManualCreateEntityDSL } from '../useManualCreateEntityDSL';
import { getWrapper } from './utils';

const props = {
  appendFn: jest.fn(),
  appendToFn: jest.fn(),
  updateSheetContent: jest.fn(() => true),
  manuallyUpdateSheetContent: jest.fn(() => true),
  projectName: 'project1',
  sheetName: 'sheet1',
  projectSheets: [],
};

function getRenderedHook(dsl: string, props: any) {
  const { result } = renderHook(() => useManualCreateEntityDSL(), {
    wrapper: getWrapper(dsl, props),
  });

  return result.current;
}

describe('useManualCreateEntityDSL', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    props.projectSheets = [];
  });

  describe('createDerivedTable', () => {
    it('should create derived table', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\r\n[f2]=2';
      const expectedDsl = `table t1 [f1]=1\r\n[f2]=2\r\n\r\n!placement(1, 4)\r\ntable t1_derived\r\n  dim [source] = t1\r\n  [f1] = [source][f1]\r\n  [f2] = [source][f2]\r\n`;
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.createDerivedTable('t1'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add derived table "t1_derived"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should create derived table from table with name in quotes', async () => {
      // Arrange
      const dsl = `table 'some table' [f1]=1\r\n[f2]=2`;
      const expectedDsl = `table 'some table' [f1]=1\r\n[f2]=2\r\n\r\n!placement(1, 4)\r\ntable 'some table_derived'\r\n  dim [source] = 'some table'\r\n  [f1] = [source][f1]\r\n  [f2] = [source][f2]\r\n`;
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.createDerivedTable(`'some table'`));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add derived table "'some table_derived'"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should do nothing if source table not found', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\r\n[f2]=2';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.createDerivedTable('t2'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).not.toHaveBeenCalled();
      expect(props.manuallyUpdateSheetContent).not.toHaveBeenCalled();
    });

    it('should create derived table with unique field names', async () => {
      // Arrange
      const dsl = 'table t1 [source]=1\r\n[f2]=2';
      const expectedDsl = `table t1 [source]=1\r\n[f2]=2\r\n\r\n!placement(1, 4)\r\ntable t1_derived\r\n  dim [source1] = t1\r\n  [source] = [source1][source]\r\n  [f2] = [source1][f2]\r\n`;
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.createDerivedTable('t1'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add derived table "t1_derived"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });

  describe('createTable', () => {
    it('should create table', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const expectedDsl = `table t1 [f1]=1\r\n\r\n!placement(5, 5)\r\ntable Table1\r\n  [Field1] = 2 + 2\r\n`;
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.createTable(5, 5, '= 2 + 2'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add table "Table1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should create table with unique name', async () => {
      // Arrange
      const dsl = 'table Table1 [f1]=1';
      const expectedDsl = `table Table1 [f1]=1\r\n\r\n!placement(5, 5)\r\ntable Table2\r\n  [f] = 2 + 2\r\n`;
      props.projectSheets = [
        {
          projectName: 'project1',
          sheetName: 'sheet1',
          content: dsl,
        },
      ] as never[];
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.createTable(5, 5, '[f] = 2 + 2'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add table "Table2"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should create table in a blank sheet', async () => {
      // Arrange
      const dsl = '';
      const expectedDsl = `!placement(5, 5)\r\ntable Table1\r\n  [Field1] = 2 + 2\r\n`;
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.createTable(5, 5, '= 2 + 2'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add table "Table1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });

  describe('createDimensionTable', () => {
    it('should create dimension table', async () => {
      // Arrange
      const dsl = 'table table1 [f1]=1';
      const expectedDsl = `table table1 [f1]=1\r\n\r\n!placement(4, 4)\r\ntable t2\r\n  dim [source1] = t3\r\n  dim [source2] = t4\r\n`;
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.createDimensionTable(4, 4, 't2:t3:t4'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add dimension table "t2"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should create dimension table with unique name', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const expectedDsl = `table t1 [f1]=1\r\n\r\n!placement(4, 4)\r\ntable t2\r\n  dim [source1] = t3\r\n  dim [source2] = t4\r\n`;
      props.projectSheets = [
        {
          projectName: 'project1',
          sheetName: 'sheet1',
          content: dsl,
        },
      ] as never[];
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.createDimensionTable(4, 4, 't1:t3:t4'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add dimension table "t2"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should create dimension table in a blank sheet', async () => {
      // Arrange
      const dsl = '';
      const expectedDsl = `!placement(4, 4)\r\ntable t1\r\n  dim [source1] = t2\r\n  dim [source2] = t3\r\n`;
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.createDimensionTable(4, 4, 't1:t2:t3'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add dimension table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should create dimension table at the beginning of the spreadsheet', async () => {
      // Arrange
      const dsl = 'table table1 [f1]=1';
      const expectedDsl = `table table1 [f1]=1\r\n\r\n!placement(1, 1)\r\ntable t2\r\n  dim [source1] = t3\r\n  dim [source2] = t4\r\n`;
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.createDimensionTable(0, 0, 't2:t3:t4'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add dimension table "t2"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should do nothing if unable to parse value', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.createDimensionTable(4, 4, 't1'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).not.toHaveBeenCalled();
      expect(props.manuallyUpdateSheetContent).not.toHaveBeenCalled();
    });
  });

  describe('createSingleValueManualTable', () => {
    it('should create manual table with numeric value', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const expectedDsl =
        'table t1 [f1]=1\r\n\r\n!hideHeader()\r\n!hideFields()\r\n!manual()\r\n!placement(4, 4)\r\ntable Table1\r\n  [Field1]\r\noverride\r\n[Field1]\r\n33\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.createSingleValueManualTable(4, 4, '33'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add manual table "Table1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should create manual table with string value', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const expectedDsl =
        'table t1 [f1]=1\r\n\r\n!hideHeader()\r\n!hideFields()\r\n!manual()\r\n!placement(4, 4)\r\ntable Table1\r\n  [Field1]\r\noverride\r\n[Field1]\r\n"some string"\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.createSingleValueManualTable(4, 4, 'some string'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add manual table "Table1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should create manual table with unique name', async () => {
      // Arrange
      const dsl = 'table Table1 [f1]=1';
      const expectedDsl =
        'table Table1 [f1]=1\r\n\r\n!hideHeader()\r\n!hideFields()\r\n!manual()\r\n!placement(4, 4)\r\ntable Table2\r\n  [Field1]\r\noverride\r\n[Field1]\r\n33\r\n';
      props.projectSheets = [
        {
          projectName: 'project1',
          sheetName: 'sheet1',
          content: dsl,
        },
      ] as never[];
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.createSingleValueManualTable(4, 4, '33'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add manual table "Table2"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should create manual table in a blank sheet', async () => {
      // Arrange
      const dsl = '';
      const expectedDsl =
        '!hideHeader()\r\n!hideFields()\r\n!manual()\r\n!placement(4, 4)\r\ntable Table1\r\n  [Field1]\r\noverride\r\n[Field1]\r\n33\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.createSingleValueManualTable(4, 4, '33'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add manual table "Table1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should create manual table with formula in override', async () => {
      // Arrange
      const dsl = 'table Table1 [f1]=1';
      const expectedDsl =
        'table Table1 [f1]=1\r\n\r\n!hideHeader()\r\n!hideFields()\r\n!manual()\r\n!placement(4, 4)\r\ntable Table2\r\n  [Field1]\r\noverride\r\n[Field1]\r\nCOUNT(T1)\r\n';
      props.projectSheets = [
        {
          projectName: 'project1',
          sheetName: 'sheet1',
          content: dsl,
        },
      ] as never[];
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.createSingleValueManualTable(4, 4, '=COUNT(T1)'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add manual table "Table2"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should create manual table with formula in override and specified table name', async () => {
      // Arrange
      const dsl = 'table Table1 [f1]=1';
      const expectedDsl =
        'table Table1 [f1]=1\r\n\r\n!hideFields()\r\n!manual()\r\n!placement(3, 4)\r\ntable customTableName\r\n  [Field1]\r\noverride\r\n[Field1]\r\nCOUNT(T1)\r\n';
      props.projectSheets = [
        {
          projectName: 'project1',
          sheetName: 'sheet1',
          content: dsl,
        },
      ] as never[];
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() =>
        hook.createSingleValueManualTable(4, 4, '=COUNT(T1)', 'customTableName')
      );
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add manual table "customTableName"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });

  describe('createManualTable', () => {
    it('should create manual table with 3 columns and 3 rows', async () => {
      // Arrange
      const dsl = '';
      const expectedDsl =
        '!manual()\r\n!placement(2, 4)\r\ntable Table1\r\n  [Field1]\r\n  [Field2]\r\n  [Field3]\r\noverride\r\n[Field1],[Field2],[Field3]\r\n1,11,111\r\n2,22,222\r\n3,33,333\r\n';
      const cells = [
        ['1', '11', '111'],
        ['2', '22', '222'],
        ['3', '33', '333'],
      ];
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.createManualTable(4, 4, cells));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add manual table "Table1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should create manual at the beginning of the spreadsheet', async () => {
      // Arrange
      const dsl = '';
      const expectedDsl =
        '!manual()\r\n!placement(1, 1)\r\ntable Table1\r\n  [Field1]\r\noverride\r\n[Field1]\r\n1\r\n';
      const cells = [['1']];
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.createManualTable(0, 0, cells));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add manual table "Table1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });

  describe('createDimensionalTableFromFormula', () => {
    it('should create dimension table from formula', async () => {
      // Arrange
      const dsl = 'table t1 [a]=1\r\n[b]=2\r\n[c]=3';
      const expectedDsl = `table t1 [a]=1\r\n[b]=2\r\n[c]=3\r\n\r\n!placement(5, 4)\r\ntable t2\r\n  dim [source] = t1\r\n  [a] = [source][a]\r\n  [b] = [source][b]\r\n  [c] = [source][c]\r\n`;
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() =>
        hook.createDimensionalTableFromFormula(
          4,
          5,
          't2',
          '',
          't1',
          ['a', 'b', 'c'],
          [],
          true
        )
      );
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add dimension table "t2"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should create dimension table and escape field names', async () => {
      // Arrange
      const dsl = 'table t1 [a]=1\r\n[b]=2\r\n[c]=3';
      const expectedDsl = `table t1 [a]=1\r\n[b]=2\r\n[c]=3\r\n\r\n!placement(5, 4)\r\ntable t2\r\n  dim [source] = t1\r\n  [a '[2000']] = [source][a '[2000']]\r\n  [b '[2001']] = [source][b '[2001']]\r\n  [c '[2002']] = [source][c '[2002']]\r\n`;
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() =>
        hook.createDimensionalTableFromFormula(
          4,
          5,
          't2',
          '',
          't1',
          ['a [2000]', 'b [2001]', 'c [2002]'],
          [],
          true
        )
      );
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add dimension table "t2"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should create dimension table and propagate keys', async () => {
      // Arrange
      const dsl = 'table t1 [a]=1\r\n[b]=2\r\n[c]=3';
      const expectedDsl = `table t1 [a]=1\r\n[b]=2\r\n[c]=3\r\n\r\n!placement(5, 4)\r\ntable t2\r\n  dim [source] = t1\r\n  key [a] = [source][a]\r\n  [b] = [source][b]\r\n  [c] = [source][c]\r\n`;
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() =>
        hook.createDimensionalTableFromFormula(
          4,
          5,
          't2',
          '',
          't1',
          ['a', 'b', 'c'],
          ['a'],
          true
        )
      );
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add dimension table "t2"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should create dimension table from formula in empty sheet and with empty schema', async () => {
      // Arrange
      const dsl = '';
      const expectedDsl = `!placement(5, 4)\r\ntable t1\r\n  dim [source] = RANGE(10)\r\n`;
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() =>
        hook.createDimensionalTableFromFormula(
          4,
          5,
          't1',
          '',
          'RANGE(10)',
          [],
          [],
          true
        )
      );
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add dimension table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should create table without dim source field from formula', async () => {
      // Arrange
      const dsl = 'table t1 [a]=1\r\n[b]=2\r\n[c]=3';
      const expectedDsl = `table t1 [a]=1\r\n[b]=2\r\n[c]=3\r\n\r\n!placement(5, 4)\r\ntable t2\r\n  [source] = t1\r\n  [a] = [source][a]\r\n  [b] = [source][b]\r\n  [c] = [source][c]\r\n`;
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() =>
        hook.createDimensionalTableFromFormula(
          4,
          5,
          't2',
          '',
          't1',
          ['a', 'b', 'c'],
          [],
          false
        )
      );
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add dimension table "t2"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });

  describe('createDimensionalTableFromSchema', () => {
    it('should create dimension table from schema', async () => {
      // Arrange
      const dsl = 'table t1 [a]=1\r\n[b]=2\r\n[c]=3';
      const expectedDsl = `table t1 [a]=1\r\n[b]=2\r\n[c]=3\r\n\r\n!placement(10, 5)\r\ntable 't1_(1,2,3)[b]'\r\n  dim [source] = t1.FIND(1,2,3)[b]\r\n  [a] = [source][a]\r\n  [b] = [source][b]\r\n  [c] = [source][c]\r\n`;
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() =>
        hook.createDimensionalTableFromSchema(
          5,
          10,
          't1',
          'b',
          '1,2,3',
          't1.FIND(1,2,3)[b]',
          ['a', 'b', 'c'],
          []
        )
      );
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add dimension table "t1_(1,2,3)[b]"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should create dimension table and escape field names', async () => {
      // Arrange
      const dsl = 'table t1 [a]=1\r\n[b]=2\r\n[c]=3';
      const expectedDsl = `table t1 [a]=1\r\n[b]=2\r\n[c]=3\r\n\r\n!placement(10, 5)\r\ntable 't1_(1,2,3)[b]'\r\n  dim [source] = t1.FIND(1,2,3)[b]\r\n  [a '[2000']] = [source][a '[2000']]\r\n  [b '[2001']] = [source][b '[2001']]\r\n  [c '[2002']] = [source][c '[2002']]\r\n`;
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() =>
        hook.createDimensionalTableFromSchema(
          5,
          10,
          't1',
          'b',
          '1,2,3',
          't1.FIND(1,2,3)[b]',
          ['a [2000]', 'b [2001]', 'c [2002]'],
          []
        )
      );
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add dimension table "t1_(1,2,3)[b]"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should create dimension table and propagate keys', async () => {
      // Arrange
      const dsl = 'table t1 [a]=1\r\n[b]=2\r\n[c]=3';
      const expectedDsl = `table t1 [a]=1\r\n[b]=2\r\n[c]=3\r\n\r\n!placement(10, 5)\r\ntable 't1_(1,2,3)[b]'\r\n  dim [source] = t1.FIND(1,2,3)[b]\r\n  key [a] = [source][a]\r\n  [b] = [source][b]\r\n  [c] = [source][c]\r\n`;
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() =>
        hook.createDimensionalTableFromSchema(
          5,
          10,
          't1',
          'b',
          '1,2,3',
          't1.FIND(1,2,3)[b]',
          ['a', 'b', 'c'],
          ['a']
        )
      );
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add dimension table "t1_(1,2,3)[b]"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });

  describe('createRowReferenceTableFromSchema', () => {
    it('should create row reference table from schema', async () => {
      // Arrange
      const dsl = 'table t1 [a]=1\r\n[b]=2\r\n[c]=3';
      const expectedDsl = `table t1 [a]=1\r\n[b]=2\r\n[c]=3\r\n\r\n!horizontal()\r\n!placement(10, 5)\r\ntable 't1_(1,2,3)[b]'\r\n  [source] = t1(1,2,3)[b]\r\n  [a] = [source][a]\r\n  [b] = [source][b]\r\n  [c] = [source][c]\r\n`;
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() =>
        hook.createRowReferenceTableFromSchema(
          5,
          10,
          't1',
          'b',
          '1,2,3',
          't1(1,2,3)[b]',
          ['a', 'b', 'c'],
          []
        )
      );
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add row reference table "t1_(1,2,3)[b]"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should create row reference table and propagate keys', async () => {
      // Arrange
      const dsl = 'table t1 [a]=1\r\n[b]=2\r\n[c]=3';
      const expectedDsl = `table t1 [a]=1\r\n[b]=2\r\n[c]=3\r\n\r\n!horizontal()\r\n!placement(10, 5)\r\ntable 't1_(1,2,3)[b]'\r\n  [source] = t1(1,2,3)[b]\r\n  key [a] = [source][a]\r\n  [b] = [source][b]\r\n  [c] = [source][c]\r\n`;
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() =>
        hook.createRowReferenceTableFromSchema(
          5,
          10,
          't1',
          'b',
          '1,2,3',
          't1(1,2,3)[b]',
          ['a', 'b', 'c'],
          ['a']
        )
      );
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add row reference table "t1_(1,2,3)[b]"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });
});
