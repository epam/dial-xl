import { act, RenderHookResult } from '@testing-library/react';

import { useSortEditDsl } from '../useSortEditDsl';
import { hookTestSetup } from './hookTestSetup';
import { RenderProps, TestWrapperProps } from './types';

const initialProps: TestWrapperProps = {
  appendToFn: jest.fn(),
  manuallyUpdateSheetContent: jest.fn(() => Promise.resolve(true)),
  projectName: 'project1',
  sheetName: 'sheet1',
};

describe('useSortEditDsl', () => {
  let props: TestWrapperProps;
  let hook: RenderHookResult<
    ReturnType<typeof useSortEditDsl>,
    { dsl: string }
  >['result'];
  let rerender: (props?: RenderProps) => void;

  beforeEach(() => {
    props = { ...initialProps };
    jest.clearAllMocks();

    const hookRender = hookTestSetup(useSortEditDsl, props);

    hook = hookRender.result;
    rerender = hookRender.rerender;
  });

  describe('changeFieldSort', () => {
    it('should add apply and sort block', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2';
      const expectedDsl = 'table t1 [f1]=1 [f2]=2\r\napply\nsort [f1]\r\n';
      rerender({ dsl });

      // Act
      act(() => hook.current.changeFieldSort('t1', 'f1', 'asc'));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add sort block', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2\napply\nsort [f2]';
      const expectedDsl = 'table t1 [f1]=1 [f2]=2\napply\nsort [f2], [f1]\r\n';
      rerender({ dsl });

      // Act
      act(() => hook.current.changeFieldSort('t1', 'f1', 'asc'));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should change sort block', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2\r\napply\r\nsort [f1]';
      const expectedDsl = 'table t1 [f1]=1 [f2]=2\r\napply\r\nsort -[f1]\r\n';
      rerender({ dsl });

      // Act
      act(() => hook.current.changeFieldSort('t1', 'f1', 'desc'));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should clear sort', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2\r\napply\r\nsort [f1]';
      const expectedDsl = 'table t1 [f1]=1 [f2]=2\r\n';
      rerender({ dsl });

      // Act
      act(() => hook.current.changeFieldSort('t1', 'f1', null));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should do nothing when clear sort, but apply block does not exist', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2\r\n';
      rerender({ dsl });

      // Act
      act(() => hook.current.changeFieldSort('t1', 'f1', null));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledTimes(0);
    });

    it('should do nothing when clear sort, sort block does not exist, but apply block exist', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2\r\napply\r\nfilter [f] > 0\r\n';
      rerender({ dsl });

      // Act
      act(() => hook.current.changeFieldSort('t1', 'f1', null));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledTimes(0);
    });
  });
});
