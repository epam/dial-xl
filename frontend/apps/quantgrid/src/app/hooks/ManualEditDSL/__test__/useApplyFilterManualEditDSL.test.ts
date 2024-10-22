import { act, renderHook } from '@testing-library/react';

import { useApplyFilterManualEditDSL } from '../useApplyFilterManualEditDSL';
import { getWrapper } from './utils';

const props = {
  appendToFn: jest.fn(),
  updateSheetContent: jest.fn(),
  manuallyUpdateSheetContent: jest.fn(),
  projectName: 'project1',
  sheetName: 'sheet1',
};

export function getRenderedHook(dsl: string, props: any) {
  const { result } = renderHook(() => useApplyFilterManualEditDSL(), {
    wrapper: getWrapper(dsl, props),
  });

  return result.current;
}

describe('useApplyFilterManualEditDSL', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('applyNumberFilter', () => {
    it('should add apply and numeric filter block', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2';
      const expectedDsl =
        'table t1 [f1]=1 [f2]=2\r\napply\r\nfilter [f1] > 1\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.applyNumberFilter('t1', 'f1', '>', 1));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should change single numeric filter block', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2\r\napply\r\nfilter [f1] > 1';
      const expectedDsl =
        'table t1 [f1]=1 [f2]=2\r\napply\r\nfilter [f1] >= 2\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.applyNumberFilter('t1', 'f1', '>=', 2));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should add numeric filter to existing one', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2\r\napply\r\nfilter [f1] >= 2';
      const expectedDsl =
        'table t1 [f1]=1 [f2]=2\r\napply\r\nfilter [f1] >= 2 AND [f2] > 1\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.applyNumberFilter('t1', 'f2', '>', 1));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should clear numeric filter', () => {
      // Arrange
      const dsl =
        'table t1 [f1]=1 [f2]=2\r\napply\r\nfilter [f1] > 1 AND [f2] > 1';
      const expectedDsl =
        'table t1 [f1]=1 [f2]=2\r\napply\r\nfilter [f1] > 1\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.applyNumberFilter('t1', 'f2', '', null));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should add numeric filter to existing text filter', () => {
      // Arrange
      const dsl = 'table t1 [f1]=TEXT(1) [f2]=2\r\napply\r\nfilter [f1] = "1"';
      const expectedDsl =
        'table t1 [f1]=TEXT(1) [f2]=2\r\napply\r\nfilter [f1] = "1" AND [f2] > 1\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.applyNumberFilter('t1', 'f2', '>', 1));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });

  describe('applyTextFilter', () => {
    it('should add apply text filter block', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2';
      const expectedDsl =
        'table t1 [f1]=1 [f2]=2\r\napply\r\nfilter [f1] = "1"\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.applyListFilter('t1', 'f1', ['1'], false));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should change text filter block', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2\r\napply\r\nfilter [f1] = "1"';
      const expectedDsl =
        'table t1 [f1]=1 [f2]=2\r\napply\r\nfilter [f1] = "1" OR [f1] = "2"\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.applyListFilter('t1', 'f1', ['1', '2'], false));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should clear text filter', () => {
      // Arrange
      const dsl =
        'table t1 [f1]=1 [f2]=2\r\napply\r\nfilter [f1] = "1" OR [f1] = "2"';
      const expectedDsl = 'table t1 [f1]=1 [f2]=2\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.applyListFilter('t1', 'f1', [], false));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });
});
