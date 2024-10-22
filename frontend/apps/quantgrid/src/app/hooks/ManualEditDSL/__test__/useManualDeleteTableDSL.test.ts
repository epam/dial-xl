import { act, renderHook } from '@testing-library/react';

import { useManualDeleteTableDSL } from '../useManualDeleteTableDSL';
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
  const { result } = renderHook(() => useManualDeleteTableDSL(), {
    wrapper: getWrapper(dsl, props),
  });

  return result.current;
}

describe('useManualDeleteTableDSL', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    props.projectSheets = [];
  });

  describe('deleteTable', () => {
    it('should delete table', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\r\ntable t2 [f5]=1';
      const expectedDsl = 'table t1 [f1]=1\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.deleteTable('t2'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Delete table "t2"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should delete table with name in quotes', async () => {
      // Arrange
      const dsl = `table t1 [f1]=1\r\ntable 't spaces' [f5]=1`;
      const expectedDsl = 'table t1 [f1]=1\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.deleteTable(`'t spaces'`));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Delete table "'t spaces'"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });

  describe('deleteTables', () => {
    it('should delete tables', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\r\ntable t2 [f2]=2\r\ntable t3 [f3]=3';
      const expectedDsl = 'table t1 [f1]=1\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.deleteTables(['t2', 't3']));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Delete tables "t2", "t3"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });
});
