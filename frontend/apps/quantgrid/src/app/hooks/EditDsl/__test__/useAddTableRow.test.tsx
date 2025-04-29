import { act, RenderHookResult } from '@testing-library/react';

import { useAddTableRow } from '../useAddTableRow';
import { hookTestSetup } from './hookTestSetup';
import { RenderProps, TestWrapperProps } from './types';

const initialProps: TestWrapperProps = {
  appendToFn: jest.fn(),
  manuallyUpdateSheetContent: jest.fn(() => Promise.resolve(true)),
  projectName: 'project1',
  sheetName: 'sheet1',
};

describe('useAddTableRow', () => {
  let props: TestWrapperProps;
  let hook: RenderHookResult<
    ReturnType<typeof useAddTableRow>,
    { dsl: string }
  >['result'];
  let rerender: (props?: RenderProps) => void;

  beforeEach(() => {
    props = { ...initialProps };
    props.gridApi = {
      getCell: () => {
        return {
          table: {
            tableName: 't1',
          },
          field: {
            fieldName: 'f1',
          },
        };
      },
    } as any;
    jest.clearAllMocks();

    const hookRender = hookTestSetup(useAddTableRow, props);

    hook = hookRender.result;
    rerender = hookRender.rerender;
  });

  describe('addTableRow', () => {
    it('should create single value table if no target table', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const expectedDsl =
        'table t1 [f1]=1\r\n\n!layout(4, 4)\ntable Table1\n  [Column1] = 33\r\n';
      rerender({ dsl });

      // Act
      act(() => hook.current.addTableRow(4, 4, 'Table1', '33'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Add table "Table1"`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add new row to overrides', () => {
      // Arrange
      const dsl =
        '!manual()\n!layout(1,1, "title", "headers")\ntable t1\n[f1]=1\noverride\n[f1]\n11\n';
      const expectedDsl =
        '!manual()\n!layout(1,1, "title", "headers")\ntable t1\n[f1]=1\noverride\n[f1]\n11\n33\r\n';
      rerender({ dsl });

      // Act
      act(() => hook.current.addTableRow(1, 4, 't1', '33'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add override "33" to table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('insertTableRowBefore', () => {
    it('should add new row to overrides to field', () => {
      // Arrange
      const dsl =
        '!manual() !layout(1,1, "title", "headers") table t1 [f1]=1\noverride\n[f1]\n11\n';
      const expectedDsl =
        '!manual() !layout(1,1, "title", "headers") table t1 [f1]=1\noverride\n[f1]\n33\n11\r\n';
      rerender({ dsl });

      // Act
      act(() => hook.current.insertTableRowBefore(1, 3, 't1', '33'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add override "33" to table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
    it('should add new row to overrides to single field between existing ones', () => {
      // Arrange
      const dsl =
        '!manual() !layout(1,1, "title", "headers") table t1 [f1]=1\noverride\n[f1]\n11\n22\n';
      const expectedDsl =
        '!manual() !layout(1,1, "title", "headers") table t1 [f1]=1\noverride\n[f1]\n11\n33\n22\r\n';
      rerender({ dsl });

      // Act
      act(() => hook.current.insertTableRowBefore(1, 4, 't1', '33'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add override "33" to table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });
  describe('insertTableRowAfter', () => {
    it('should add new row to overrides to field', () => {
      // Arrange
      const dsl =
        '!manual() !layout(1,1, "title", "headers") table t1 [f1]=1\noverride\n[f1]\n11\n';
      const expectedDsl =
        '!manual() !layout(1,1, "title", "headers") table t1 [f1]=1\noverride\n[f1]\n11\n33\r\n';
      rerender({ dsl });

      // Act
      act(() => hook.current.insertTableRowAfter(1, 3, 't1', '33'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add override "33" to table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
    it('should add new row to overrides to single field between existing ones', () => {
      // Arrange
      const dsl =
        '!manual() !layout(1,1, "title", "headers") table t1 [f1]=1\noverride\n[f1]\n11\n22\n';
      const expectedDsl =
        '!manual() !layout(1,1, "title", "headers") table t1 [f1]=1\noverride\n[f1]\n11\n22\n33\r\n';
      rerender({ dsl });

      // Act
      act(() => hook.current.insertTableRowAfter(1, 4, 't1', '33'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add override "33" to table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });
});
