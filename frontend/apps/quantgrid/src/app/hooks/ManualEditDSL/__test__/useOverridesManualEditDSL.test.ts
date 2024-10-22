import { SheetReader } from '@frontend/parser';
import { act, renderHook } from '@testing-library/react';

import { createWrapper } from '../../../testUtils';
import { useOverridesManualEditDSL } from '../useOverridesManualEditDSL';

const props = {
  appendToFn: jest.fn(),
  updateSheetContent: jest.fn(() => true),
  manuallyUpdateSheetContent: jest.fn(() => true),
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
    it('should remove override from table with keys', async () => {
      // Arrange
      const dsl =
        'table t1 key [f1]=1\r\n [f2]=2\r\noverride\r\nkey [f1],[f2]\r\n2,3\r\n3,4';
      const expectedDsl =
        'table t1 key [f1]=1\r\n [f2]=2\r\noverride\r\nkey [f1],[f2]\r\n2,3\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.removeOverride('t1', 'f2', 1, '4'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Remove override 4 from table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should remove override from table without keys', async () => {
      // Arrange
      const dsl =
        'table t1 [f1]=1\r\n [f2]=2\r\noverride\r\nrow,[f2]\r\n1,3\r\n2,4';
      const expectedDsl =
        'table t1 [f1]=1\r\n [f2]=2\r\noverride\r\nrow,[f2]\r\n2,4\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.removeOverride('t1', 'f2', 1, '4'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Remove override 4 from table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should remove override from pivot table when value is in center of table', async () => {
      // Arrange
      const dsl = `
        table t1\r\ndim [f1]=RANGE(5)\r\n[*] = PIVOT(RANGE(10), TEXT($), COUNT($))\r\noverride\r\n[5],row\r\n4,3\r\n5,4\r\n`;
      const expectedDsl = `
        table t1\r\ndim [f1]=RANGE(5)\r\n[*] = PIVOT(RANGE(10), TEXT($), COUNT($))\r\noverride\r\n[5],row\r\n4,3\r\n`;
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.removeOverride('t1', '5', 4, '4'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Remove override 4 from table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should remove override from manual table', async () => {
      // Arrange
      const dsl =
        '!manual table t1 [f1]=1\r\n [f2]=2\r\noverride\r\n[f2]\r\n1\r\n2';
      const expectedDsl =
        '!manual table t1 [f1]=1\r\n [f2]=2\r\noverride\r\n[f2]\r\n1\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.removeOverride('t1', 'f2', 1, '2'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Remove override 2 from table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should remove last override', async () => {
      // Arrange
      const dsl =
        'table t1 key [f1]=1\r\n [f2]=2\r\noverride\r\nkey [f1],[f2]\r\n2,3\r\n';
      const expectedDsl = 'table t1 key [f1]=1\r\n [f2]=2\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.removeOverride('t1', 'f2', 0, '3'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Remove override 3 from table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should do nothing if try to remove override from table without overrides', async () => {
      // Arrange
      const dsl = 'table t1 key [f1]=1\r\n [f2]=2';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.removeOverride('t1', 'f2', 1, '4'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).not.toHaveBeenCalled();
      expect(props.manuallyUpdateSheetContent).not.toHaveBeenCalled();
    });

    it('should remove table when remove last override in manual table', async () => {
      // Arrange
      const dsl = '!manual()\r\ntable t1 [f1]=1\r\noverride\r\n[f1]\r\n3\r\n';
      const expectedDsl = '\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.removeOverride('t1', 'f1', 0, '3'));
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
  });

  describe('editOverride', () => {
    it('should edit override in table with keys', async () => {
      // Arrange
      const dsl =
        'table t1 key [f1]=1\r\n [f2]=2\r\noverride\r\nkey [f1],[f2]\r\n2,3\r\n3,4';
      const expectedDsl =
        'table t1 key [f1]=1\r\n [f2]=2\r\noverride\r\nkey [f1],[f2]\r\n2,3\r\n3,555\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.editOverride('t1', 'f2', 1, '555'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Edit override 555 in table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should edit override in table without keys', async () => {
      // Arrange
      const dsl =
        'table t1 [f1]=1\r\n [f2]=2\r\noverride\r\nrow,[f2]\r\n1,3\r\n2,4';
      const expectedDsl =
        'table t1 [f1]=1\r\n [f2]=2\r\noverride\r\nrow,[f2]\r\n1,3\r\n2,555\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.editOverride('t1', 'f2', 2, '555'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Edit override 555 in table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should edit override in manual table', async () => {
      // Arrange
      const dsl =
        '!manual table t1 [f1]=1\r\n [f2]=2\r\noverride\r\n[f2]\r\n1\r\n2';
      const expectedDsl =
        '!manual table t1 [f1]=1\r\n [f2]=2\r\noverride\r\n[f2]\r\n1\r\n555\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.editOverride('t1', 'f2', 1, '555'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Edit override 555 in table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should do nothing if table has no overrides', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\r\n [f2]=2';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.editOverride('t1', 'f2', 1, '555'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).not.toHaveBeenCalled();
      expect(props.manuallyUpdateSheetContent).not.toHaveBeenCalled();
    });
  });

  describe('addOverride', () => {
    it('should add override to table without keys', async () => {
      // Arrange
      const dsl =
        'table t1 [f1]=1\r\n [f2]=2\r\noverride\r\nrow,[f2]\r\n1,3\r\n';
      const expectedDsl =
        'table t1 [f1]=1\r\n [f2]=2\r\noverride\r\nrow,[f2]\r\n1,3\r\n2,111\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.addOverride(2, 4, 't1', '111'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add override "111" to table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should add override to manual table', async () => {
      // Arrange
      const dsl =
        '!manual table t1 [f1]=1\r\n [f2]=2\r\noverride\r\n[f2]\r\n1\r\n2\r\n';
      const expectedDsl =
        '!manual table t1 [f1]=1\r\n [f2]=2\r\noverride\r\n[f2]\r\n1\r\n2\r\n111\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.addOverride(2, 5, 't1', '111'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add override "111" to table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });
});
