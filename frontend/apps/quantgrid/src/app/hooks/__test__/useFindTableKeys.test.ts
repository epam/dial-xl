import { SheetReader } from '@frontend/parser';
import { act, renderHook } from '@testing-library/react';

import { ViewGridData } from '../../context';
import { getWrapper } from '../ManualEditDSL/__test__/utils';
import { useFindTableKeys } from '../useFindTableKeys';

const props = {
  appendToFn: jest.fn(),
  updateSheetContent: jest.fn(),
  manuallyUpdateSheetContent: jest.fn(),
  projectName: 'project1',
  sheetName: 'sheet1',
  viewGridData: new ViewGridData(),
};

export function getRenderedHook(dsl: string, props: any) {
  const { result } = renderHook(() => useFindTableKeys(), {
    wrapper: getWrapper(dsl, props),
  });

  return result.current;
}

const mockedViewGridData = {
  getTableData: (tableName: string) => {
    return {
      chunks: {
        0: {
          source: ['1', '2', '3', '4', '5'],
          f1: ['2', '3', '4', '5', '6'],
        },
      },
      types: {
        source: 'INTEGER',
        f1: 'INTEGER',
      },
      nestedColumnNames: new Set(),
    } as any;
  },
} as ViewGridData;

const mockedViewGridDataWithString = {
  getTableData: (tableName: string) => {
    return {
      chunks: {
        0: {
          source: ['revenue', 'cost', 'profit'],
          f1: ['1', '2', '3'],
        },
      },
      types: {
        source: 'STRING',
        f1: 'INTEGER',
      },
      nestedColumnNames: new Set(),
    } as any;
  },
} as ViewGridData;

describe('useFindTableKeys', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('findTableKeys', () => {
    it('should find keys in vertical table', () => {
      // Arrange
      props.viewGridData = mockedViewGridData;
      const dsl =
        '!layout(1, 1, "title", "headers")\r\ntable T2\r\nkey dim [source] = RANGE(5)\r\nkey [f1] = [source] + 1\r\n';
      const hook = getRenderedHook(dsl, props);
      let result: string | number = '';
      const table = SheetReader.parseSheet(dsl).tables[0];

      // Act
      act(() => {
        result = hook.findTableKeys(table, 5, 6);
      });

      // Assert
      expect(result).toEqual('4,5');
    });

    it('should find string keys', () => {
      // Arrange
      props.viewGridData = mockedViewGridDataWithString;
      const dsl =
        '!manual()\r\\n!layout(1, 1, "title", "headers")\r\ntable ttt\r\nkey [source]\r\n[f1]\r\noverride\r\n[f1],[source]\r\n123,"revenue"\r\n24,"cost"\r\n11,"profit"\r\n';
      const hook = getRenderedHook(dsl, props);
      let result: string | number = '';
      const table = SheetReader.parseSheet(dsl).tables[0];

      // Act
      act(() => {
        result = hook.findTableKeys(table, 2, 4);
      });

      // Assert
      expect(result).toEqual('"cost"');
    });

    it('should find keys in vertical table without field headers', () => {
      // Arrange
      props.viewGridData = mockedViewGridData;
      const dsl =
        '!layout(1, 1, "title")\r\ntable T2\r\nkey dim [source] = RANGE(5)\r\nkey [f1] = [source] + 1\r\n';
      const hook = getRenderedHook(dsl, props);
      let result: string | number = '';
      const table = SheetReader.parseSheet(dsl).tables[0];

      // Act
      act(() => {
        result = hook.findTableKeys(table, 3, 5);
      });

      // Assert
      expect(result).toEqual('4,5');
    });

    it('should find keys in vertical table without field and table headers', () => {
      // Arrange
      props.viewGridData = mockedViewGridData;
      const dsl =
        '!layout(1, 1)\r\ntable T2\r\nkey dim [source] = RANGE(5)\r\nkey [f1] = [source] + 1\r\n';
      const hook = getRenderedHook(dsl, props);
      let result: string | number = '';
      const table = SheetReader.parseSheet(dsl).tables[0];

      // Act
      act(() => {
        result = hook.findTableKeys(table, 3, 2);
      });

      // Assert
      expect(result).toEqual('2,3');
    });

    it('should find keys in vertical table with totals', () => {
      // Arrange
      props.viewGridData = mockedViewGridData;
      const dsl =
        '!layout(1, 1, "title", "headers")\r\ntable T2\r\nkey dim [source] = RANGE(5)\r\nkey [f1] = [source] + 1\r\ntotal\r\n[f1] = COUNT(T2[f1])\r\n';
      const hook = getRenderedHook(dsl, props);
      let result: string | number = '';
      const table = SheetReader.parseSheet(dsl).tables[0];

      // Act
      act(() => {
        result = hook.findTableKeys(table, 3, 7);
      });

      // Assert
      expect(result).toEqual('4,5');
    });

    it('should find keys in horizontal table', () => {
      // Arrange
      props.viewGridData = mockedViewGridData;
      const dsl =
        '!layout(1, 1, "horizontal", "title", "headers")\r\ntable T2\r\nkey dim [source] = RANGE(5)\r\nkey [f1] = [source] + 1\r\n';
      const hook = getRenderedHook(dsl, props);
      let result: string | number = '';
      const table = SheetReader.parseSheet(dsl).tables[0];

      // Act
      act(() => {
        result = hook.findTableKeys(table, 3, 4);
      });

      // Assert
      expect(result).toEqual('2,3');
    });

    it('should find keys in horizontal table without field headers', () => {
      // Arrange
      props.viewGridData = mockedViewGridData;
      const dsl =
        '!layout(1, 1, "horizontal", "title")\r\ntable T2\r\nkey dim [source] = RANGE(5)\r\nkey [f1] = [source] + 1\r\n';
      const hook = getRenderedHook(dsl, props);
      let result: string | number = '';
      const table = SheetReader.parseSheet(dsl).tables[0];

      // Act
      act(() => {
        result = hook.findTableKeys(table, 1, 4);
      });

      // Assert
      expect(result).toEqual('1,2');
    });

    it('should find keys in horizontal table without field and table headers', () => {
      // Arrange
      props.viewGridData = mockedViewGridData;
      const dsl =
        '!layout(1, 1, "horizontal")\r\ntable T2\r\nkey dim [source] = RANGE(5)\r\nkey [f1] = [source] + 1\r\n';
      const hook = getRenderedHook(dsl, props);
      let result: string | number = '';
      const table = SheetReader.parseSheet(dsl).tables[0];

      // Act
      act(() => {
        result = hook.findTableKeys(table, 2, 3);
      });

      // Assert
      expect(result).toEqual('2,3');
    });

    it('should find keys in horizontal table with totals', () => {
      // Arrange
      props.viewGridData = mockedViewGridData;
      const dsl =
        '!layout(1, 1, "horizontal", "title", "headers")\r\ntable T2\r\nkey dim [source] = RANGE(5)\r\nkey [f1] = [source] + 1\r\ntotal\r\n[f1] = COUNT(T2[f1])\r\n';
      const hook = getRenderedHook(dsl, props);
      let result: string | number = '';
      const table = SheetReader.parseSheet(dsl).tables[0];

      // Act
      act(() => {
        result = hook.findTableKeys(table, 4, 4);
      });

      // Assert
      expect(result).toEqual('2,3');
    });
  });
});
