import { ChartType } from '@frontend/common';
import { act, RenderHookResult } from '@testing-library/react';

import { useTableEditDsl } from '../useTableEditDsl';
import { hookTestSetup } from './hookTestSetup';
import { RenderProps, TestWrapperProps } from './types';

const initialProps: TestWrapperProps = {
  appendToFn: jest.fn(),
  manuallyUpdateSheetContent: jest.fn(() => Promise.resolve(true)),
  projectName: 'project1',
  sheetName: 'sheet1',
};

describe('useTableEditDsl', () => {
  let props: TestWrapperProps;
  let result: RenderHookResult<
    ReturnType<typeof useTableEditDsl>,
    { dsl: string }
  >['result'];
  let rerender: (props?: RenderProps) => void;

  beforeEach(() => {
    props = { ...initialProps };
    jest.clearAllMocks();

    const hookRender = hookTestSetup(useTableEditDsl, props);

    result = hookRender.result;
    rerender = hookRender.rerender;
  });

  describe('renameTable', () => {
    it('should rename table', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const expectedDsl = 'table t2 [f1]=1\r\n';
      rerender({ dsl });

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
      rerender({ dsl });

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
      rerender({ dsl });

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
      rerender({ dsl });

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
      rerender({ dsl });

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
      rerender({ dsl });

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
      rerender({ dsl });

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
      rerender({ dsl });

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
      rerender({ dsl });

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
      rerender({ dsl });

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
      rerender({ dsl });

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
      rerender({ dsl });

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
      rerender({ dsl });

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
      rerender({ dsl });

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
      rerender({ dsl });

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
      rerender({ dsl });

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

  describe('convertToChart', () => {
    it('should convert chart table to table', () => {
      // Arrange
      const dsl = '!layout(1, 2, "title", "headers")\ntable t1 [f1]=1';
      const expectedDsl =
        '!layout(1, 2, "title", "headers")\n!visualization("line-chart")\ntable t1 [f1]=1\r\n';
      rerender({ dsl });

      // Act
      act(() => result.current.convertToChart('t1', ChartType.LINE));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Convert table "t1" to chart`,
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
      rerender({ dsl });

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
      rerender({ dsl });

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
      rerender({ dsl });

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
      rerender({ dsl });

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
      rerender({ dsl });

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
      rerender({ dsl });

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
  });

  describe('deleteTable', () => {
    it('should delete table', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\ntable t2 [f5]=1';
      const expectedDsl = 'table t1 [f1]=1\r\n';
      rerender({ dsl });

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
      rerender({ dsl });

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
      rerender({ dsl });

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
      rerender({ dsl });

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
      rerender({ dsl });

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
});
