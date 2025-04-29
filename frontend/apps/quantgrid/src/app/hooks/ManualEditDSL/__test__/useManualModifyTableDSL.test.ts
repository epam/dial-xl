import { act, renderHook } from '@testing-library/react';

import { useManualModifyTableDSL } from '../useManualModifyTableDSL';
import { getWrapper } from './utils';

const props = {
  appendFn: jest.fn(),
  appendToFn: jest.fn(),
  updateSheetContent: jest.fn(() => true),
  manuallyUpdateSheetContent: jest.fn(() => true),
  projectName: 'project1',
  sheetName: 'sheet1',
  projectSheets: [],
};

function getRenderedHook(dsl: string, props: any) {
  const { result } = renderHook(() => useManualModifyTableDSL(), {
    wrapper: getWrapper(dsl, props),
  });

  return result.current;
}

describe('useManualModifyTableDSL', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    props.projectSheets = [];
  });

  describe('autoCleanUpTableDSL', () => {
    it('should not modify table if at least one field is dim', async () => {
      // Arrange
      const dsl = 'table t1 dim [f1] = RANGE(5)  [f2] = [f1] ^ 2';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.autoCleanUpTableDSL('t1'));

      // Assert
      expect(props.appendToFn).not.toHaveBeenCalled();
      expect(props.manuallyUpdateSheetContent).not.toHaveBeenCalled();
    });

    it('should not remove any field', async () => {
      // Arrange
      const dsl =
        '!layout(1, 1, "title")\r\ntable t1\r\n[f1] = 1\r\n[f2] = 2\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.autoCleanUpTableDSL('t1'));

      // Assert
      expect(props.appendToFn).not.toHaveBeenCalled();
      expect(props.manuallyUpdateSheetContent).not.toHaveBeenCalled();
    });

    it('should remove single rightmost empty field', async () => {
      // Arrange
      const dsl = '!layout(1, 1, "title")\r\ntable t1\r\n[f1] = 1\r\n[f2]\r\n';
      const expectedDsl = '!layout(1, 1, "title")\r\ntable t1\r\n[f1] = 1\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.autoCleanUpTableDSL('t1'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Clean up table "t1"`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should remove multiple rightmost empty fields', async () => {
      // Arrange
      const dsl =
        '!layout(1, 1, "title")\r\ntable t1\r\n[f1] = 1\r\n[f2]\r\n[f3]\r\n[f4]\r\n';
      const expectedDsl = '!layout(1, 1, "title")\r\ntable t1\r\n[f1] = 1\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.autoCleanUpTableDSL('t1'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Clean up table "t1"`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should remove single rightmost empty field and field override key from table with overrides', async () => {
      // Arrange
      const dsl =
        '!layout(1, 1, "title")\r\ntable t1\r\n[f1] = 1\r\n[f2]\r\noverride\r\nrow,[f1],[f2]\r\n1,321,\r\n';
      const expectedDsl =
        '!layout(1, 1, "title")\r\ntable t1\r\n[f1] = 1\r\noverride\r\nrow,[f1]\r\n1,321\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.autoCleanUpTableDSL('t1'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Clean up table "t1"`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should remove multiple rightmost empty fields and their override keys from table with overrides', async () => {
      // Arrange
      const dsl =
        '!layout(1, 1, "title")\r\ntable t1\r\n[f1] = 1\r\n[f2]\r\n[f3]\r\n[f4]\r\noverride\r\nrow,[f1],[f2],[f3],[f4]\r\n1,321,,,\r\n';
      const expectedDsl =
        '!layout(1, 1, "title")\r\ntable t1\r\n[f1] = 1\r\noverride\r\nrow,[f1]\r\n1,321\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.autoCleanUpTableDSL('t1'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Clean up table "t1"`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should remove single empty override row', async () => {
      // Arrange
      const dsl =
        '!manual()\r\n!layout(1, 1)\r\ntable t1\r\n[f1]\r\n[f2]\r\noverride\r\n[f1],[f2]\r\n1,2\r\n3,4\r\n,\r\n';
      const expectedDsl =
        '!manual()\r\n!layout(1, 1)\r\ntable t1\r\n[f1]\r\n[f2]\r\noverride\r\n[f1],[f2]\r\n1,2\r\n3,4\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.autoCleanUpTableDSL('t1'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Clean up table "t1"`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should remove multiple empty override rows', async () => {
      // Arrange
      const dsl =
        '!manual()\r\n!layout(1, 1)\r\ntable t1\r\n[f1]\r\n[f2]\r\noverride\r\n[f1],[f2]\r\n1,2\r\n3,4\r\n,\r\n,\r\n,\r\n';
      const expectedDsl =
        '!manual()\r\n!layout(1, 1)\r\ntable t1\r\n[f1]\r\n[f2]\r\noverride\r\n[f1],[f2]\r\n1,2\r\n3,4\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.autoCleanUpTableDSL('t1'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Clean up table "t1"`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should remove overrides section and convert last override row to field formulas', async () => {
      // Arrange
      const dsl =
        '!layout(1, 1)\r\n!manual()\r\ntable t1\r\n[f1]\r\n[f2]\r\noverride\r\n[f1],[f2]\r\n1,2\r\n,\r\n,\r\n,\r\n';
      const expectedDsl = '!layout(1, 1)\r\ntable t1\r\n[f1] = 1\n[f2] = 2\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.autoCleanUpTableDSL('t1'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Clean up table "t1"`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should remove overrides section and convert to regular table without changing field formulas', async () => {
      // Arrange
      const dsl =
        '!layout(1, 1)\r\n!manual()\r\ntable t1\r\n[f1]=1\r\n[f2]=2\r\noverride\r\n[f1],[f2]\r\n,\r\n,\r\n,\r\n';
      const expectedDsl = '!layout(1, 1)\r\ntable t1\r\n[f1]=1\r\n[f2]=2\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.autoCleanUpTableDSL('t1'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Clean up table "t1"`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should remove entire table if remove all fields after clean up', async () => {
      // Arrange
      const dsl =
        '!manual()\r\n!layout(1, 1)\r\ntable t1\r\n[f1]\r\n[f2]\r\noverride\r\n[f1],[f2]\r\n,\r\n,\r\n,\r\n';
      const expectedDsl = '\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.autoCleanUpTableDSL('t1'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Clean up table "t1"`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should not modify table', async () => {
      // Arrange
      const dsl =
        '!manual()\r\n!layout(1, 1)\r\ntable t1\r\n[f1]\r\n[f2]\r\noverride\r\n[f1],[f2]\r\n1,2\r\n3,4\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.autoCleanUpTableDSL('t1'));

      // Assert
      expect(props.appendToFn).not.toHaveBeenCalled();
      expect(props.manuallyUpdateSheetContent).not.toHaveBeenCalled();
    });
  });
});
