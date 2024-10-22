import { act, renderHook } from '@testing-library/react';

import { useManualAddTableRowDSL } from '../useManualAddTableRowDSL';
import { getWrapper } from './utils';

const props = {
  appendFn: jest.fn(),
  appendToFn: jest.fn(),
  updateSheetContent: jest.fn(() => true),
  manuallyUpdateSheetContent: jest.fn(() => true),
  projectName: 'project1',
  sheetName: 'sheet1',
  projectSheets: [],
  gridApi: null,
};

function getRenderedHook(dsl: string, props: any) {
  const { result } = renderHook(() => useManualAddTableRowDSL(), {
    wrapper: getWrapper(dsl, props),
  });

  return result.current;
}

describe('useManualAddTableRowDSL', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    props.projectSheets = [];
    props.gridApi = {
      getCell: () => {
        return {
          table: {
            tableName: 't1',
          },
          field: {
            fieldName: 'f1',
          },
        };
      },
    } as any;
  });

  describe('addTableRow', () => {
    it('should create manual table if no target table', async () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const expectedDsl =
        'table t1 [f1]=1\r\n\r\n!hideHeader()\r\n!hideFields()\r\n!manual()\r\n!placement(4, 4)\r\ntable Table1\r\n  [Field1]\r\noverride\r\n[Field1]\r\n33\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.addTableRow(4, 4, 'Table1', '33'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add manual table "Table1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });

    it('should add new row to overrides', async () => {
      // Arrange
      const dsl = '!manual() !placement(1,1) table t1 [f1]=1';
      const expectedDsl =
        '!manual() !placement(1,1) table t1 [f1]=1\r\noverride\r\n[f1]\r\n33\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.addTableRow(1, 3, 't1', '33'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add override "33" to table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });

  describe('insertTableRowBefore', () => {
    it('should add new row to overrides to field', async () => {
      // Arrange
      const dsl =
        '!manual() !placement(1,1) table t1 [f1]=1\r\noverride\r\n[f1]\r\n11\r\n';
      const expectedDsl =
        '!manual() !placement(1,1) table t1 [f1]=1\r\noverride\r\n[f1]\r\n33\r\n11\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.insertTableRowBefore(1, 3, 't1', '33'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add override "33" to table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
    it('should add new row to overrides to single field between existing ones', async () => {
      // Arrange
      const dsl =
        '!manual() !placement(1,1) table t1 [f1]=1\r\noverride\r\n[f1]\r\n11\r\n22\r\n';
      const expectedDsl =
        '!manual() !placement(1,1) table t1 [f1]=1\r\noverride\r\n[f1]\r\n11\r\n33\r\n22\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.insertTableRowBefore(1, 4, 't1', '33'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add override "33" to table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });
  describe('insertTableRowAfter', () => {
    it('should add new row to overrides to field', async () => {
      // Arrange
      const dsl =
        '!manual() !placement(1,1) table t1 [f1]=1\r\noverride\r\n[f1]\r\n11\r\n';
      const expectedDsl =
        '!manual() !placement(1,1) table t1 [f1]=1\r\noverride\r\n[f1]\r\n11\r\n33\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.insertTableRowAfter(1, 3, 't1', '33'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add override "33" to table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
    it('should add new row to overrides to single field between existing ones', async () => {
      // Arrange
      const dsl =
        '!manual() !placement(1,1) table t1 [f1]=1\r\noverride\r\n[f1]\r\n11\r\n22\r\n';
      const expectedDsl =
        '!manual() !placement(1,1) table t1 [f1]=1\r\noverride\r\n[f1]\r\n11\r\n22\r\n33\r\n';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.insertTableRowAfter(1, 4, 't1', '33'));
      await new Promise(process.nextTick);

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        props.sheetName,
        `Add override "33" to table "t1"`,
        expectedDsl
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        expectedDsl
      );
    });
  });
});
