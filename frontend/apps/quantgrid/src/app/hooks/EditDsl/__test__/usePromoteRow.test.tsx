import { act, RenderHookResult } from '@testing-library/react';

import { usePromoteRow } from '../usePromoteRow';
import { createWrapper, initialProps } from './createWrapper';
import { hookTestSetup } from './hookTestSetup';
import { TestWrapperProps } from './types';

describe('usePromoteRow', () => {
  const props: TestWrapperProps = { ...initialProps };
  let hook: RenderHookResult<
    ReturnType<typeof usePromoteRow>,
    { dsl: string }
  >['result'];
  let setDsl: (dsl: string) => void;
  let Wrapper: React.FC<React.PropsWithChildren>;

  beforeAll(() => {
    Wrapper = createWrapper(props);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const hookRender = hookTestSetup(usePromoteRow, Wrapper);
    hook = hookRender.result;
    setDsl = hookRender.setDsl;
  });

  describe('promoteRow', () => {
    it('should promote override value as table field', () => {
      // Arrange
      const dsl = `!manual()\n!layout(4, 4)\ntable t1\n[Field1] = NA\noverride\n[Field1]\n"cities"\n"London"\n"Berlin"\n"Boston"`;
      const expectedDsl = `!manual()\n!layout(4, 4, "headers")\ntable t1\n[cities] = NA\noverride\n[cities]\n"London"\n"Berlin"\n"Boston"\r\n`;
      setDsl(dsl);

      // Act
      act(() => hook.current.promoteRow('t1', 0));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Set row 0 in table t1 as field headers`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  it('should promote all override values in a row as table fields', () => {
    // Arrange
    const dsl = `!manual()\n!layout(4, 4)\ntable t1\n[Field1] = NA\n[Field2] = NA\noverride\n[Field1],[Field2]\n"cities","population"\n"London",1\n"Berlin",2\n"Boston",3`;
    const expectedDsl = `!manual()\n!layout(4, 4, "headers")\ntable t1\n[cities] = NA\n[population] = NA\noverride\n[cities],[population]\n"London",1\n"Berlin",2\n"Boston",3\r\n`;
    setDsl(dsl);

    // Act
    act(() => hook.current.promoteRow('t1', 0));

    // Assert
    expect(props.appendToFn).toHaveBeenCalledWith(
      `Set row 0 in table t1 as field headers`,
      [{ sheetName: props.sheetName, content: expectedDsl }]
    );
    expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
      { sheetName: props.sheetName, content: expectedDsl },
    ]);
  });
});
