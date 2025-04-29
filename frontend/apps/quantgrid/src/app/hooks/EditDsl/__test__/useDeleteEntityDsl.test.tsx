import { act, RenderHookResult } from '@testing-library/react';

import { useDeleteEntityDsl } from '../useDeleteEntityDsl';
import { hookTestSetup } from './hookTestSetup';
import { RenderProps, TestWrapperProps } from './types';

const initialProps: TestWrapperProps = {
  appendToFn: jest.fn(),
  manuallyUpdateSheetContent: jest.fn(() => Promise.resolve(true)),
  projectName: 'project1',
  sheetName: 'sheet1',
};

describe('useDeleteEntityDsl', () => {
  let props: TestWrapperProps;
  let hook: RenderHookResult<
    ReturnType<typeof useDeleteEntityDsl>,
    { dsl: string }
  >['result'];
  let rerender: (props?: RenderProps) => void;

  beforeEach(() => {
    props = { ...initialProps };
    jest.clearAllMocks();

    const hookRender = hookTestSetup(useDeleteEntityDsl, props);

    hook = hookRender.result;
    rerender = hookRender.rerender;
  });

  describe('deleteField', () => {
    it('should delete field', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\ntable t2 [f1]=1\n[f2]=2';
      const expectedDsl = 'table t1 [f1]=1\ntable t2 [f1]=1\r\n';
      rerender({ dsl });

      // Act
      act(() => hook.current.deleteField('t2', 'f2'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Delete column [f2] from table "t2"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should delete table when remove last table field', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\ntable t2 [f1]=1 [f2]=2';
      const expectedDsl = 'table t2 [f1]=1 [f2]=2\r\n';
      rerender({ dsl });

      // Act
      act(() => hook.current.deleteField('t1', 'f1'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Delete table "t1"`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should delete field totals with removed field', () => {
      // Arrange
      const dsl =
        'table t1 [f1]=1\n[f2]=2\n[f3]=2\ntotal\n[f1]=SUM(t1[f1])\n[f2]=MIN(t1[f2]\n[f3]=SUM(t1[f3])\ntotal\n[f2]=SUM(t1[f2])';
      const expectedDsl =
        'table t1 [f1]=1\n[f3]=2\ntotal\n[f1]=SUM(t1[f1])\n[f3]=SUM(t1[f3])\r\n';
      rerender({ dsl });

      // Act
      act(() => hook.current.deleteField('t1', 'f2'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Delete column [f2] from table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should delete field override with removed field', () => {
      // Arrange
      const dsl =
        'table t1 [f1]=1\n[f2]=2\n[f3]=2\noverride\nrow,[f1],[f2]\n1,2,2\n2,4,4';
      const expectedDsl =
        'table t1 [f1]=1\n[f3]=2\noverride\nrow,[f1]\n1,2\n2,4\r\n';
      rerender({ dsl });

      // Act
      act(() => hook.current.deleteField('t1', 'f2'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Delete column [f2] from table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should delete override section with removed field', () => {
      // Arrange
      const dsl =
        'table t1 [f1]=1\n[f2]=2\n[f3]=2\noverride\nrow,[f2]\n1,2\n2,4';
      const expectedDsl = 'table t1 [f1]=1\n[f3]=2\r\n';
      rerender({ dsl });

      // Act
      act(() => hook.current.deleteField('t1', 'f2'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Delete column [f2] from table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should delete field sort with removed field', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\n[f2]=2\napply\nsort [f2],[f1]';
      const expectedDsl = 'table t1 [f1]=1\napply\nsort [f1]\r\n';
      rerender({ dsl });

      // Act
      act(() => hook.current.deleteField('t1', 'f2'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Delete column [f2] from table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should delete field filter with removed field', () => {
      // Arrange
      const dsl =
        'table t1 [f1]=1\n[f2]=2\napply\nfilter [f1] = 1 AND [f2] = 2';
      const expectedDsl = 'table t1 [f1]=1\napply\nfilter [f1] = 1\r\n';
      rerender({ dsl });

      // Act
      act(() => hook.current.deleteField('t1', 'f2'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Delete column [f2] from table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });
});
