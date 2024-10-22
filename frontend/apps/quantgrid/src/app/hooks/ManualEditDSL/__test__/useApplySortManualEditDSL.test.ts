import { act, renderHook } from '@testing-library/react';

import { useApplySortManualEditDSL } from '../useApplySortManualEditDSL';
import { getWrapper } from './utils';

const props = {
  appendToFn: jest.fn(),
  updateSheetContent: jest.fn(),
  manuallyUpdateSheetContent: jest.fn(),
  projectName: 'project1',
  sheetName: 'sheet1',
};

export function getRenderedHook(dsl: string, props: any) {
  const { result } = renderHook(() => useApplySortManualEditDSL(), {
    wrapper: getWrapper(dsl, props),
  });

  return result.current;
}

describe('useApplySortManualEditDSL', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('changeFieldSort', () => {
    it('should add apply and sort block', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2';
      const expectedDsl = 'table t1 [f1]=1 [f2]=2\r\napply\r\nsort [f1]\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.changeFieldSort('t1', 'f1', 'asc'));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should add sort block', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2\r\napply\r\nsort [f2]';
      const expectedDsl =
        'table t1 [f1]=1 [f2]=2\r\napply\r\nsort [f2],[f1]\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.changeFieldSort('t1', 'f1', 'asc'));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should change sort block', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2\r\napply\r\nsort [f1]';
      const expectedDsl = 'table t1 [f1]=1 [f2]=2\r\napply\r\nsort -[f1]\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.changeFieldSort('t1', 'f1', 'desc'));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should clear sort', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2\r\napply\r\nsort [f1]';
      const expectedDsl = 'table t1 [f1]=1 [f2]=2\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.changeFieldSort('t1', 'f1', null));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });
});
