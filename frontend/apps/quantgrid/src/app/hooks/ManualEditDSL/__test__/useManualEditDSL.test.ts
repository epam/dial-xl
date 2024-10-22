import { act } from '@testing-library/react';

import { getRenderedHook } from './utils';

const props = {
  appendFn: jest.fn(),
  appendToFn: jest.fn(),
  updateSheetContent: jest.fn(() => true),
  manuallyUpdateSheetContent: jest.fn(() => true),
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
    it('should move table by 1 row and 1 column', async () => {
      // Arrange
      const dsl = '!placement(1, 2)\r\n table t1 [f1]=1';
      const expectedDsl = '!placement(2, 3)\r\n table t1 [f1]=1\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.moveTable('t1', 1, 1));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Move table "t1" to (2, 3)`,
        expectedDsl
      );

      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should move table without placement decorator', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const expectedDsl = '!placement(3, 3)\r\ntable t1 [f1]=1\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.moveTable('t1', 2, 2));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
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
    it('should move table by 5 row and 8 column', async () => {
      // Arrange
      const dsl = '!placement(1, 2) table t1 [f1]=1';
      const expectedDsl = '!placement(5, 8)\r\n table t1 [f1]=1\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.moveTableTo('t1', 5, 8));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Move table "t1" to (5, 8)`,
        expectedDsl
      );

      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should create decorator if it not specified and move to the new position', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const expectedDsl = '!placement(3, 3)\r\ntable t1 [f1]=1\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.moveTableTo('t1', 3, 3));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
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
    it('should rename table', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const expectedDsl = 'table t2 [f1]=1\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.renameTable('t1', 't2'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Rename table "t1" to "t2"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should rename table with unique name', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\r\ntable t2 [f1]=1';
      const expectedDsl = 'table t3 [f1]=1\r\ntable t2 [f1]=1\r\n';
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
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Rename table "t1" to "t3"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should rename table with name in quotes', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const expectedDsl = `table 'table name with spaces' [f1]=1\r\n`;
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.renameTable('t1', 'table name with spaces'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
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
    it('should rename table field', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\r\n[f2]=2';
      const expectedDsl = 'table t1 [f5]=1\r\n[f2]=2\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.renameField('t1', 'f1', 'f5'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Rename field [f1] to [f5] in table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should sanitize field name when rename field', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\r\n[f2]=2';
      const expectedDsl = 'table t1 [f4]=1\r\n[f2]=2\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.renameField('t1', 'f1', '[f4]'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Rename field [f1] to [f4] in table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should not rename if new name is the same', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\r\n[f2]=2';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.renameField('t1', 'f1', 'f1'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).not.toHaveBeenCalled();
      expect(props.manuallyUpdateSheetContent).not.toHaveBeenCalled();
    });

    it('should rename override field in table with keys', async () => {
      // Arrange
      const dsl =
        'table t1 key [f1]=1\r\n[f2]=2\r\noverride\r\nkey [f1],[f2]\r\n1,3\r\n';
      const expectedDsl =
        'table t1 key [f1]=1\r\n[f3]=2\r\noverride\r\nkey [f1],[f3]\r\n1,3\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.renameField('t1', 'f2', 'f3'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Rename field [f2] to [f3] in table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should rename override field in table without keys', async () => {
      // Arrange
      const dsl =
        'table t1 [f1]=1\r\n[f2]=2\r\noverride\r\nrow,[f2]\r\n1,3\r\n';
      const expectedDsl =
        'table t1 [f1]=1\r\n[f3]=2\r\noverride\r\nrow,[f3]\r\n1,3\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.renameField('t1', 'f2', 'f3'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Rename field [f2] to [f3] in table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should rename override field in manual table', async () => {
      // Arrange
      const dsl =
        '!manual() table t1 [f1]=1\r\n[f2]=2\r\noverride\r\n[f2]\r\n3\r\n';
      const expectedDsl =
        '!manual() table t1 [f1]=1\r\n[f3]=2\r\noverride\r\n[f3]\r\n3\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.renameField('t1', 'f2', 'f3'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Rename field [f2] to [f3] in table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should rename field in apply sort section', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\r\n[f2]=2\r\napply\r\nsort [f1]\r\n';
      const expectedDsl = 'table t1 [f3]=1\r\n[f2]=2\r\napply\r\nsort [f3]\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.renameField('t1', 'f1', 'f3'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Rename field [f1] to [f3] in table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should rename field in apply filter section', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\r\n[f2]=2\r\napply\r\nfilter [f1] >= 1\r\n';
      const expectedDsl =
        'table t1 [f3]=1\r\n[f2]=2\r\napply\r\nfilter [f3] >= 1\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.renameField('t1', 'f1', 'f3'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Rename field [f1] to [f3] in table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should rename field in both apply sections', async () => {
      // Arrange
      const dsl =
        'table t1 [f1]=1\r\n[f2]=2\r\napply\r\nsort -[f1]\r\nfilter [f1] >= 1\r\n';
      const expectedDsl =
        'table t1 [f3]=1\r\n[f2]=2\r\napply\r\nsort -[f3]\r\nfilter [f3] >= 1\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.renameField('t1', 'f1', 'f3'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Rename field [f1] to [f3] in table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should rename field in total section', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\r\n[f2]=2\r\ntotal\r\n[f1]=SUM(t1[f1])\r\n';
      const expectedDsl =
        'table t1 [f3]=1\r\n[f2]=2\r\ntotal\r\n[f3]=SUM(t1[f3])\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.renameField('t1', 'f1', 'f3'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Rename field [f1] to [f3] in table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should rename each field entry in total section', async () => {
      // Arrange
      const dsl =
        'table t1 [f1]=1\r\n[f2]=2\r\ntotal\r\n[f1]=SUM(t1[f1])\r\ntotal\r\n[f1]=COUNT(t1[f1])\r\ntotal\r\n[f1]=MAX(t1[f1])\r\n';
      const expectedDsl =
        'table t1 [f3]=1\r\n[f2]=2\r\ntotal\r\n[f3]=SUM(t1[f3])\r\ntotal\r\n[f3]=COUNT(t1[f3])\r\ntotal\r\n[f3]=MAX(t1[f3])\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.renameField('t1', 'f1', 'f3'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Rename field [f1] to [f3] in table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });

  describe('editExpression', () => {
    it('should edit expression', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const expectedDsl = 'table t1 [f1]=2 + 2\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.editExpression('t1', 'f1', '2 + 2'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Update expression of field [f1] in table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should edit expression which starts with equals', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const expectedDsl = 'table t1 [f1]=2 + 2\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.editExpression('t1', 'f1', '= 2 + 2'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Update expression of field [f1] in table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should wrap expression in ERR function if tries to add table or field', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const expectedDsl = `table t1 [f1]=ERR("2\r\ntable t2 [f]=2")\r\n`;
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.editExpression('t1', 'f1', '2\r\ntable t2 [f]=2'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Update expression of field [f1] in table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should do nothing if no target field', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.editExpression('t1', 'f2', '2 + 2'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).not.toHaveBeenCalled();
      expect(props.manuallyUpdateSheetContent).not.toHaveBeenCalled();
    });

    it('should edit field empty value expression', async () => {
      // Arrange
      const dsl = 'table t1 [f1]';
      const expectedDsl = 'table t1 [f1] = 2 + 2\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.editExpression('t1', 'f1', '2 + 2'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Update expression of field [f1] in table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });

  describe('deleteField', () => {
    it('should delete field', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\r\ntable t2 [f1]=1\r\n[f2]=2';
      const expectedDsl = 'table t1 [f1]=1\r\ntable t2 [f1]=1\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.deleteField('t2', 'f2'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Delete field [f2] from table "t2"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should delete table when remove last table field', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\r\ntable t2 [f1]=1 [f2]=2';
      const expectedDsl = 'table t2 [f1]=1 [f2]=2\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.deleteField('t1', 'f1'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Delete table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should delete field totals with removed field', async () => {
      // Arrange
      const dsl =
        'table t1 [f1]=1\r\n[f2]=2\r\n[f3]=2\r\ntotal\r\n[f1]=SUM(t1[f1])\r\n[f2]=MIN(t1[f2]\r\n[f3]=SUM(t1[f3])\r\ntotal\r\n[f2]=SUM(t1[f2])\r\n';
      const expectedDsl =
        'table t1 [f1]=1\r\n[f3]=2\r\ntotal\r\n[f1]=SUM(t1[f1])\r\n[f3]=SUM(t1[f3])\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.deleteField('t1', 'f2'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Delete field [f2] from table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should delete field override with removed field', async () => {
      // Arrange
      const dsl =
        'table t1 [f1]=1\r\n[f2]=2\r\n[f3]=2\r\noverride\r\nrow,[f1],[f2]\r\n1,2,2\r\n2,4,4\r\n';
      const expectedDsl =
        'table t1 [f1]=1\r\n[f3]=2\r\noverride\r\nrow,[f1]\r\n1,2\r\n2,4\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.deleteField('t1', 'f2'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Delete field [f2] from table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should delete override section with removed field', async () => {
      // Arrange
      const dsl =
        'table t1 [f1]=1\r\n[f2]=2\r\n[f3]=2\r\noverride\r\nrow,[f2]\r\n1,2\r\n2,4\r\n';
      const expectedDsl = 'table t1 [f1]=1\r\n[f3]=2\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.deleteField('t1', 'f2'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Delete field [f2] from table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should delete field sort with removed field', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\r\n[f2]=2\r\napply\r\nsort [f2],[f1]\r\n';
      const expectedDsl = 'table t1 [f1]=1\r\napply\r\nsort [f1]\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.deleteField('t1', 'f2'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Delete field [f2] from table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should delete field filter with removed field', async () => {
      // Arrange
      const dsl =
        'table t1 [f1]=1\r\n[f2]=2\r\napply\r\nfilter [f1] = 1 AND [f2] = 2 \r\n';
      const expectedDsl = 'table t1 [f1]=1\r\napply\r\nfilter [f1] = 1\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.deleteField('t1', 'f2'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Delete field [f2] from table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });

  describe('swapFields', () => {
    it('should swap field left', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\r\n[f2]=2\r\n[f3]=3\r\n[f4]=4';
      const expectedDsl = 'table t1 [f1]=1\r\n[f3]=3\r\n[f2]=2\r\n[f4]=4\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.swapFields('t1', 'f3', 'f2', 'left'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Swap fields [f3] and [f2] in table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should swap field right', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\r\n[f2]=2\r\n[f3]=3\r\n[f4]=4';
      const expectedDsl = 'table t1 [f1]=1\r\n[f2]=2\r\n[f4]=4\r\n[f3]=3\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.swapFields('t1', 'f4', 'f3', 'right'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
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
    it('should add field to table', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const expectedDsl = 'table t1 [f1]=1\r\n [f2] = 2 + 2\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.addField('t1', '[f2] = 2 + 2'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add [f2] to table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should add field to empty table', async () => {
      // Arrange
      const dsl = 'table t1';
      const expectedDsl = 'table t1\r\n  [f2] = 2 + 2\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.addField('t1', '[f2] = 2 + 2'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add [f2] to table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should add field before first field if direction is left', async () => {
      // Arrange
      const dsl = `table t1\r\n[f1] = 2`;
      const expectedDsl = 'table t1\r\n  [field]\n[f1] = 2\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() =>
        hook.addField('t1', 'field', {
          direction: 'left',
          insertFromFieldName: 'f1',
        })
      );
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add [field] to table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should add field to left with left direction and table has multiple fields', async () => {
      // Arrange
      const dsl = 'table t1  [f1] = 2\r\n  [f2] = 3\r\n  [f3] = 4';
      const expectedDsl =
        'table t1  [f1] = 2\r\n  [field]\r\n  [f2] = 3\r\n  [f3] = 4\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() =>
        hook.addField('t1', 'field', {
          direction: 'left',
          insertFromFieldName: 'f2',
        })
      );
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add [field] to table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should add field to right with right direction', async () => {
      // Arrange
      const dsl = 'table t1  [f1] = 2\r\n  [f2] = 3\r\n  [f3] = 4';
      const expectedDsl =
        'table t1  [f1] = 2\r\n  [field]\r\n  [f2] = 3\r\n  [f3] = 4\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() =>
        hook.addField('t1', 'field', {
          direction: 'right',
          insertFromFieldName: 'f1',
        })
      );
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add [field] to table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should add field at the end of the table if there is no insertFromFieldName', async () => {
      // Arrange
      const dsl = 'table t1  [f1] = 2  [f2] = 3  [f3] = 4';
      const expectedDsl =
        'table t1  [f1] = 2  [f2] = 3  [f3] = 4\r\n  [field]\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() =>
        hook.addField('t1', 'field', {
          direction: 'right',
        })
      );
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add [field] to table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should add field at the end of the table if there is no insertFromFieldName and direction', async () => {
      // Arrange
      const dsl = 'table t1  [f1] = 2  [f2] = 3  [f3] = 4';
      const expectedDsl =
        'table t1  [f1] = 2  [f2] = 3  [f3] = 4\r\n  [field]\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.addField('t1', 'field'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add [field] to table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });

  describe('removeDimension', () => {
    it('should remove dimension from field', async () => {
      // Arrange
      const dsl = 'table t1 dim [f1]=1\r\n[f2]=2';
      const expectedDsl = 'table t1 [f1]=1\r\n[f2]=2\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.removeDimension('t1', 'f1'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Remove dimension [f1] from table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should remove dimension from key field', async () => {
      // Arrange
      const dsl = 'table t1 key dim [f1]=1\r\n[f2]=2';
      const expectedDsl = 'table t1 key [f1]=1\r\n[f2]=2\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.removeDimension('t1', 'f1'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Remove dimension [f1] from table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should do nothing if remove dimension from not dimension field', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\r\n[f2]=2';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.removeDimension('t1', 'f1'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).not.toHaveBeenCalled();
      expect(props.manuallyUpdateSheetContent).not.toHaveBeenCalled();
    });
  });

  describe('addDimension', () => {
    it('should add dimension to field', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\r\n[f2]=2';
      const expectedDsl = 'table t1 [f1]=1\r\ndim [f2]=2\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.addDimension('t1', 'f2'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add dimension [f2] to table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should add dimension to key field', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\r\nkey [f2]=2';
      const expectedDsl = 'table t1 [f1]=1\r\nkey dim [f2]=2\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.addDimension('t1', 'f2'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add dimension [f2] to table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should do nothing if add dimension to dimension field', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\r\ndim [f2]=2';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.addDimension('t1', 'f2'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).not.toHaveBeenCalled();
      expect(props.manuallyUpdateSheetContent).not.toHaveBeenCalled();
    });
  });

  describe('addKey', () => {
    it('should add key to field', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\r\n[f2]=2';
      const expectedDsl = 'table t1 [f1]=1\r\nkey [f2]=2\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.addKey('t1', 'f2'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add key [f2] to table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should do nothing if add key to key field', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\r\nkey [f2]=2';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.addKey('t1', 'f2'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).not.toHaveBeenCalled();
      expect(props.manuallyUpdateSheetContent).not.toHaveBeenCalled();
    });

    it('should add key after field size decorator', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 !size(3) [f2]=2';
      const expectedDsl = 'table t1 [f1]=1 !size(3) key [f2]=2\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.addKey('t1', 'f2'));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should add key between size decorator and dim keyword', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 !size(3) dim [f2]=2';
      const expectedDsl = 'table t1 [f1]=1 !size(3) key dim [f2]=2\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.addKey('t1', 'f2'));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });

  describe('removeKey', () => {
    it('should ', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\r\nkey [f2]=2';
      const expectedDsl = 'table t1 [f1]=1\r\n[f2]=2\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.removeKey('t1', 'f2'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Remove key [f2] from table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should do nothing if remove key from not key field', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\r\n[f2]=2';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.removeKey('t1', 'f2'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).not.toHaveBeenCalled();
      expect(props.manuallyUpdateSheetContent).not.toHaveBeenCalled();
    });
  });

  describe('removeNote', () => {
    it('should remove single line comment', async () => {
      // Arrange
      const dsl = 'table t1 [a]=1\r\n##comment\r\n[b]=2\r\n[c]=3';
      const expectedDsl = `table t1 [a]=1\r\n[b]=2\r\n[c]=3\r\n`;
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.removeNote('t1', 'b'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Remove note from t1[b]`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should remove multiple line comment', async () => {
      // Arrange
      const dsl =
        'table t1 [a]=1\r\n##comment\r\n##multiline comment\r\n[b]=2\r\n[c]=3';
      const expectedDsl = `table t1 [a]=1\r\n[b]=2\r\n[c]=3\r\n`;
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.removeNote('t1', 'b'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Remove note from t1[b]`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });

  describe('updateNote', () => {
    it('should update single line comment', async () => {
      // Arrange
      const dsl = 'table t1 [a]=1\r\n##comment\r\n[b]=2\r\n[c]=3';
      const expectedDsl = `table t1 [a]=1\r\n##updated comment\r\n[b]=2\r\n[c]=3\r\n`;
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.updateNote('t1', 'b', 'updated comment'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Update note for t1[b]`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should update multiline comment', async () => {
      // Arrange
      const dsl = 'table t1 [a]=1\r\n##comment\r\n##comment1\r\n[b]=2\r\n[c]=3';
      const expectedDsl = `table t1 [a]=1\r\n##comment\r\n##comment1\r\n##another line\r\n[b]=2\r\n[c]=3\r\n`;
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() =>
        hook.updateNote('t1', 'b', 'comment\r\ncomment1\r\nanother line')
      );
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Update note for t1[b]`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });

  describe('increaseColumnWidth', () => {
    it('should add field size decorator if not exists', async () => {
      // Arrange
      const dsl = 'table t1 [a]=1\r\n[b]=2\r\n[c]=3';
      const expectedDsl = `table t1 [a]=1\r\n!size(2) [b]=2\r\n[c]=3\r\n`;
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.onIncreaseFieldColumnSize('t1', 'b'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Increase [b] column width in table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
    it('should update field size decorator correct', async () => {
      // Arrange
      const dsl = 'table t1 !size(5) [a]=1\r\n[b]=2\r\n[c]=3';
      const expectedDsl = `table t1 !size(6) [a]=1\r\n[b]=2\r\n[c]=3\r\n`;
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.onIncreaseFieldColumnSize('t1', 'a'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Increase [a] column width in table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });
  describe('decreaseColumnWidth', () => {
    it('should not do anything if field sizes decorator not exists', async () => {
      // Arrange
      const dsl = 'table t1 [a]=1\r\n[b]=2\r\n[c]=3';
      const expectedDsl = `table t1 [a]=1\r\n[b]=2\r\n[c]=3\r\n`;
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.onDecreaseFieldColumnSize('t1', 'b'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).not.toHaveBeenCalledWith(
        props.projectName,
        props.sheetName,
        `Decrease [b] column width in table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).not.toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should update field sizes decorator correct', async () => {
      // Arrange
      const dsl = 'table t1 !size(6) [a]=1\r\n[b]=2\r\n[c]=3';
      const expectedDsl = `table t1 !size(5) [a]=1\r\n[b]=2\r\n[c]=3\r\n`;
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.onDecreaseFieldColumnSize('t1', 'a'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Decrease [a] column width in table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });
  describe('onCloneTable', () => {
    it('should clone table with some default placement', async () => {
      // Arrange
      const dsl = '!placement(1, 1)\r\ntable t1\r\n[a]=1\r\n[b]=2\r\n[c]=3';
      const expectedDsl = `!placement(1, 1)\r\ntable t1\r\n[a]=1\r\n[b]=2\r\n[c]=3\r\n\r\n!placement(2, 2)\r\ntable 't1 clone'\r\n[a]=1\r\n[b]=2\r\n[c]=3\r\n`;
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.onCloneTable('t1'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Cloned table "t1" with new name "'t1 clone'"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });
});
