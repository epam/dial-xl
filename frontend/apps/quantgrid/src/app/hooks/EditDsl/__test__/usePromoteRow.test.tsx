import { act, RenderHookResult } from '@testing-library/react';

import { usePromoteRow } from '../usePromoteRow';
import { hookTestSetup } from './hookTestSetup';
import { RenderProps, TestWrapperProps } from './types';

const initialProps: TestWrapperProps = {
  appendToFn: jest.fn(),
  manuallyUpdateSheetContent: jest.fn(() => Promise.resolve(true)),
  projectName: 'project1',
  sheetName: 'sheet1',
};

describe('usePromoteRow', () => {
  let props: TestWrapperProps;
  let hook: RenderHookResult<
    ReturnType<typeof usePromoteRow>,
    { dsl: string }
  >['result'];
  let rerender: (props?: RenderProps) => void;

  beforeEach(() => {
    props = { ...initialProps };
    jest.clearAllMocks();

    const hookRender = hookTestSetup(usePromoteRow, props);

    hook = hookRender.result;
    rerender = hookRender.rerender;
  });

  describe('promoteRow', () => {
    it('should promote override value as table field', () => {
      // Arrange
      const dsl = `!manual()\n!layout(4, 4)\ntable t1\n[Field1] = NA\noverride\n[Field1]\n"cities"\n"London"\n"Berlin"\n"Boston"`;
      const expectedDsl = `!manual()\n!layout(4, 4, "headers")\ntable t1\n[cities] = NA\noverride\n[cities]\n"London"\n"Berlin"\n"Boston"\r\n`;
      rerender({ dsl });

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
    rerender({ dsl });

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
