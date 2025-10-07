import { WorksheetState } from '@frontend/common';
import { SheetReader } from '@frontend/parser';
import { act, RenderHookResult } from '@testing-library/react';

import { useTableEditDsl } from '../useTableEditDsl';
import { createWrapper, initialProps } from './createWrapper';
import { hookTestSetup } from './hookTestSetup';
import { TestWrapperProps } from './types';

describe('useTableEditDsl', () => {
  const props: TestWrapperProps = { ...initialProps };
  let result: RenderHookResult<
    ReturnType<typeof useTableEditDsl>,
    { dsl: string }
  >['result'];
  let setDsl: (dsl: string) => void;
  let Wrapper: React.FC<React.PropsWithChildren>;

  beforeAll(() => {
    Wrapper = createWrapper(props);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const hookRender = hookTestSetup(useTableEditDsl, Wrapper);
    result = hookRender.result;
    setDsl = hookRender.setDsl;
  });

  describe('renameTable', () => {
    it('should rename table', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const expectedDsl = 'table t2 [f1]=1\r\n';
      setDsl(dsl);

      // Act
      act(() => result.current.renameTable('t1', 't2'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Rename table "t1" to "t2"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should rename table with unique name', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\ntable t2 [f1]=1';
      const expectedDsl = 'table t3 [f1]=1\ntable t2 [f1]=1\r\n';
      props.projectSheets = [
        {
          projectName: 'project1',
          sheetName: 'sheet1',
          content: dsl,
        },
      ] as never[];
      setDsl(dsl);

      // Act
      act(() => result.current.renameTable('t1', 't2'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Rename table "t1" to "t3"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should rename table with name in quotes', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const expectedDsl = `table 'table name with spaces' [f1]=1\r\n`;
      setDsl(dsl);

      // Act
      act(() => result.current.renameTable('t1', 'table name with spaces'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Rename table "t1" to "'table name with spaces'"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should rename table with show table header', () => {
      // Arrange
      const dsl = '!layout(2, 1)\ntable t1 [f1]=1';
      const expectedDsl = `!layout(1, 1, "title")\ntable t2 [f1]=1\r\n`;
      setDsl(dsl);

      // Act
      act(() => result.current.renameTable('t1', 't2', { showHeader: true }));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Rename table "t1" to "t2"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('toggleTableTitleOrHeaderVisibility', () => {
    it('should show table header', () => {
      // Arrange
      const dsl = '!layout(2, 1)\ntable t1\n[f1]=1';
      const expectedDsl = '!layout(2, 1, "title")\ntable t1\n[f1]=1\r\n';
      setDsl(dsl);

      // Act
      act(() => result.current.toggleTableTitleOrHeaderVisibility('t1', true));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Show header of table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should hide table header', () => {
      // Arrange
      const dsl = '!layout(2, 1, "title")\ntable t1\n[f1]=1';
      const expectedDsl = '!layout(2, 1)\ntable t1\n[f1]=1\r\n';
      setDsl(dsl);

      // Act
      act(() => result.current.toggleTableTitleOrHeaderVisibility('t1', true));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Hide header of table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should show table field headers', () => {
      // Arrange
      const dsl = '!layout(2, 1)\ntable t1\n[f1]=1';
      const expectedDsl = '!layout(2, 1, "headers")\ntable t1\n[f1]=1\r\n';
      setDsl(dsl);

      // Act
      act(() => result.current.toggleTableTitleOrHeaderVisibility('t1', false));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Show fields of table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should hide table field header', () => {
      // Arrange
      const dsl = '!layout(2, 1, "headers")\ntable t1\n[f1]=1';
      const expectedDsl = '!layout(2, 1)\ntable t1\n[f1]=1\r\n';
      setDsl(dsl);

      // Act
      act(() => result.current.toggleTableTitleOrHeaderVisibility('t1', false));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Hide fields of table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('moveTable', () => {
    it('should move table by 1 row and 1 column', () => {
      // Arrange
      const dsl = '!layout(1, 2, "title")\n table t1 [f1]=1';
      const expectedDsl = '!layout(2, 3, "title")\n table t1 [f1]=1\r\n';
      setDsl(dsl);

      // Act
      act(() => result.current.moveTable('t1', 1, 1));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Move table "t1" to (2, 3)`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );

      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should move table without layout decorator', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const expectedDsl = '!layout(3, 3)\ntable t1 [f1]=1\r\n';
      setDsl(dsl);

      // Act
      act(() => result.current.moveTable('t1', 2, 2));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Move table "t1" to (3, 3)`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('moveTableTo', () => {
    it('should do nothing if move to the same cell', () => {
      // Arrange
      const dsl = '!layout(2, 2, "title") table t1 [f1]=1';
      setDsl(dsl);

      // Act
      act(() => result.current.moveTableTo('t1', 2, 2));

      // Assert
      expect(props.appendToFn).not.toHaveBeenCalled();
      expect(props.manuallyUpdateSheetContent).not.toHaveBeenCalled();
    });

    it('should move table by 5 row and 8 column', () => {
      // Arrange
      const dsl = '!layout(1, 2, "title") table t1 [f1]=1';
      const expectedDsl = '!layout(5, 8, "title")\n table t1 [f1]=1\r\n';
      setDsl(dsl);

      // Act
      act(() => result.current.moveTableTo('t1', 5, 8));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Move table "t1" to (5, 8)`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );

      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should create decorator if it not specified and move to the new position', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const expectedDsl = '!layout(3, 3)\ntable t1 [f1]=1\r\n';
      setDsl(dsl);

      // Act
      act(() => result.current.moveTableTo('t1', 3, 3));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Move table "t1" to (3, 3)`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('flipTable', () => {
    it('should make table horizontal', () => {
      // Arrange
      const dsl = '!layout(1, 2, "title", "headers")\ntable t1 [f1]=1';
      const expectedDsl =
        '!layout(1, 2, "horizontal", "title", "headers")\ntable t1 [f1]=1\r\n';
      setDsl(dsl);

      // Act
      act(() => result.current.flipTable('t1'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Make table "t1" horizontal`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );

      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should make table vertical', () => {
      // Arrange
      const dsl =
        '!layout(1, 2, "title", "headers", "horizontal")\ntable t1 [f1]=1';
      const expectedDsl =
        '!layout(1, 2, "title", "headers")\ntable t1 [f1]=1\r\n';
      setDsl(dsl);

      // Act
      act(() => result.current.flipTable('t1'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Make table "t1" vertical`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );

      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('convertToTable', () => {
    it('should convert chart table to table', () => {
      // Arrange
      const dsl =
        '!layout(1, 2, "title", "headers")\n!visualization("line-chart")\ntable t1 [f1]=1';
      const expectedDsl =
        '!layout(1, 2, "title", "headers")\ntable t1 [f1]=1\r\n';
      setDsl(dsl);

      // Act
      act(() => result.current.convertToTable('t1'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Convert chart "t1" to table`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );

      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('updateTableDecoratorValue', () => {
    it('should update table decorator', () => {
      // Arrange
      const dsl = '!some_decorator("some value")\ntable t1 [f1]=1';
      const expectedDsl =
        '!some_decorator("another value")\ntable t1 [f1]=1\r\n';
      setDsl(dsl);

      // Act
      act(() =>
        result.current.updateTableDecoratorValue(
          't1',
          `"another value"`,
          'some_decorator'
        )
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Update "some_decorator" value for table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );

      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should clear table decorator value', () => {
      // Arrange
      const dsl = '!some_decorator("some value")\ntable t1 [f1]=1';
      const expectedDsl = '!some_decorator()\ntable t1 [f1]=1\r\n';
      setDsl(dsl);

      // Act
      act(() =>
        result.current.updateTableDecoratorValue('t1', '', 'some_decorator')
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Update "some_decorator" value for table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );

      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('swapFields', () => {
    it('should swap field left', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\n[f2]=2\n[f3]=3\n[f4]=4\n';
      const expectedDsl = 'table t1 [f1]=1\n[f3]=3\n[f2]=2\n[f4]=4\r\n';
      setDsl(dsl);

      // Act
      act(() => result.current.swapFields('t1', 'f3', 'f2', 'left'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Swap fields [f3] and [f2] in table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should swap field right', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\n[f2]=2\n[f3]=3\n[f4]=4\n';
      const expectedDsl = 'table t1 [f1]=1\n[f2]=2\n[f4]=4\n[f3]=3\r\n';
      setDsl(dsl);

      // Act
      act(() => result.current.swapFields('t1', 'f4', 'f3', 'right'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Swap fields [f4] and [f3] in table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('swapFieldsByDirection', () => {
    it('should swap field by direction to the left', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\n[f2]=2\n[f3]=3\n[f4]=4\n';
      const expectedDsl = 'table t1 [f1]=1\n[f3]=3\n[f2]=2\n[f4]=4\r\n';
      setDsl(dsl);

      // Act
      act(() => result.current.swapFieldsByDirection('t1', 'f3', 'left'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Swap fields [f3] and [f2] in table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should swap field by direction to the right', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\n[f2]=2\n[f3]=3\n[f4]=4\n';
      const expectedDsl = 'table t1 [f1]=1\n[f2]=2\n[f4]=4\n[f3]=3\r\n';
      setDsl(dsl);

      // Act
      act(() => result.current.swapFieldsByDirection('t1', 'f3', 'right'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Swap fields [f4] and [f3] in table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should swap correct field groups to the left', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\ndim [a], [b], [c] = t[[a],[b],[c]]';
      const expectedDsl =
        'table t1 dim [a], [b], [c] = t[[a],[b],[c]]\r\n[f1]=1\r\n';
      setDsl(dsl);

      // Act
      act(() => result.current.swapFieldsByDirection('t1', 'a', 'left'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Swap fields [a] and [f1] in table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should swap correct field groups to the right', () => {
      // Arrange
      const dsl = 'table t1 dim [a], [b], [c] = t[[a],[b],[c]]\n[f1]=1';
      const expectedDsl =
        'table t1 [f1]=1\r\ndim [a], [b], [c] = t[[a],[b],[c]]\r\n';
      setDsl(dsl);

      // Act
      act(() => result.current.swapFieldsByDirection('t1', 'c', 'right'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Swap fields [f1] and [c] in table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should swap fields inside field group, dim keyword and multi accessors list', () => {
      // Arrange
      const dsl = 'table t1\ndim [a], [b], [c] = t[[a],[b],[c]]\r\n';
      const expectedDsl = 'table t1\ndim [b], [a], [c] = t[[b],[a],[c]]\r\n';
      setDsl(dsl);

      // Act
      act(() => result.current.swapFieldsByDirection('t1', 'a', 'right'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Swap fields [b] and [a] in table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('deleteTable', () => {
    it('should delete table', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\ntable t2 [f5]=1';
      const expectedDsl = 'table t1 [f1]=1\r\n';
      setDsl(dsl);

      // Act
      act(() => result.current.deleteTable('t2'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Delete table "t2"`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should delete table with name in quotes', () => {
      // Arrange
      const dsl = `table t1 [f1]=1\ntable 't spaces' [f5]=1`;
      const expectedDsl = 'table t1 [f1]=1\r\n';
      setDsl(dsl);

      // Act
      act(() => result.current.deleteTable(`'t spaces'`));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Delete table "'t spaces'"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('deleteTables', () => {
    it('should delete tables', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\ntable t2 [f2]=2\ntable t3 [f3]=3';
      const expectedDsl = 'table t1 [f1]=1\r\n';
      setDsl(dsl);

      // Act
      act(() => result.current.deleteTables(['t2', 't3']));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Delete tables "t2", "t3"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('arrangeTable', () => {
    it('should bring table to front', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\ntable t2 [f2]=2\ntable t3 [f3]=3\n';
      const expectedDsl =
        'table t2 [f2]=2\ntable t3 [f3]=3\n\r\ntable t1 [f1]=1\r\n';
      setDsl(dsl);

      // Act
      act(() => result.current.arrangeTable('t1', 'front'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Table "t1" moved front`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should bring table to back', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\ntable t2 [f2]=2\ntable t3 [f3]=3\n';
      const expectedDsl =
        'table t3 [f3]=3\n\r\ntable t1 [f1]=1\ntable t2 [f2]=2\r\n';
      setDsl(dsl);

      // Act
      act(() => result.current.arrangeTable('t3', 'back'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Table "t3" moved back`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('cloneTable', () => {
    it('should clone table with some default placement', () => {
      // Arrange
      const dsl = '!layout(1, 1)\ntable t1\n[a]=1\n[b]=2\n[c]=3';
      const expectedDsl = `!layout(1, 1)\ntable t1\n[a]=1\n[b]=2\n[c]=3\r\n!layout(2, 2)\ntable 't1 clone'\n[a]=1\n[b]=2\n[c]=3\r\n`;
      setDsl(dsl);

      // Act
      act(() => result.current.cloneTable('t1'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Cloned table "t1" with new name "'t1 clone'"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should clone table with escaped name and create unique name', () => {
      // Arrange
      const dsl = `!layout(7,4,"title")\ntable '''Table1 clone'' clone'\n[Field1] = 123\n!layout(8, 5, "title")\ntable '''Table1 clone'' clone clone'\n[Field1] = 123`;
      const expectedDsl = `!layout(7,4,"title")\ntable '''Table1 clone'' clone'\n[Field1] = 123\n!layout(8, 5, "title")\ntable '''Table1 clone'' clone clone'\n[Field1] = 123\r\n!layout(8, 5, "title")\ntable '''Table1 clone'' clone clone1'\n[Field1] = 123\r\n`;
      setDsl(dsl);

      // Act
      act(() => result.current.cloneTable(`'''Table1 clone'' clone'`));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Cloned table "'''Table1 clone'' clone'" with new name "'''Table1 clone'' clone clone1'"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('moveTableToSheet', () => {
    it('should move table from one sheet to another without other tables', () => {
      // Arrange
      const projectName = 'Project';

      const sourceSheetName = 'Sheet1';
      const dslSourceSheet = `table t1 [Field1] = 123`;
      const expectedDslSourceSheet = `\r\n`;

      const destinationSheetName = 'Sheet2';
      const dslDestinationSheet = ``;
      const expectedDslDestinationSheet = `table t1 [Field1] = 123\r\n`;

      props.projectSheets = [
        {
          sheetName: sourceSheetName,
          projectName,
          content: dslSourceSheet,
        },
        {
          sheetName: destinationSheetName,
          projectName,
          content: dslDestinationSheet,
        },
      ] as WorksheetState[];
      Wrapper = createWrapper(props);
      props.sheetName = sourceSheetName;
      const hookRender = hookTestSetup(useTableEditDsl, Wrapper);
      result = hookRender.result;

      // Act
      act(() =>
        result.current.moveTableToSheet(
          't1',
          sourceSheetName,
          destinationSheetName
        )
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Move table "t1" from sheet "Sheet1" to sheet "Sheet2"`,
        [
          { sheetName: sourceSheetName, content: expectedDslSourceSheet },
          {
            sheetName: destinationSheetName,
            content: expectedDslDestinationSheet,
          },
        ]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: sourceSheetName, content: expectedDslSourceSheet },
        {
          sheetName: destinationSheetName,
          content: expectedDslDestinationSheet,
        },
      ]);
    });

    it('should move table from one sheet to another when other other tables presented', () => {
      // Arrange
      const projectName = 'Project';

      const sourceSheetName = 'Sheet1';
      const dslSourceSheet = `table t0 [Field1] = 123\r\ntable t1 [Field1] = 123\r\ntable t2 [Field1] = 123`;
      const expectedDslSourceSheet = `table t0 [Field1] = 123\r\ntable t2 [Field1] = 123\r\n`;

      const destinationSheetName = 'Sheet2';
      const dslDestinationSheet = `table p0 [Field1] = 123\r\ntable p2 [Field1] = 123`;
      const expectedDslDestinationSheet = `table p0 [Field1] = 123\r\ntable p2 [Field1] = 123\r\ntable t1 [Field1] = 123\r\n`;

      props.projectSheets = [
        {
          sheetName: sourceSheetName,
          projectName,
          content: dslSourceSheet,
        },
        {
          sheetName: destinationSheetName,
          projectName,
          content: dslDestinationSheet,
        },
      ] as WorksheetState[];
      props.sheetName = sourceSheetName;
      Wrapper = createWrapper(props);
      const hookRender = hookTestSetup(useTableEditDsl, Wrapper);
      result = hookRender.result;

      // Act
      act(() =>
        result.current.moveTableToSheet(
          't1',
          sourceSheetName,
          destinationSheetName
        )
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Move table "t1" from sheet "Sheet1" to sheet "Sheet2"`,
        [
          { sheetName: sourceSheetName, content: expectedDslSourceSheet },
          {
            sheetName: destinationSheetName,
            content: expectedDslDestinationSheet,
          },
        ]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: sourceSheetName, content: expectedDslSourceSheet },
        {
          sheetName: destinationSheetName,
          content: expectedDslDestinationSheet,
        },
      ]);
    });

    it('should move table from not current sheet to current sheet', () => {
      // Arrange
      const projectName = 'Project';

      const sourceSheetName = 'Sheet1';
      const dslSourceSheet = `table t1 [Field1] = 123`;
      const expectedDslSourceSheet = `\r\n`;

      const destinationSheetName = 'Sheet2';
      const dslDestinationSheet = ``;
      const expectedDslDestinationSheet = `table t1 [Field1] = 123\r\n`;

      props.projectSheets = [
        {
          sheetName: sourceSheetName,
          projectName,
          content: dslSourceSheet,
        },
        {
          sheetName: destinationSheetName,
          projectName,
          content: dslDestinationSheet,
        },
      ] as WorksheetState[];
      props.parsedSheets = {
        [sourceSheetName]: SheetReader.parseSheet(dslSourceSheet),
        [destinationSheetName]: SheetReader.parseSheet(dslDestinationSheet),
      };
      props.sheetName = destinationSheetName;
      Wrapper = createWrapper(props);
      const hookRender = hookTestSetup(useTableEditDsl, Wrapper);
      result = hookRender.result;

      // Act
      act(() =>
        result.current.moveTableToSheet(
          't1',
          sourceSheetName,
          destinationSheetName
        )
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Move table "t1" from sheet "Sheet1" to sheet "Sheet2"`,
        [
          { sheetName: sourceSheetName, content: expectedDslSourceSheet },
          {
            sheetName: destinationSheetName,
            content: expectedDslDestinationSheet,
          },
        ]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: sourceSheetName, content: expectedDslSourceSheet },
        {
          sheetName: destinationSheetName,
          content: expectedDslDestinationSheet,
        },
      ]);
    });
  });
});
