import { act, RenderHookResult } from '@testing-library/react';

import { useOverridesEditDsl } from '../useOverridesEditDsl';
import { hookTestSetup } from './hookTestSetup';
import { RenderProps, TestWrapperProps } from './types';

const initialProps: TestWrapperProps = {
  appendToFn: jest.fn(),
  manuallyUpdateSheetContent: jest.fn(() => Promise.resolve(true)),
  projectName: 'project1',
  sheetName: 'sheet1',
};

describe('useOverridesEditDsl', () => {
  let props: TestWrapperProps;
  let hook: RenderHookResult<
    ReturnType<typeof useOverridesEditDsl>,
    { dsl: string }
  >['result'];
  let rerender: (props?: RenderProps) => void;

  beforeEach(() => {
    props = { ...initialProps };
    jest.clearAllMocks();

    const hookRender = hookTestSetup(useOverridesEditDsl, props);

    hook = hookRender.result;
    rerender = hookRender.rerender;
  });

  describe('removeOverride', () => {
    it('should remove override from table with keys', async () => {
      // Arrange
      const dsl = 'table t1 key [f1]=1\n [f2]=2\noverride\n[f1],[f2]\n2,3\n3,4';
      const expectedDsl =
        'table t1 key [f1]=1\n [f2]=2\noverride\n[f1],[f2]\n2,3\r\n';
      rerender({ dsl });

      // Act
      act(() => hook.current.removeOverride('t1', 'f2', 1, '4'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Remove override 4 from table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should remove override from table without keys', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\n [f2]=2\noverride\nrow,[f2]\n1,3\n2,4';
      const expectedDsl =
        'table t1 [f1]=1\n [f2]=2\noverride\nrow,[f2]\n2,4\r\n';
      rerender({ dsl });

      // Act
      act(() => hook.current.removeOverride('t1', 'f2', 1, '4'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Remove override 4 from table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should remove override from pivot table when value is in center of table', async () => {
      // Arrange
      const dsl = `
        table t1\ndim [f1]=RANGE(5)\n[*] = PIVOT(RANGE(10), TEXT($), COUNT($))\noverride\nrow,[5]\n3,4\n4,5\n`;
      const expectedDsl = `
        table t1\ndim [f1]=RANGE(5)\n[*] = PIVOT(RANGE(10), TEXT($), COUNT($))\noverride\nrow,[5]\n3,4\r\n`;
      rerender({ dsl });

      // Act
      act(() => hook.current.removeOverride('t1', '5', 4, '4'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Remove override 4 from table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should remove override from manual table', async () => {
      // Arrange
      const dsl = '!manual table t1 [f1]=1\n [f2]=2\noverride\n[f2]\n1\n2';
      const expectedDsl =
        '!manual table t1 [f1]=1\n [f2]=2\noverride\n[f2]\n1\r\n';
      rerender({ dsl });

      // Act
      act(() => hook.current.removeOverride('t1', 'f2', 1, '2'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Remove override 2 from table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should remove last override', async () => {
      // Arrange
      const dsl = 'table t1 key [f1]=1\n [f2]=2\noverride\n[f1],[f2]\n2,3\n';
      const expectedDsl = 'table t1 key [f1]=1\n [f2]=2\r\n';
      rerender({ dsl });

      // Act
      act(() => hook.current.removeOverride('t1', 'f2', 0, '3'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Remove override 3 from table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should do nothing if try to remove override from table without overrides', async () => {
      // Arrange
      const dsl = 'table t1 key [f1]=1\n [f2]=2';
      rerender({ dsl });

      // Act
      act(() => hook.current.removeOverride('t1', 'f2', 1, '4'));

      // Assert
      expect(props.appendToFn).not.toHaveBeenCalled();
      expect(props.manuallyUpdateSheetContent).not.toHaveBeenCalled();
    });

    it('should remove table when remove last override in manual table', async () => {
      // Arrange
      const dsl = '!manual()\ntable t1 [f1]=1\noverride\n[f1]\n3\n';
      const expectedDsl = '\r\n';
      rerender({ dsl });

      // Act
      act(() => hook.current.removeOverride('t1', 'f1', 0, '3'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Delete table "t1"`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('removeOverrideRow', () => {
    it('should remove second override row', () => {
      // Arrange
      const dsl =
        '!manual()\ntable t1\n[a]\n[b]\noverride\n[a],[b]\n1,1\n2,2\n3,3\n';
      const expectedDsl =
        '!manual()\ntable t1\n[a]\n[b]\noverride\n[a],[b]\n1,1\n3,3\r\n';
      rerender({ dsl });

      // Act
      act(() => hook.current.removeOverrideRow('t1', 1));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Remove override row from "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('removeTableOrOverrideRow', () => {
    it('should delete one override row', () => {
      // Arrange
      const dsl = '!manual()\ntable t1 [f1]=1\noverride\n[f1]\n1\n2\n3\n';
      const expectedDsl =
        '!manual()\ntable t1 [f1]=1\noverride\n[f1]\n1\n2\r\n';
      rerender({ dsl });

      // Act
      act(() => hook.current.removeTableOrOverrideRow('t1', 2));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Remove override row from "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should remove entire table', () => {
      // Arrange
      const dsl = '!manual()\ntable t1 [f1]=1\noverride\n[f1]\n1';
      const expectedDsl = '\r\n';
      rerender({ dsl });

      // Act
      act(() => hook.current.removeTableOrOverrideRow('t1', 0));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Delete table "t1"`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('editOverride', () => {
    it('should edit override in table with keys', () => {
      // Arrange
      const dsl = 'table t1 key [f1]=1\n [f2]=2\noverride\n[f1],[f2]\n2,3\n3,4';
      const expectedDsl =
        'table t1 key [f1]=1\n [f2]=2\noverride\n[f1],[f2]\n2,3\n3,555\r\n';
      rerender({ dsl });

      // Act
      act(() => hook.current.editOverride('t1', 'f2', 1, '555'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Edit override 555 in table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should edit override in table without keys', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\n [f2]=2\noverride\nrow,[f2]\n1,3\n2,4';
      const expectedDsl =
        'table t1 [f1]=1\n [f2]=2\noverride\nrow,[f2]\n1,3\n2,555\r\n';
      rerender({ dsl });

      // Act
      act(() => hook.current.editOverride('t1', 'f2', 2, '555'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Edit override 555 in table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should edit override in manual table', () => {
      // Arrange
      const dsl = '!manual table t1 [f1]=1\n [f2]=2\noverride\n[f2]\n1\n2';
      const expectedDsl =
        '!manual table t1 [f1]=1\n [f2]=2\noverride\n[f2]\n1\n555\r\n';
      rerender({ dsl });

      // Act
      act(() => hook.current.editOverride('t1', 'f2', 1, '555'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Edit override 555 in table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should do nothing if table has no overrides', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\n [f2]=2';
      rerender({ dsl });

      // Act
      act(() => hook.current.editOverride('t1', 'f2', 1, '555'));

      // Assert
      expect(props.appendToFn).not.toHaveBeenCalled();
      expect(props.manuallyUpdateSheetContent).not.toHaveBeenCalled();
    });
  });

  describe('addOverride', () => {
    it('should add override to table without keys', () => {
      // Arrange
      const dsl =
        '!layout(1, 1, "title", "headers") table t1 [f1]=1\n [f2]=2\noverride\nrow,[f2]\n1,3\n';
      const expectedDsl =
        '!layout(1, 1, "title", "headers") table t1 [f1]=1\n [f2]=2\noverride\nrow,[f2]\n1,3\n2,111\r\n';
      rerender({ dsl });

      // Act
      act(() => hook.current.addOverride(2, 4, 't1', '111'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add override "111" to table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add override to manual table', () => {
      // Arrange
      const dsl = '!manual table t1 [f1]=1\n [f2]=2\noverride\n[f2]\n1\n2\n';
      const expectedDsl =
        '!manual table t1 [f1]=1\n [f2]=2\noverride\n[f2]\n1\n2\n111\r\n';
      rerender({ dsl });

      // Act
      act(() => hook.current.addOverride(2, 5, 't1', '111'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add override "111" to table "t1"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });
});
