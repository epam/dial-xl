import { act, renderHook } from '@testing-library/react';

import { useTotalManualEditDSL } from '../useTotalManualEditDSL';
import { getWrapper } from './utils';

const props = {
  appendToFn: jest.fn(),
  updateSheetContent: jest.fn(),
  manuallyUpdateSheetContent: jest.fn(),
  projectName: 'project1',
  sheetName: 'sheet1',
};

export function getRenderedHook(dsl: string, props: any) {
  const { result } = renderHook(() => useTotalManualEditDSL(), {
    wrapper: getWrapper(dsl, props),
  });

  return result.current;
}

describe('useTotalManualEditDSL', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('removeTotalByType', () => {
    it('should remove single field total of particular type', () => {
      // Arrange
      const dsl =
        'table t1 [f1]=1 [f2]=2\r\ntotal\r\n[f1] = SUM(t1[f1])\r\n[f2] = AVERAGE(t1[f2])\r\ntotal\r\n[f1] = MODE(t1[f1])\r\n[f2] = MAX(t1[f2])\r\n';
      const expectedDsl =
        'table t1 [f1]=1 [f2]=2\r\ntotal\r\n[f2] = AVERAGE(t1[f2])\r\ntotal\r\n[f1] = MODE(t1[f1])\r\n[f2] = MAX(t1[f2])\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.removeTotalByType('t1', 'f1', 'sum'));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should remove all field totals of particular type', () => {
      // Arrange
      const dsl =
        'table t1 [f1]=1 [f2]=2\r\ntotal\r\n[f1] = SUM(t1[f1])\r\n[f2] = AVERAGE(t1[f2])\r\ntotal\r\n[f1] = SUM(t1[f1])\r\n[f2] = MAX(t1[f2])\r\n';
      const expectedDsl =
        'table t1 [f1]=1 [f2]=2\r\ntotal\r\n[f2] = AVERAGE(t1[f2])\r\ntotal\r\n[f2] = MAX(t1[f2])\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.removeTotalByType('t1', 'f1', 'sum'));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should remove entire total section when remove last total', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\r\ntotal\r\n[f1] = SUM(t1[f1])\r\n';
      const expectedDsl = 'table t1 [f1]=1\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.removeTotalByType('t1', 'f1', 'sum'));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });

  describe('removeTotalByIndex', () => {
    it('should remove particular field total', () => {
      // Arrange
      const dsl =
        'table t1 [f1]=1 [f2]=2\r\ntotal\r\n[f1] = SUM(t1[f1])\r\n[f2] = AVERAGE(t1[f2])\r\ntotal\r\n[f1] = SUM(t1[f1])\r\n[f2] = MAX(t1[f2])\r\n';
      const expectedDsl =
        'table t1 [f1]=1 [f2]=2\r\ntotal\r\n[f1] = SUM(t1[f1])\r\n[f2] = AVERAGE(t1[f2])\r\ntotal\r\n[f2] = MAX(t1[f2])\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.removeTotalByIndex('t1', 'f1', 2));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should remove entire total if remove last field total', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\r\ntotal\r\n[f1] = SUM(t1[f1])\r\n';
      const expectedDsl = 'table t1 [f1]=1\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.removeTotalByIndex('t1', 'f1', 1));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });

  describe('toggleTotalByType', () => {
    it('should add new field total', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const expectedDsl = 'table t1 [f1]=1\r\ntotal\r\n[f1] = SUM(t1[f1])\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.toggleTotalByType('t1', 'f1', 'sum'));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should add new field total to the existing total row', () => {
      // Arrange
      const dsl =
        'table t1 [f1]=1\r\n[f2]=2\r\ntotal\r\n[f1] = SUM(t1[f1])\r\n[f2] = AVERAGE(t1[f2])\r\ntotal\r\n[f2] = MAX(t1[f2])\r\n';
      const expectedDsl =
        'table t1 [f1]=1\r\n[f2]=2\r\ntotal\r\n[f1] = SUM(t1[f1])\r\n[f2] = AVERAGE(t1[f2])\r\ntotal\r\n[f2] = MAX(t1[f2])\r\n[f1] = MODE(t1[f1])\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.toggleTotalByType('t1', 'f1', 'mode'));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should add new total row with a new total', () => {
      // Arrange
      const dsl =
        'table t1 [f1]=1\r\n[f2]=2\r\ntotal\r\n[f1] = SUM(t1[f1])\r\n[f2] = AVERAGE(t1[f2])\r\ntotal\r\n[f2] = MAX(t1[f2])\r\n[f1] = MODE(t1[f1])\r\n';
      const expectedDsl =
        'table t1 [f1]=1\r\n[f2]=2\r\ntotal\r\n[f1] = SUM(t1[f1])\r\n[f2] = AVERAGE(t1[f2])\r\ntotal\r\n[f2] = MAX(t1[f2])\r\n[f1] = MODE(t1[f1])\r\ntotal\r\n[f2] = MIN(t1[f2])\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.toggleTotalByType('t1', 'f2', 'min'));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should add another custom total', () => {
      // Arrange
      const dsl =
        'table t1 [f1]=1\r\n[f2]=2\r\ntotal\r\n[f1] = SUM(t1[f1])\r\n[f2] = SUM(t1[f2]) + 1\r\ntotal\r\n[f2] = MAX(t1[f2])\r\n[f1] = MODE(t1[f1])\r\n';
      const expectedDsl =
        'table t1 [f1]=1\r\n[f2]=2\r\ntotal\r\n[f1] = SUM(t1[f1])\r\n[f2] = SUM(t1[f2]) + 1\r\ntotal\r\n[f2] = MAX(t1[f2])\r\n[f1] = MODE(t1[f1])\r\ntotal\r\n[f2] = NA\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.toggleTotalByType('t1', 'f2', 'custom'));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });

  describe('addTotalExpression', () => {
    it('should add field total in the given row', () => {
      // Arrange
      const dsl =
        'table t1 [f1]=1\r\n[f2]=2\r\ntotal\r\n[f1] = SUM(t1[f1])\r\n[f2] = AVERAGE(t1[f2])\r\ntotal\r\n[f1] = MODE(t1[f1])\r\n';
      const expectedDsl =
        'table t1 [f1]=1\r\n[f2]=2\r\ntotal\r\n[f1] = SUM(t1[f1])\r\n[f2] = AVERAGE(t1[f2])\r\ntotal\r\n[f1] = MODE(t1[f1])\r\n[f2] = SUM(t1[f2])\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.addTotalExpression('t1', 'f2', 2, 'SUM(t1[f2])'));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });

  describe('editTotalExpression', () => {
    it('should edit field total in the given row', () => {
      // Arrange
      const dsl =
        'table t1 [f1]=1\r\n[f2]=2\r\ntotal\r\n[f1] = SUM(t1[f1])\r\n[f2] = AVERAGE(t1[f2])\r\ntotal\r\n[f1] = MODE(t1[f1])\r\n[f2] = SUM(t1[f2])\r\n';
      const expectedDsl =
        'table t1 [f1]=1\r\n[f2]=2\r\ntotal\r\n[f1] = SUM(t1[f1])\r\n[f2] = AVERAGE(t1[f2])\r\ntotal\r\n[f1] = MODE(t1[f1])\r\n[f2] = MAX(t1[f2])\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.editTotalExpression('t1', 'f2', 2, 'MAX(t1[f2])'));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });
});
