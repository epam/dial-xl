import { act, renderHook } from '@testing-library/react';

import { usePromoteRowManualEditDSL } from '../usePromoteRowManualEditDSL';
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
  const { result } = renderHook(() => usePromoteRowManualEditDSL(), {
    wrapper: getWrapper(dsl, props),
  });

  return result.current;
}

describe('usePromoteRowManualEditDSL', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    props.projectSheets = [];
  });

  describe('promoteRow', () => {
    it('should promote override value as table field', async () => {
      // Arrange
      const dsl = `!hideHeader()\r\n!hideFields()\r\n!manual()\r\n!placement(4, 4)\r\ntable t1\r\n[Field1] = NA\r\noverride\r\n[Field1]\r\n"cities"\r\n"London"\r\n"Berlin"\r\n"Boston"\r\n`;
      const expectedDsl = `!hideHeader()\r\n!manual()\r\n!placement(4, 4)\r\ntable t1\r\n[cities] = NA\r\noverride\r\n[cities]\r\n"London"\r\n"Berlin"\r\n"Boston"\r\n`;
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.promoteRow('t1', 0));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Set row 0 in table t1 as field headers`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });

  it('should promote all override values in a row as table fields', async () => {
    // Arrange
    const dsl = `!hideHeader()\r\n!hideFields()\r\n!manual()\r\n!placement(4, 4)\r\ntable t1\r\n[Field1] = NA\r\n[Field2] = NA\r\noverride\r\n[Field1],[Field2]\r\n"cities","population"\r\n"London",1\r\n"Berlin",2\r\n"Boston",3\r\n`;
    const expectedDsl = `!hideHeader()\r\n!manual()\r\n!placement(4, 4)\r\ntable t1\r\n[cities] = NA\r\n[population] = NA\r\noverride\r\n[cities],[population]\r\n"London",1\r\n"Berlin",2\r\n"Boston",3\r\n`;
    const hook = getRenderedHook(dsl, props);

    // Act
    act(() => hook.promoteRow('t1', 0));
    await new Promise(process.nextTick);

    // Assert
    expect(props.appendToFn).toHaveBeenCalledWith(
      props.sheetName,
      `Set row 0 in table t1 as field headers`,
      expectedDsl
    );
    expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
      props.sheetName,
      expectedDsl
    );
  });
});
