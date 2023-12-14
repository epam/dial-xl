import { act } from '@testing-library/react';

import { getRenderedHook } from './utils';

const props = {
  appendFn: jest.fn(),
  appendToFn: jest.fn(),
  updateSheetContent: jest.fn(),
  manuallyUpdateSheetContent: jest.fn(),
  projectName: 'project1',
  sheetName: 'sheet1',
  projectSheets: [],
};

describe('useManualEditDSL', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    props.projectSheets = [];
  });

  describe('moveTable', () => {
    it('should move table by 1 row and 1 column', () => {
      // Arrange
      const dsl = '!placement(1, 2) table t1 [f1]=1';
      const expectedDsl = '!placement(2, 3) table t1 [f1]=1';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.moveTable('t1', 1, 1));

      // Assert
      expect(props.appendFn).toBeCalledWith(
        `Move table "t1" to (2, 3)`,
        expectedDsl
      );

      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should move table without placement decorator', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const expectedDsl = '!placement(3, 3)\r\ntable t1 [f1]=1';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.moveTable('t1', 2, 2));

      // Assert
      expect(props.appendFn).toBeCalledWith(
        `Move table "t1" to (3, 3)`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });

  describe('moveTableTo', () => {
    it('should move table by 5 row and 8 column', () => {
      // Arrange
      const dsl = '!placement(1, 2) table t1 [f1]=1';
      const expectedDsl = '!placement(5, 8) table t1 [f1]=1';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.moveTableTo('t1', 5, 8));

      // Assert
      expect(props.appendFn).toBeCalledWith(
        `Move table "t1" to (5, 8)`,
        expectedDsl
      );

      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should create decorator if it not specified and move to the new position', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const expectedDsl = '!placement(3, 3)\r\ntable t1 [f1]=1';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.moveTableTo('t1', 3, 3));

      // Assert
      expect(props.appendFn).toBeCalledWith(
        `Move table "t1" to (3, 3)`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });

  describe('renameTable', () => {
    it('should rename table', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const expectedDsl = 'table t2 [f1]=1';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.renameTable('t1', 't2'));

      // Assert
      expect(props.appendFn).toBeCalledWith(
        `Rename table "t1" to "t2"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should rename table with unique name', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 table t2 [f1]=1';
      const expectedDsl = 'table t3 [f1]=1 table t2 [f1]=1';
      props.projectSheets = [
        {
          projectName: 'project1',
          sheetName: 'sheet1',
          content: dsl,
        },
      ] as never[];
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.renameTable('t1', 't2'));

      // Assert
      expect(props.appendFn).toBeCalledWith(
        `Rename table "t1" to "t3"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should rename table with name in quotes', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const expectedDsl = `table 'table name with spaces' [f1]=1`;
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.renameTable('t1', 'table name with spaces'));

      // Assert
      expect(props.appendFn).toBeCalledWith(
        `Rename table "t1" to "'table name with spaces'"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });

  describe('renameField', () => {
    it('should rename table field', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2';
      const expectedDsl = 'table t1 [f5]=1 [f2]=2';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.renameField('t1', 'f1', 'f5'));

      // Assert
      expect(props.appendFn).toBeCalledWith(
        `Rename field [f1] to [f5] in table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should sanitize field name when rename field', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2';
      const expectedDsl = 'table t1 [f4]=1 [f2]=2';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.renameField('t1', 'f1', '[f4]'));

      // Assert
      expect(props.appendFn).toBeCalledWith(
        `Rename field [f1] to [f4] in table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should not rename if new name is the same', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.renameField('t1', 'f1', 'f1'));

      // Assert
      expect(props.appendFn).not.toBeCalled();
      expect(props.manuallyUpdateSheetContent).not.toBeCalled();
    });

    it('should rename override field in table with keys', () => {
      // Arrange
      const dsl =
        'table t1 key [f1]=1 [f2]=2\r\noverride\r\nkey [f1],[f2]\r\n1,3\r\n\r\n';
      const expectedDsl =
        'table t1 key [f1]=1 [f3]=2\r\noverride\r\nkey [f1],[f3]\r\n1,3\r\n\r\n\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.renameField('t1', 'f2', 'f3'));

      // Assert
      expect(props.appendFn).toBeCalledWith(
        `Rename field [f2] to [f3] in table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should rename override field in table without keys', () => {
      // Arrange
      const dsl =
        'table t1 [f1]=1 [f2]=2\r\noverride\r\nrow,[f2]\r\n1,3\r\n\r\n';
      const expectedDsl =
        'table t1 [f1]=1 [f3]=2\r\noverride\r\nrow,[f3]\r\n1,3\r\n\r\n\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.renameField('t1', 'f2', 'f3'));

      // Assert
      expect(props.appendFn).toBeCalledWith(
        `Rename field [f2] to [f3] in table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should rename override field in manual table', () => {
      // Arrange
      const dsl =
        '!manual() table t1 [f1]=1 [f2]=2\r\noverride\r\n[f2]\r\n3\r\n\r\n';
      const expectedDsl =
        '!manual() table t1 [f1]=1 [f3]=2\r\noverride\r\n[f3]\r\n3\r\n\r\n\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.renameField('t1', 'f2', 'f3'));

      // Assert
      expect(props.appendFn).toBeCalledWith(
        `Rename field [f2] to [f3] in table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });

  describe('editExpression', () => {
    it('should edit expression', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const expectedDsl = 'table t1 [f1]=2 + 2';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.editExpression('t1', 'f1', '2 + 2'));

      // Assert
      expect(props.appendFn).toBeCalledWith(
        `Update expression of field [f1] in table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should edit expression which starts with equals', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const expectedDsl = 'table t1 [f1]=2 + 2';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.editExpression('t1', 'f1', '= 2 + 2'));

      // Assert
      expect(props.appendFn).toBeCalledWith(
        `Update expression of field [f1] in table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should do nothing if expression tries to add table or field', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.editExpression('t1', 'f1', 'table t2 [f]=2'));

      // Assert
      expect(props.appendFn).not.toBeCalled();
      expect(props.manuallyUpdateSheetContent).not.toBeCalled();
    });

    it('should do nothing if no target field', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.editExpression('t1', 'f2', '2 + 2'));

      // Assert
      expect(props.appendFn).not.toBeCalled();
      expect(props.manuallyUpdateSheetContent).not.toBeCalled();
    });
  });

  describe('deleteTable', () => {
    it('should delete table', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 table t2 [f5]=1';
      const expectedDsl = 'table t1 [f1]=1 ';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.deleteTable('t2'));

      // Assert
      expect(props.appendToFn).toBeCalledWith(
        props.projectName,
        props.sheetName,
        `Delete table "t2"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should delete table with name in quotes', () => {
      // Arrange
      const dsl = `table t1 [f1]=1 table "t spaces" [f5]=1`;
      const expectedDsl = 'table t1 [f1]=1 ';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.deleteTable(`"t spaces"`));

      // Assert
      expect(props.appendToFn).toBeCalledWith(
        props.projectName,
        props.sheetName,
        `Delete table ""t spaces""`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });

  describe('deleteField', () => {
    it('should delete field', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 table t2 [f1]=1 [f2]=2';
      const expectedDsl = 'table t1 [f1]=1 table t2 [f1]=1 ';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.deleteField('t2', 'f2'));

      // Assert
      expect(props.appendToFn).toBeCalledWith(
        props.projectName,
        props.sheetName,
        `Delete field [f2] from table "t2"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should delete last table field', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 table t2 [f1]=1 [f2]=2';
      const expectedDsl = 'table t1 table t2 [f1]=1 [f2]=2';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.deleteField('t1', 'f1'));

      // Assert
      expect(props.appendToFn).toBeCalledWith(
        props.projectName,
        props.sheetName,
        `Delete field [f1] from table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });

  describe('swapFields', () => {
    it('should swap field left', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2 [f3]=3 [f4]=4';
      const expectedDsl = 'table t1 [f1]=1 [f3]=3 [f2]=2 [f4]=4';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.swapFields('t1', 'f3', 'f2', 'left'));

      // Assert
      expect(props.appendToFn).toBeCalledWith(
        props.projectName,
        props.sheetName,
        `Swap fields [f3] and [f2] in table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should swap field right', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2 [f3]=3 [f4]=4';
      const expectedDsl = 'table t1 [f1]=1 [f2]=2 [f4]=4 [f3]=3';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.swapFields('t1', 'f4', 'f3', 'right'));

      // Assert
      expect(props.appendToFn).toBeCalledWith(
        props.projectName,
        props.sheetName,
        `Swap fields [f4] and [f3] in table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });

  describe('addField', () => {
    it('should add field to table', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const expectedDsl = 'table t1 [f1]=1\r\n [f2] = 2 + 2';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.addField('t1', '[f2] = 2 + 2'));

      // Assert
      expect(props.appendFn).toBeCalledWith(
        `Add [f2] to table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should add field to empty table', () => {
      // Arrange
      const dsl = 'table t1';
      const expectedDsl = 'table t1\r\n  [f2] = 2 + 2';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.addField('t1', '[f2] = 2 + 2'));

      // Assert
      expect(props.appendFn).toBeCalledWith(
        `Add [f2] to table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });

  describe('createDerivedTable', () => {
    it('should create derived table', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2';
      const expectedDsl = `table t1 [f1]=1 [f2]=2\r\n\r\n!placement(1, 4)\r\ntable t1_derived\r\n  dim [source] = t1\r\n  [f1] = [source][f1]\r\n  [f2] = [source][f2]`;
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.createDerivedTable('t1'));

      // Assert
      expect(props.appendToFn).toBeCalledWith(
        props.projectName,
        props.sheetName,
        `Add derived table "t1_derived"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should create derived table from table with name in quotes', () => {
      // Arrange
      const dsl = `table 'some table' [f1]=1 [f2]=2`;
      const expectedDsl = `table 'some table' [f1]=1 [f2]=2\r\n\r\n!placement(1, 4)\r\ntable 'some table_derived'\r\n  dim [source] = 'some table'\r\n  [f1] = [source][f1]\r\n  [f2] = [source][f2]`;
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.createDerivedTable(`some table`));

      // Assert
      expect(props.appendToFn).toBeCalledWith(
        props.projectName,
        props.sheetName,
        `Add derived table "'some table_derived'"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should do nothing if source table not found', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.createDerivedTable('t2'));

      // Assert
      expect(props.appendToFn).not.toBeCalled();
      expect(props.manuallyUpdateSheetContent).not.toBeCalled();
    });
  });

  describe('createTable', () => {
    it('should create table', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const expectedDsl = `table t1 [f1]=1\r\n\r\n!placement(5, 5)\r\ntable Table1\r\n  [Field1] = 2 + 2`;
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.createTable(5, 5, '= 2 + 2'));

      // Assert
      expect(props.appendFn).toBeCalledWith(`Add table "Table1"`, expectedDsl);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should create table with unique name', () => {
      // Arrange
      const dsl = 'table Table1 [f1]=1';
      const expectedDsl = `table Table1 [f1]=1\r\n\r\n!placement(5, 5)\r\ntable Table2\r\n  [f] = 2 + 2`;
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

      // Assert
      expect(props.appendFn).toBeCalledWith(`Add table "Table2"`, expectedDsl);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should create table in a blank sheet', () => {
      // Arrange
      const dsl = '';
      const expectedDsl = `!placement(5, 5)\r\ntable Table1\r\n  [Field1] = 2 + 2`;
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.createTable(5, 5, '= 2 + 2'));

      // Assert
      expect(props.appendFn).toBeCalledWith(`Add table "Table1"`, expectedDsl);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });

  describe('createDimensionTable', () => {
    it('should create dimension table', () => {
      // Arrange
      const dsl = 'table table1 [f1]=1';
      const expectedDsl = `table table1 [f1]=1\r\n\r\n!placement(4, 4)\r\ntable t2\r\n  dim [source1] = t3\r\n  dim [source2] = t4`;
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.createDimensionTable(4, 4, 't2:t3:t4'));

      // Assert
      expect(props.appendFn).toBeCalledWith(
        `Add dimension table "t2"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should create dimension table with unique name', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const expectedDsl = `table t1 [f1]=1\r\n\r\n!placement(4, 4)\r\ntable t2\r\n  dim [source1] = t3\r\n  dim [source2] = t4`;
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

      // Assert
      expect(props.appendFn).toBeCalledWith(
        `Add dimension table "t2"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should create dimension table in a blank sheet', () => {
      // Arrange
      const dsl = '';
      const expectedDsl = `!placement(4, 4)\r\ntable t1\r\n  dim [source1] = t2\r\n  dim [source2] = t3`;
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.createDimensionTable(4, 4, 't1:t2:t3'));

      // Assert
      expect(props.appendFn).toBeCalledWith(
        `Add dimension table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should do nothing if unable to parse value', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.createDimensionTable(4, 4, 't1'));

      // Assert
      expect(props.appendFn).not.toBeCalled();
      expect(props.manuallyUpdateSheetContent).not.toBeCalled();
    });
  });

  describe('removeDimension', () => {
    it('should remove dimension from field', () => {
      // Arrange
      const dsl = 'table t1 dim [f1]=1 [f2]=2';
      const expectedDsl = 'table t1 [f1]=1 [f2]=2';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.removeDimension('t1', 'f1'));

      // Assert
      expect(props.appendToFn).toBeCalledWith(
        props.projectName,
        props.sheetName,
        `Remove dimension [f1] from table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should remove dimension from key field', () => {
      // Arrange
      const dsl = 'table t1 key dim [f1]=1 [f2]=2';
      const expectedDsl = 'table t1 key [f1]=1 [f2]=2';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.removeDimension('t1', 'f1'));

      // Assert
      expect(props.appendToFn).toBeCalledWith(
        props.projectName,
        props.sheetName,
        `Remove dimension [f1] from table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should do nothing if remove dimension from not dimension field', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.removeDimension('t1', 'f1'));

      // Assert
      expect(props.appendToFn).not.toBeCalled();
      expect(props.manuallyUpdateSheetContent).not.toBeCalled();
    });
  });

  describe('addDimension', () => {
    it('should add dimension to field', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2';
      const expectedDsl = 'table t1 [f1]=1 dim [f2]=2';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.addDimension('t1', 'f2'));

      // Assert
      expect(props.appendToFn).toBeCalledWith(
        props.projectName,
        props.sheetName,
        `Add dimension [f2] to table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should add dimension to key field', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 key [f2]=2';
      const expectedDsl = 'table t1 [f1]=1 key dim [f2]=2';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.addDimension('t1', 'f2'));

      // Assert
      expect(props.appendToFn).toBeCalledWith(
        props.projectName,
        props.sheetName,
        `Add dimension [f2] to table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should do nothing if add dimension to dimension field', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 dim [f2]=2';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.addDimension('t1', 'f2'));

      // Assert
      expect(props.appendToFn).not.toBeCalled();
      expect(props.manuallyUpdateSheetContent).not.toBeCalled();
    });
  });

  describe('addKey', () => {
    it('should add key to field', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2';
      const expectedDsl = 'table t1 [f1]=1 key [f2]=2';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.addKey('t1', 'f2'));

      // Assert
      expect(props.appendToFn).toBeCalledWith(
        props.projectName,
        props.sheetName,
        `Add key [f2] to table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should do nothing if add key to key field', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 key [f2]=2';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.addKey('t1', 'f2'));

      // Assert
      expect(props.appendToFn).not.toBeCalled();
      expect(props.manuallyUpdateSheetContent).not.toBeCalled();
    });
  });

  describe('removeKey', () => {
    it('should ', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 key [f2]=2';
      const expectedDsl = 'table t1 [f1]=1 [f2]=2';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.removeKey('t1', 'f2'));

      // Assert
      expect(props.appendToFn).toBeCalledWith(
        props.projectName,
        props.sheetName,
        `Remove key [f2] from table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should do nothing if remove key from not key field', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.removeKey('t1', 'f2'));

      // Assert
      expect(props.appendToFn).not.toBeCalled();
      expect(props.manuallyUpdateSheetContent).not.toBeCalled();
    });
  });

  describe('createManualTable', () => {
    it('should create manual table with numeric value', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const expectedDsl =
        'table t1 [f1]=1\r\n\r\n!manual()\r\n!placement(2, 4)\r\ntable Table1\r\n  [Field1] = NA\r\noverride\r\n[Field1]\r\n33';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.createManualTable(4, 4, '33'));

      // Assert
      expect(props.appendFn).toBeCalledWith(
        `Add manual table "Table1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should create manual table with string value', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const expectedDsl =
        'table t1 [f1]=1\r\n\r\n!manual()\r\n!placement(2, 4)\r\ntable Table1\r\n  [Field1] = NA\r\noverride\r\n[Field1]\r\n"some string"';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.createManualTable(4, 4, 'some string'));

      // Assert
      expect(props.appendFn).toBeCalledWith(
        `Add manual table "Table1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should create manual table with unique name', () => {
      // Arrange
      const dsl = 'table Table1 [f1]=1';
      const expectedDsl =
        'table Table1 [f1]=1\r\n\r\n!manual()\r\n!placement(2, 4)\r\ntable Table2\r\n  [Field1] = NA\r\noverride\r\n[Field1]\r\n33';
      props.projectSheets = [
        {
          projectName: 'project1',
          sheetName: 'sheet1',
          content: dsl,
        },
      ] as never[];
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.createManualTable(4, 4, '33'));

      // Assert
      expect(props.appendFn).toBeCalledWith(
        `Add manual table "Table2"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should create manual table in a blank sheet', () => {
      // Arrange
      const dsl = '';
      const expectedDsl =
        '!manual()\r\n!placement(2, 4)\r\ntable Table1\r\n  [Field1] = NA\r\noverride\r\n[Field1]\r\n33';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.createManualTable(4, 4, '33'));

      // Assert
      expect(props.appendFn).toBeCalledWith(
        `Add manual table "Table1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });

  describe('addTableRow', () => {
    it('should create manual table if no target table', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const expectedDsl =
        'table t1 [f1]=1\r\n\r\n!manual()\r\n!placement(2, 4)\r\ntable Table1\r\n  [Field1] = NA\r\noverride\r\n[Field1]\r\n33';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.addTableRow(4, 4, 'Table1', '33'));

      // Assert
      expect(props.appendFn).toBeCalledWith(
        `Add manual table "Table1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should add new row to overrides', () => {
      // Arrange
      const dsl = '!manual() !placement(1,1) table t1 [f1]=1';
      const expectedDsl =
        '!manual() !placement(1,1) table t1 [f1]=1\r\noverride\r\n[f1]\r\n33\r\n\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.addTableRow(1, 3, 't1', '33'));

      // Assert
      expect(props.appendFn).toBeCalledWith(
        `Add override 33 to table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });

  describe('createDimensionalTableFromFormula', () => {
    it('should create dimension table from formula', () => {
      // Arrange
      const dsl = 'table t1 [a]=1 [b]=2 [c]=3';
      const expectedDsl = `table t1 [a]=1 [b]=2 [c]=3\r\n\r\n!placement(5, 4)\r\ntable t2\r\n  dim [source] = t1\r\n  [a] = [source][a]\r\n  [b] = [source][b]\r\n  [c] = [source][c]`;
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() =>
        hook.createDimensionalTableFromFormula(
          4,
          5,
          't2:t1',
          ['a', 'b', 'c'],
          []
        )
      );

      // Assert
      expect(props.appendFn).toBeCalledWith(
        `Add dimension table "t2"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should create dimension table and propagate keys', () => {
      // Arrange
      const dsl = 'table t1 [a]=1 [b]=2 [c]=3';
      const expectedDsl = `table t1 [a]=1 [b]=2 [c]=3\r\n\r\n!placement(5, 4)\r\ntable t2\r\n  dim [source] = t1\r\n  key [a] = [source][a]\r\n  [b] = [source][b]\r\n  [c] = [source][c]`;
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() =>
        hook.createDimensionalTableFromFormula(
          4,
          5,
          't2:t1',
          ['a', 'b', 'c'],
          ['a']
        )
      );

      // Assert
      expect(props.appendFn).toBeCalledWith(
        `Add dimension table "t2"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should create dimension table from formula in empty sheet and with empty schema', () => {
      // Arrange
      const dsl = '';
      const expectedDsl = `!placement(5, 4)\r\ntable t1\r\n  dim [source] = RANGE(10)\r\n`;
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() =>
        hook.createDimensionalTableFromFormula(4, 5, 't1:RANGE(10)', [], [])
      );

      // Assert
      expect(props.appendFn).toBeCalledWith(
        `Add dimension table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });

  describe('createDimensionalTableFromSchema', () => {
    it('should create dimension table from schema', () => {
      // Arrange
      const dsl = 'table t1 [a]=1 [b]=2 [c]=3';
      const expectedDsl = `table t1 [a]=1 [b]=2 [c]=3\r\n\r\n!placement(10, 5)\r\ntable 't1_(1,2,3)[b]'\r\n  dim [source] = t1.FIND(1,2,3)[b]\r\n  [a] = [source][a]\r\n  [b] = [source][b]\r\n  [c] = [source][c]`;
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

      // Assert
      expect(props.appendFn).toBeCalledWith(
        `Add dimension table "t1_(1,2,3)[b]"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should create dimension table and propagate keys', () => {
      // Arrange
      const dsl = 'table t1 [a]=1 [b]=2 [c]=3';
      const expectedDsl = `table t1 [a]=1 [b]=2 [c]=3\r\n\r\n!placement(10, 5)\r\ntable 't1_(1,2,3)[b]'\r\n  dim [source] = t1.FIND(1,2,3)[b]\r\n  key [a] = [source][a]\r\n  [b] = [source][b]\r\n  [c] = [source][c]`;
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

      // Assert
      expect(props.appendFn).toBeCalledWith(
        `Add dimension table "t1_(1,2,3)[b]"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });
});
