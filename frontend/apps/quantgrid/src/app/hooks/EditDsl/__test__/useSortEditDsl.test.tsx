import { act, RenderHookResult } from '@testing-library/react';

import { useSortEditDsl } from '../useSortEditDsl';
import { createWrapper, initialProps } from './createWrapper';
import { hookTestSetup } from './hookTestSetup';
import { TestWrapperProps } from './types';

describe('useSortEditDsl', () => {
  const props: TestWrapperProps = { ...initialProps };
  let hook: RenderHookResult<
    ReturnType<typeof useSortEditDsl>,
    { dsl: string }
  >['result'];
  let setDsl: (dsl: string) => void;
  let Wrapper: React.FC<React.PropsWithChildren>;

  beforeAll(() => {
    Wrapper = createWrapper(props);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const hookRender = hookTestSetup(useSortEditDsl, Wrapper);
    hook = hookRender.result;
    setDsl = hookRender.setDsl;
  });

  describe('changeFieldSort', () => {
    it('should add apply and sort block', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2';
      const expectedDsl = 'table t1 [f1]=1 [f2]=2\r\napply\nsort [f1]\r\n';
      setDsl(dsl);

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
      setDsl(dsl);

      // Act
      act(() => hook.current.changeFieldSort('t1', 'f1', 'asc'));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should change sort block', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2\napply\nsort [f2]';
      const expectedDsl = 'table t1 [f1]=1 [f2]=2\napply\nsort -[f2]\r\n';
      setDsl(dsl);

      // Act
      act(() => hook.current.changeFieldSort('t1', 'f2', 'desc'));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should clear sort', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2\napply\nsort [f2]';
      const expectedDsl = 'table t1 [f1]=1 [f2]=2\r\n';
      setDsl(dsl);

      // Act
      act(() => hook.current.changeFieldSort('t1', 'f2', null));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should do nothing when clear sort, but apply block does not exist', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2';
      setDsl(dsl);

      // Act
      act(() => hook.current.changeFieldSort('t1', 'f1', null));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledTimes(0);
    });

    it('should do nothing when clear sort, sort block does not exist, but apply block exist', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1 [f2]=2\napply\nfilter [f] > 0';
      setDsl(dsl);

      // Act
      act(() => hook.current.changeFieldSort('t1', 'f1', null));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledTimes(0);
    });
  });
});
