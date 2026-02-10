import { vi } from 'vitest';

import { act, RenderHookResult } from '@testing-library/react';

import { useImportsEditDsl } from '../useImportsEditDsl';
import { createWrapper, initialProps } from './createWrapper';
import { hookTestSetup } from './hookTestSetup';
import { TestWrapperProps } from './types';

describe('useImportsEditDsl', () => {
  const props: TestWrapperProps = { ...initialProps };
  let hook: RenderHookResult<
    ReturnType<typeof useImportsEditDsl>,
    { dsl: string }
  >['result'];
  let setDsl: (dsl: string) => void;
  let Wrapper: React.FC<React.PropsWithChildren>;

  beforeAll(() => {
    Wrapper = createWrapper(props);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    const hookRender = hookTestSetup(useImportsEditDsl, Wrapper);
    hook = hookRender.result;
    setDsl = hookRender.setDsl;
  });

  describe('renameImportSourceDsl', () => {
    it('should rename import source', () => {
      // Arrange
      const dsl =
        'table t1 dim [f1],[f2],[f3] = IMPORT("my_source/MYDB/PUBLIC/TABLE", 1)[[f1],[f2],[f3]]';
      const expectedDsl =
        'table t1 dim [f1],[f2],[f3] = IMPORT("new_source_name/MYDB/PUBLIC/TABLE", 1)[[f1],[f2],[f3]]\r\n';
      setDsl(dsl);

      // Act
      act(() =>
        hook.current.renameImportSourceDsl('my_source', 'new_source_name'),
      );

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should rename all valid import sources', () => {
      // Arrange
      const dsl =
        'table t1 dim [f1],[f2],[f3] = IMPORT("my_source1/MYDB/PUBLIC/TABLE", 1)[[f1],[f2],[f3]]\ntable t2 dim [a1],[a2],[a3] = IMPORT("my_source2/MYDB/PUBLIC/TABLE", 1)[[a1],[a2],[a3]]';
      const expectedDsl =
        'table t1 dim [f1],[f2],[f3] = IMPORT("my_source1/MYDB/PUBLIC/TABLE", 1)[[f1],[f2],[f3]]\ntable t2 dim [a1],[a2],[a3] = IMPORT("new_source_name/MYDB/PUBLIC/TABLE", 1)[[a1],[a2],[a3]]\r\n';
      setDsl(dsl);

      // Act
      act(() =>
        hook.current.renameImportSourceDsl('my_source2', 'new_source_name'),
      );

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });
});
