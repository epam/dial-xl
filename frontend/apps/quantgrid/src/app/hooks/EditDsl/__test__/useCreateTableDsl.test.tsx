import { ChartType, ColumnDataType, GridTable } from '@frontend/common';
import { act, RenderHookResult } from '@testing-library/react';

import { ViewGridData } from '../../../context';
import { useCreateTableDsl } from '../useCreateTableDsl';
import { hookTestSetup } from './hookTestSetup';
import { RenderProps, TestWrapperProps } from './types';

const initialProps: TestWrapperProps = {
  appendToFn: jest.fn(),
  manuallyUpdateSheetContent: jest.fn(() => Promise.resolve(true)),
  projectName: 'project1',
  sheetName: 'sheet1',
};

describe('useCreateTableDsl', () => {
  let props: TestWrapperProps;
  let hook: RenderHookResult<
    ReturnType<typeof useCreateTableDsl>,
    { dsl: string }
  >['result'];
  let rerender: (props?: RenderProps) => void;

  beforeEach(() => {
    props = { ...initialProps };
    jest.clearAllMocks();

    const hookRender = hookTestSetup(useCreateTableDsl, props);

    hook = hookRender.result;
    rerender = hookRender.rerender;
  });

  describe('createDerivedTable', () => {
    it('should create derived table', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\n[f2]=2';
      const expectedDsl = `table t1 [f1]=1\n[f2]=2\r\n\n!layout(1, 4, "title", "headers")\ntable t1_derived\n  dim [source] = t1\n  [f1] = [source][f1]\n  [f2] = [source][f2]\r\n`;
      rerender({ dsl });

      // Act
      act(() => hook.current.createDerivedTable('t1'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add derived table "t1_derived"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should create derived table from table with name in quotes', () => {
      // Arrange
      const dsl = `table 'some table' [f1]=1\n[f2]=2`;
      const expectedDsl = `table 'some table' [f1]=1\n[f2]=2\r\n\n!layout(1, 4, "title", "headers")\ntable 'some table_derived'\n  dim [source] = 'some table'\n  [f1] = [source][f1]\n  [f2] = [source][f2]\r\n`;
      rerender({ dsl });

      // Act
      act(() => hook.current.createDerivedTable(`'some table'`));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add derived table "some table_derived"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should do nothing if source table not found', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\n[f2]=2';
      rerender({ dsl });

      // Act
      act(() => hook.current.createDerivedTable('t2'));

      // Assert
      expect(props.appendToFn).not.toHaveBeenCalled();
      expect(props.manuallyUpdateSheetContent).not.toHaveBeenCalled();
    });

    it('should create derived table with unique field names', () => {
      // Arrange
      const dsl = 'table t1 [source]=1\n[f2]=2';
      const expectedDsl = `table t1 [source]=1\n[f2]=2\r\n\n!layout(1, 4, "title", "headers")\ntable t1_derived\n  dim [source1] = t1\n  [source] = [source1][source]\n  [f2] = [source1][f2]\r\n`;
      rerender({ dsl });

      // Act
      act(() => hook.current.createDerivedTable('t1'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add derived table "t1_derived"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('createEmptyChartTable', () => {
    it('should create empty chart', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const expectedDsl = `table t1 [f1]=1\r\n\n!layout(1, 1, "title", "headers")\n!visualization("line-chart")\n!size(15,10)\ntable Chart1\r\n`;
      rerender({ dsl });

      // Act
      act(() => hook.current.createEmptyChartTable(ChartType.LINE));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Add chart "Chart1"`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('createSingleValueTable', () => {
    it('should create table', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const expectedDsl = `table t1 [f1]=1\r\n\n!layout(5, 5)\ntable Table1\n  [Column1] = 2 + 2\r\n`;
      rerender({ dsl });

      // Act
      act(() => hook.current.createSingleValueTable(5, 5, '= 2 + 2'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Add table "Table1"`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should create table in a blank sheet', () => {
      // Arrange
      const dsl = '';
      const expectedDsl = `!layout(5, 5)\ntable Table1\n  [Column1] = 2 + 2\r\n`;
      rerender({ dsl });

      // Act
      act(() => hook.current.createSingleValueTable(5, 5, '= 2 + 2'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Add table "Table1"`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should create table with numeric value', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const expectedDsl =
        'table t1 [f1]=1\r\n\n!layout(4, 4)\ntable Table1\n  [Column1] = 33\r\n';
      rerender({ dsl });

      // Act
      act(() => hook.current.createSingleValueTable(4, 4, '33'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Add table "Table1"`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should create table with string value', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const expectedDsl =
        'table t1 [f1]=1\r\n\n!layout(4, 4)\ntable Table1\n  [Column1] = "some string"\r\n';
      rerender({ dsl });

      // Act
      act(() => hook.current.createSingleValueTable(4, 4, 'some string'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Add table "Table1"`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should create table with formula', () => {
      // Arrange
      const dsl = 'table Table1 [f1]=1';
      const expectedDsl =
        'table Table1 [f1]=1\r\n\n!layout(4, 4)\ntable Table2\n  [Column1] = COUNT(T1)\r\n';
      props.projectSheets = [
        {
          projectName: 'project1',
          sheetName: 'sheet1',
          content: dsl,
        },
      ] as never[];
      rerender({ dsl });

      // Act
      act(() => hook.current.createSingleValueTable(4, 4, '=COUNT(T1)'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Add table "Table2"`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should create table with formula and specified table name', () => {
      // Arrange
      const dsl = 'table Table1 [f1]=1';
      const expectedDsl =
        'table Table1 [f1]=1\r\n\n!layout(4, 4, "title")\ntable customTableName\n  [Column1] = COUNT(T1)\r\n';
      props.projectSheets = [
        {
          projectName: 'project1',
          sheetName: 'sheet1',
          content: dsl,
        },
      ] as never[];
      rerender({ dsl });

      // Act
      act(() =>
        hook.current.createSingleValueTable(
          4,
          4,
          '=COUNT(T1)',
          'customTableName'
        )
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add table "customTableName"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should create table with explicitly set show headers', () => {
      // Arrange
      const dsl = '';
      const expectedDsl =
        '!layout(4, 4, "title", "headers")\ntable Table1\n  [Column1] = ERR("RANGE(4")\r\n';
      props.projectSheets = [
        {
          projectName: 'project1',
          sheetName: 'sheet1',
          content: dsl,
        },
      ] as never[];
      rerender({ dsl });

      // Act
      act(() =>
        hook.current.createSingleValueTable(4, 4, '=ERR("RANGE(4")', '', true)
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Add table "Table1"`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('createDimensionTable', () => {
    it('should create dimension table', () => {
      // Arrange
      const dsl = 'table table1 [f1]=1';
      const expectedDsl = `table table1 [f1]=1\r\n\n!layout(4, 4, "title", "headers")\ntable t2\n  dim [source1] = t3\n  dim [source2] = t4\r\n`;
      rerender({ dsl });

      // Act
      act(() => hook.current.createDimensionTable(4, 4, 't2:t3:t4'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add dimension table "t2"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should create dimension table with unique name', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const expectedDsl = `table t1 [f1]=1\r\n\n!layout(4, 4, "title", "headers")\ntable t2\n  dim [source1] = t3\n  dim [source2] = t4\r\n`;
      props.projectSheets = [
        {
          projectName: 'project1',
          sheetName: 'sheet1',
          content: dsl,
        },
      ] as never[];
      rerender({ dsl });

      // Act
      act(() => hook.current.createDimensionTable(4, 4, 't1:t3:t4'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add dimension table "t2"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should create dimension table in a blank sheet', () => {
      // Arrange
      const dsl = '';
      const expectedDsl = `!layout(4, 4, "title", "headers")\ntable t1\n  dim [source1] = t2\n  dim [source2] = t3\r\n`;
      rerender({ dsl });

      // Act
      act(() => hook.current.createDimensionTable(4, 4, 't1:t2:t3'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add dimension table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should create dimension table at the beginning of the spreadsheet', () => {
      // Arrange
      const dsl = 'table table1 [f1]=1';
      const expectedDsl = `table table1 [f1]=1\r\n\n!layout(1, 1, "title", "headers")\ntable t2\n  dim [source1] = t3\n  dim [source2] = t4\r\n`;
      rerender({ dsl });

      // Act
      act(() => hook.current.createDimensionTable(0, 0, 't2:t3:t4'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add dimension table "t2"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should do nothing if unable to parse value', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      rerender({ dsl });

      // Act
      act(() => hook.current.createDimensionTable(4, 4, 't1'));

      // Assert
      expect(props.appendToFn).not.toHaveBeenCalled();
      expect(props.manuallyUpdateSheetContent).not.toHaveBeenCalled();
    });
  });

  describe('createManualTable', () => {
    it('should create manual table with 3 columns and 3 rows', () => {
      // Arrange
      const dsl = '';
      const expectedDsl =
        '!layout(2, 4, "title", "headers")\n!manual()\ntable Table1\n  [Column1]\n  [Column2]\n  [Column3]\noverride\n[Column1],[Column2],[Column3]\n1,11,111\n2,22,222\n3,33,333\r\n';
      const cells = [
        ['1', '11', '111'],
        ['2', '22', '222'],
        ['3', '33', '333'],
      ];
      rerender({ dsl });

      // Act
      act(() => hook.current.createManualTable(4, 4, cells));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add manual table "Table1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should create manual at the beginning of the spreadsheet', () => {
      // Arrange
      const dsl = '';
      const expectedDsl =
        '!layout(1, 1, "title", "headers")\n!manual()\ntable Table1\n  [Column1]\noverride\n[Column1]\n1\r\n';
      const cells = [['1']];
      rerender({ dsl });

      // Act
      act(() => hook.current.createManualTable(0, 0, cells));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add manual table "Table1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('createExpandedTable', () => {
    it('should create dimension table from formula', () => {
      // Arrange
      const dsl = 'table t1 [a]=1\n[b]=2\n[c]=3';
      const expectedDsl = `table t1 [a]=1\n[b]=2\n[c]=3\r\n\n!layout(5, 4, "title", "headers")\ntable t2\n  dim [a], [b], [c] = t1[[a],[b],[c]]\r\n`;
      rerender({ dsl });

      // Act
      act(() =>
        hook.current.createExpandedTable({
          col: 4,
          row: 5,
          tableName: 't2',
          formula: 't1',
          schema: ['a', 'b', 'c'],
          keys: [],
          type: ColumnDataType.TABLE_REFERENCE,
          isSourceDimField: true,
          variant: 'dimFormula',
        })
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add dimension table "t2"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should create dimension table and escape field names', () => {
      // Arrange
      const dsl = 'table t1 [a]=1\n[b]=2\n[c]=3';
      const expectedDsl = `table t1 [a]=1\n[b]=2\n[c]=3\r\n\n!layout(5, 4, "title", "headers")\ntable t2\n  dim [a '[2000']], [b '[2001']], [c '[2002']] = t1[[a '[2000']],[b '[2001']],[c '[2002']]]\r\n`;
      rerender({ dsl });

      // Act
      act(() =>
        hook.current.createExpandedTable({
          col: 4,
          row: 5,
          tableName: 't2',
          formula: 't1',
          schema: ['a [2000]', 'b [2001]', 'c [2002]'],
          keys: [],
          type: ColumnDataType.TABLE_REFERENCE,
          isSourceDimField: true,
          variant: 'dimFormula',
        })
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add dimension table "t2"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should create dimension table and propagate keys', () => {
      // Arrange
      const dsl = 'table t1 [a]=1\n[b]=2\n[c]=3';
      const expectedDsl = `table t1 [a]=1\n[b]=2\n[c]=3\r\n\n!layout(5, 4, "title", "headers")\ntable t2\n  dim key [a], [b], [c] = t1[[a],[b],[c]]\r\n`;
      rerender({ dsl });

      // Act
      act(() =>
        hook.current.createExpandedTable({
          col: 4,
          row: 5,
          tableName: 't2',
          formula: 't1',
          schema: ['a', 'b', 'c'],
          keys: ['a'],
          type: ColumnDataType.TABLE_REFERENCE,
          isSourceDimField: true,
          variant: 'dimFormula',
        })
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add dimension table "t2"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should create dimension table from formula in empty sheet and with empty schema', () => {
      // Arrange
      const dsl = '';
      const expectedDsl = `!layout(5, 4, "title", "headers")\ntable t1\n  dim [source] = RANGE(10)\r\n`;
      rerender({ dsl });

      // Act
      act(() =>
        hook.current.createExpandedTable({
          col: 4,
          row: 5,
          tableName: 't1',
          formula: 'RANGE(10)',
          schema: [],
          keys: [],
          type: ColumnDataType.DOUBLE,
          isSourceDimField: true,
          variant: 'dimFormula',
        })
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add dimension table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should create table without dim source field from formula', () => {
      // Arrange
      const dsl = 'table t1 [a]=1\n[b]=2\n[c]=3';
      const expectedDsl = `table t1 [a]=1\n[b]=2\n[c]=3\r\n\n!layout(5, 4, "title", "headers")\ntable t2\n  [a], [b], [c] = t1[[a],[b],[c]]\r\n`;
      rerender({ dsl });

      // Act
      act(() =>
        hook.current.createExpandedTable({
          col: 4,
          row: 5,
          tableName: 't2',
          formula: 't1',
          schema: ['a', 'b', 'c'],
          keys: [],
          type: ColumnDataType.TABLE_REFERENCE,
          isSourceDimField: false,
          variant: 'dimFormula',
        })
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add dimension table "t2"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should create dimension table from table with source field', () => {
      // Arrange
      const dsl =
        'table t1\n  dim [source] = t1\n  [a] = [source][a]\n  [b] = [source][b]\n  [c] = [source][c]\r\n';
      const expectedDsl = `table t1\n  dim [source] = t1\n  [a] = [source][a]\n  [b] = [source][b]\n  [c] = [source][c]\r\n\r\n!layout(5, 4, "title", "headers")\ntable t2\n  dim [source], [a], [b], [c] = t1[[source],[a],[b],[c]]\r\n`;
      rerender({ dsl });

      // Act
      act(() =>
        hook.current.createExpandedTable({
          col: 4,
          row: 5,
          tableName: 't2',
          formula: 't1',
          schema: ['source', 'a', 'b', 'c'],
          keys: [],
          type: ColumnDataType.TABLE_REFERENCE,
          isSourceDimField: true,
          variant: 'dimFormula',
        })
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add dimension table "t2"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should create table with a multi field group', () => {
      // Arrange
      const dsl = '';
      const expectedDsl = `!layout(5, 4, "title", "headers")\ntable t1\n  dim [a], [b], [c] = INPUT("input_url")[[a],[b],[c]]\r\n`;
      rerender({ dsl });

      // Act
      act(() =>
        hook.current.createExpandedTable({
          col: 4,
          row: 5,
          tableName: 't1',
          formula: 'INPUT("input_url")',
          schema: ['a', 'b', 'c'],
          keys: [],
          type: ColumnDataType.TABLE_VALUE,
          isSourceDimField: true,
          variant: 'dimFormula',
        })
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add dimension table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should create table with row multi-access', () => {
      // Arrange
      const dsl = '';
      const expectedDsl = `!layout(5, 4, "title", "headers")\ntable t1\n  [a], [b] = T1(1)[[a],[b]]\r\n`;
      rerender({ dsl });

      // Act
      act(() =>
        hook.current.createExpandedTable({
          col: 4,
          row: 5,
          tableName: 't1',
          formula: 'T1(1)',
          schema: ['a', 'b'],
          keys: [],
          type: ColumnDataType.TABLE_VALUE,
          isSourceDimField: false,
          variant: 'dimFormula',
        })
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add dimension table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should create table with one normalized field reference', () => {
      // Arrange
      const dsl = '';
      const expectedDsl = `!layout(5, 4, "title", "headers")\ntable t1\n  [a] = T1(1)[a]\r\n`;
      rerender({ dsl });

      // Act
      act(() =>
        hook.current.createExpandedTable({
          col: 4,
          row: 5,
          tableName: 't1',
          formula: 'T1(1)',
          schema: ['a'],
          keys: [],
          type: ColumnDataType.TABLE_VALUE,
          isSourceDimField: false,
          variant: 'dimFormula',
        })
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add dimension table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should create dimension table from schema', () => {
      // Arrange
      const dsl = 'table t1 [a]=1\n[b]=2\n[c]=3';
      const expectedDsl = `table t1 [a]=1\n[b]=2\n[c]=3\r\n\n!layout(10, 5, "title", "headers")\ntable 't1_(1,2,3)[b]'\n  dim [a], [b], [c] = t1.FIND(1,2,3)[b][[a],[b],[c]]\r\n`;
      rerender({ dsl });

      // Act
      act(() =>
        hook.current.createExpandedTable({
          col: 5,
          row: 10,
          tableName: 't1',
          fieldName: 'b',
          formula: 't1.FIND(1,2,3)[b]',
          schema: ['a', 'b', 'c'],
          keyValues: '1,2,3',
          keys: [],
          type: ColumnDataType.TABLE_REFERENCE,
          isSourceDimField: true,
          variant: 'expand',
        })
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add dimension table "t1_(1,2,3)[b]"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should create dimension table and escape field names', () => {
      // Arrange
      const dsl = 'table t1 [a]=1\n[b]=2\n[c]=3';
      const expectedDsl = `table t1 [a]=1\n[b]=2\n[c]=3\r\n\n!layout(10, 5, "title", "headers")\ntable 't1_(1,2,3)[b]'\n  dim [a '[2000']], [b '[2001']], [c '[2002']] = t1.FIND(1,2,3)[b][[a '[2000']],[b '[2001']],[c '[2002']]]\r\n`;
      rerender({ dsl });

      // Act
      act(() =>
        hook.current.createExpandedTable({
          col: 5,
          row: 10,
          tableName: 't1',
          fieldName: 'b',
          formula: 't1.FIND(1,2,3)[b]',
          schema: ['a [2000]', 'b [2001]', 'c [2002]'],
          keyValues: '1,2,3',
          keys: [],
          type: ColumnDataType.TABLE_REFERENCE,
          isSourceDimField: true,
          variant: 'expand',
        })
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add dimension table "t1_(1,2,3)[b]"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should create dimension table and propagate keys', () => {
      // Arrange
      const dsl = 'table t1 [a]=1\n[b]=2\n[c]=3';
      const expectedDsl = `table t1 [a]=1\n[b]=2\n[c]=3\r\n\n!layout(10, 5, "title", "headers")\ntable 't1_(1,2,3)[b]'\n  dim key [a], [b], [c] = t1.FIND(1,2,3)[b][[a],[b],[c]]\r\n`;
      rerender({ dsl });

      // Act
      act(() =>
        hook.current.createExpandedTable({
          col: 5,
          row: 10,
          tableName: 't1',
          fieldName: 'b',
          formula: 't1.FIND(1,2,3)[b]',
          schema: ['a', 'b', 'c'],
          keyValues: '1,2,3',
          keys: ['a'],
          type: ColumnDataType.TABLE_REFERENCE,
          isSourceDimField: true,
          variant: 'expand',
        })
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add dimension table "t1_(1,2,3)[b]"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should create row reference table from schema', () => {
      // Arrange
      const dsl = 'table t1 [a]=1\n[b]=2\n[c]=3';
      const expectedDsl = `table t1 [a]=1\n[b]=2\n[c]=3\r\n\n!layout(10, 5, "horizontal", "title", "headers")\ntable 't1_(1,2,3)[b]'\n  [a], [b], [c] = t1(1,2,3)[b][[a],[b],[c]]\r\n`;
      rerender({ dsl });

      // Act
      act(() =>
        hook.current.createExpandedTable({
          col: 5,
          row: 10,
          tableName: 't1',
          fieldName: 'b',
          formula: 't1(1,2,3)[b]',
          schema: ['a', 'b', 'c'],
          keys: [],
          keyValues: '1,2,3',
          type: ColumnDataType.TABLE_REFERENCE,
          isSourceDimField: false,
          variant: 'rowReference',
        })
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add row reference table "t1_(1,2,3)[b]"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should create row reference table and propagate keys', () => {
      // Arrange
      const dsl = 'table t1 [a]=1\n[b]=2\n[c]=3';
      const expectedDsl = `table t1 [a]=1\n[b]=2\n[c]=3\r\n\n!layout(10, 5, "horizontal", "title", "headers")\ntable 't1_(1,2,3)[b]'\n  key [a], [b], [c] = t1(1,2,3)[b][[a],[b],[c]]\r\n`;
      rerender({ dsl });

      // Act
      act(() =>
        hook.current.createExpandedTable({
          col: 5,
          row: 10,
          tableName: 't1',
          fieldName: 'b',
          formula: 't1(1,2,3)[b]',
          schema: ['a', 'b', 'c'],
          keys: ['a'],
          keyValues: '1,2,3',
          type: ColumnDataType.TABLE_REFERENCE,
          isSourceDimField: false,
          variant: 'rowReference',
        })
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add row reference table "t1_(1,2,3)[b]"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should create dimension table from period series formula without accessors list', () => {
      // Arrange
      const dsl = 'table t1 [a]=1\n[b]=2\n[c]=3';
      const expectedDsl = `table t1 [a]=1\n[b]=2\n[c]=3\r\n\n!layout(5, 4, "title", "headers")\ntable t2\n  dim [date], [value] = PERIODSERIES(A[b], A[c], "DAY")[[date],[value]]\r\n`;
      rerender({ dsl });

      // Act
      act(() =>
        hook.current.createExpandedTable({
          col: 4,
          row: 5,
          tableName: 't2',
          formula: 'PERIODSERIES(A[b], A[c], "DAY")',
          schema: [],
          keys: [],
          type: ColumnDataType.PERIOD_SERIES,
          isSourceDimField: false,
          variant: 'dimFormula',
        })
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add dimension table "t2"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should create dimension table from period series formula with accessors list', () => {
      // Arrange
      const dsl = 'table t1 [a]=1\n[b]=2\n[c]=3';
      const expectedDsl = `table t1 [a]=1\n[b]=2\n[c]=3\r\n\n!layout(5, 4, "title", "headers")\ntable t2\n  dim [date], [value] = PERIODSERIES(A[b], A[c], "DAY")[[date],[value]]\r\n`;
      rerender({ dsl });

      // Act
      act(() =>
        hook.current.createExpandedTable({
          col: 4,
          row: 5,
          tableName: 't2',
          formula: 'PERIODSERIES(A[b], A[c], "DAY")[[date],[value]]',
          schema: ['date', 'value'],
          keys: [],
          type: ColumnDataType.TABLE_VALUE,
          isSourceDimField: true,
          variant: 'dimFormula',
        })
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add dimension table "t2"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('createAllTableTotals', () => {
    it('should add table totals with text field', () => {
      props = { ...initialProps };
      props.viewGridData = {
        getTableData: (tableName: string) => {
          return {
            types: {
              f1: 'STRING',
            },
            nestedColumnNames: new Set(),
          } as any;
        },
        getGridTableStructure: (): GridTable[] => [],
      } as ViewGridData;
      const hookRender = hookTestSetup(useCreateTableDsl, props);
      hook = hookRender.result;
      rerender = hookRender.rerender;

      // Arrange
      const dsl = '!layout(1,1)\ntable t1\n[f1]="text"';
      const expectedDsl = `!layout(1,1)\ntable t1\n[f1]="text"\r\n\n!layout(1, 3, "title", "headers")\n!manual()\ntable 't1 totals'\n  [Stat]\n  [f1]\noverride\n[Stat],[f1]\n"COUNT",COUNT(t1[f1])\n"MIN",MIN(t1[f1])\n"MAX",MAX(t1[f1])\r\n`;
      rerender({ dsl });

      // Act
      act(() => hook.current.createAllTableTotals('t1'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add totals table "t1 totals"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );

      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add table totals with numeric and text fields', () => {
      props = { ...initialProps };
      props.viewGridData = {
        getTableData: (tableName: string) => {
          return {
            types: {
              f1: 'DOUBLE',
              f2: 'STRING',
            },
            nestedColumnNames: new Set(),
          } as any;
        },
        getGridTableStructure: (): GridTable[] => [],
      } as ViewGridData;
      const hookRender = hookTestSetup(useCreateTableDsl, props);
      hook = hookRender.result;
      rerender = hookRender.rerender;

      // Arrange
      const dsl = '!layout(1,1)\ntable t1\n[f1]=1\n[f2]="text"';
      const expectedDsl = `!layout(1,1)\ntable t1\n[f1]=1\n[f2]="text"\r\n\n!layout(1, 4, "title", "headers")\n!manual()\ntable 't1 totals'\n  [Stat]\n  [f1]\n  [f2]\noverride\n[Stat],[f1],[f2]\n"COUNT",COUNT(t1[f1]),COUNT(t1[f2])\n"MIN",MIN(t1[f1]),MIN(t1[f2])\n"MAX",MAX(t1[f1]),MAX(t1[f2])\n"AVERAGE",AVERAGE(t1[f1]),\n"STDEVS",STDEVS(t1[f1]),\r\n`;
      rerender({ dsl });

      // Act
      act(() => hook.current.createAllTableTotals('t1'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add totals table "t1 totals"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );

      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add table totals with table field', () => {
      props = { ...initialProps };
      props.viewGridData = {
        getTableData: (tableName: string) => {
          return {
            types: {
              f1: 'TABLE_REFERENCE',
            },
            nestedColumnNames: new Set(),
          } as any;
        },
        getGridTableStructure: (): GridTable[] => [],
      } as ViewGridData;
      const hookRender = hookTestSetup(useCreateTableDsl, props);
      hook = hookRender.result;
      rerender = hookRender.rerender;

      // Arrange
      const dsl = '!layout(1,1)\ntable t1\n[f1]=RANGE(10)';
      const expectedDsl = `!layout(1,1)\ntable t1\n[f1]=RANGE(10)\r\n\n!layout(1, 3, "title", "headers")\n!manual()\ntable 't1 totals'\n  [Stat]\n  [f1]\noverride\n[Stat],[f1]\n"COUNT",COUNT(t1[f1])\r\n`;
      rerender({ dsl });

      // Act
      act(() => hook.current.createAllTableTotals('t1'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add totals table "t1 totals"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );

      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });
});
