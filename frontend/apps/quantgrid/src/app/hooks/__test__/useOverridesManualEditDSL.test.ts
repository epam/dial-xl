import { SheetReader } from '@frontend/parser';
import { act, renderHook } from '@testing-library/react';

import { createWrapper } from '../../testUtils';
import { useOverridesManualEditDSL } from '../useOverridesManualEditDSL';

const props = {
  appendFn: jest.fn(),
  updateSheetContent: jest.fn(),
  manuallyUpdateSheetContent: jest.fn(),
  projectName: 'project1',
  sheetName: 'sheet1',
};

export function getWrapper(dsl: string, props: any) {
  return createWrapper({
    ...props,
    sheetContent: dsl,
    parsedSheet: SheetReader.parseSheet(dsl),
  });
}

export function getRenderedHook(dsl: string, props: any) {
  const { result } = renderHook(() => useOverridesManualEditDSL(), {
    wrapper: getWrapper(dsl, props),
  });

  return result.current;
}

describe('useOverridesManualEditDSL', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('removeOverride', () => {
    it('should remove override from table with keys', () => {
      // Arrange
      const dsl =
        'table t1 key [f1]=1 [f2]=2\r\noverride\r\nkey [f1],[f2]\r\n2,3\r\n3,4';
      const expectedDsl =
        'table t1 key [f1]=1 [f2]=2\r\noverride\r\nkey [f1],[f2]\r\n2,3\r\n\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.removeOverride('t1', 'f2', 1, '4'));

      // Assert
      expect(props.appendFn).toBeCalledWith(
        `Remove override 4 from table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should remove override from table without keys', () => {
      // Arrange
      const dsl =
        'table t1 [f1]=1 [f2]=2\r\noverride\r\nrow,[f2]\r\n1,3\r\n2,4';
      const expectedDsl =
        'table t1 [f1]=1 [f2]=2\r\noverride\r\nrow,[f2]\r\n1,3\r\n\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.removeOverride('t1', 'f2', 1, '4'));

      // Assert
      expect(props.appendFn).toBeCalledWith(
        `Remove override 4 from table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should remove override from manual table', () => {
      // Arrange
      const dsl =
        '!manual table t1 [f1]=1 [f2]=2\r\noverride\r\n[f2]\r\n1\r\n2';
      const expectedDsl =
        '!manual table t1 [f1]=1 [f2]=2\r\noverride\r\n[f2]\r\n1\r\n\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.removeOverride('t1', 'f2', 1, '2'));

      // Assert
      expect(props.appendFn).toBeCalledWith(
        `Remove override 2 from table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should remove last override', () => {
      // Arrange
      const dsl =
        'table t1 key [f1]=1 [f2]=2\r\noverride\r\nkey [f1],[f2]\r\n2,3\r\n';
      const expectedDsl = 'table t1 key [f1]=1 [f2]=2\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.removeOverride('t1', 'f2', 0, '3'));

      // Assert
      expect(props.appendFn).toBeCalledWith(
        `Remove override 3 from table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should do nothing if try to remove override from table without overrides', () => {
      // Arrange
      const dsl = 'table t1 key [f1]=1 [f2]=2';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.removeOverride('t1', 'f2', 1, '4'));

      // Assert
      expect(props.appendFn).not.toBeCalled();
      expect(props.manuallyUpdateSheetContent).not.toBeCalled();
    });
  });

  describe('editOverride', () => {
    it('should edit override in table with keys', () => {
      // Arrange
      const dsl =
        'table t1 key [f1]=1 [f2]=2\r\noverride\r\nkey [f1],[f2]\r\n2,3\r\n3,4';
      const expectedDsl =
        'table t1 key [f1]=1 [f2]=2\r\noverride\r\nkey [f1],[f2]\r\n2,3\r\n3,555\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.editOverride('t1', 'f2', 1, '555'));

      // Assert
      expect(props.appendFn).toBeCalledWith(
        `Edit override 555 in table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should edit override in table without keys', () => {
      // Arrange
      const dsl =
        'table t1 [f1]=1 [f2]=2\r\noverride\r\nrow,[f2]\r\n1,3\r\n2,4';
      const expectedDsl =
        'table t1 [f1]=1 [f2]=2\r\noverride\r\nrow,[f2]\r\n1,3\r\n2,555\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.editOverride('t1', 'f2', 1, '555'));

      // Assert
      expect(props.appendFn).toBeCalledWith(
        `Edit override 555 in table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should edit override in manual table', () => {
      // Arrange
      const dsl =
        '!manual table t1 [f1]=1 [f2]=2\r\noverride\r\n[f2]\r\n1\r\n2';
      const expectedDsl =
        '!manual table t1 [f1]=1 [f2]=2\r\noverride\r\n[f2]\r\n1\r\n555\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.editOverride('t1', 'f2', 1, '555'));

      // Assert
      expect(props.appendFn).toBeCalledWith(
        `Edit override 555 in table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should do nothing if table has no overrides', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.editOverride('t1', 'f2', 1, '555'));

      // Assert
      expect(props.appendFn).not.toBeCalled();
      expect(props.manuallyUpdateSheetContent).not.toBeCalled();
    });
  });

  describe('addOverride', () => {
    it('should add override to table without keys', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2\r\noverride\r\nrow,[f2]\r\n1,3\r\n';
      const expectedDsl =
        'table t1 [f1]=1 [f2]=2\r\noverride\r\nrow,[f2]\r\n1,3\r\n2,111\r\n\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.addOverride('t1', 'f2', 1, '111'));

      // Assert
      expect(props.appendFn).toBeCalledWith(
        `Add override 111 to table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should add override to manual table', () => {
      // Arrange
      const dsl =
        '!manual table t1 [f1]=1 [f2]=2\r\noverride\r\n[f2]\r\n1\r\n2\r\n';
      const expectedDsl =
        '!manual table t1 [f1]=1 [f2]=2\r\noverride\r\n[f2]\r\n1\r\n2\r\n111\r\n\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.addOverride('t1', 'f2', 3, '111'));

      // Assert
      expect(props.appendFn).toBeCalledWith(
        `Add override 111 to table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });
});
