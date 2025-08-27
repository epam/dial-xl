import { SheetReader } from '@frontend/parser';
import { act } from '@testing-library/react';

import { ViewGridData } from '../../context';
import { hookTestSetup } from '../EditDsl/__test__/hookTestSetup';
import { RenderProps, TestWrapperProps } from '../EditDsl/__test__/types';
import { useFindTableKeys } from '../useFindTableKeys';

const initialProps: TestWrapperProps = {
  appendToFn: jest.fn(),
  manuallyUpdateSheetContent: jest.fn(() => Promise.resolve(true)),
  projectName: 'project1',
  sheetName: 'sheet1',
};

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
        source: 'DOUBLE',
        f1: 'DOUBLE',
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
        f1: 'DOUBLE',
      },
      nestedColumnNames: new Set(),
    } as any;
  },
} as ViewGridData;

describe('useFindTableKeys', () => {
  let props: TestWrapperProps;
  let rerender: (props?: RenderProps) => void;

  beforeEach(() => {
    props = { ...initialProps };
    jest.clearAllMocks();
  });

  describe('findTableKeys', () => {
    it('should find keys in vertical table', () => {
      // Arrange
      props = { ...initialProps };
      props.viewGridData = mockedViewGridData;
      const dsl =
        '!layout(1, 1, "title", "headers")\r\ntable T2\r\nkey dim [source] = RANGE(5)\r\nkey [f1] = [source] + 1\r\n';
      const hookRender = hookTestSetup(useFindTableKeys, props);
      const hook = hookRender.result;
      rerender = hookRender.rerender;
      rerender({ dsl });
      let result: string | number = '';
      const table = SheetReader.parseSheet(dsl).tables[0];

      // Act
      act(() => {
        result = hook.current.findTableKeys(table, 5, 6);
      });

      // Assert
      expect(result).toEqual('4,5');
    });

    it('should find string keys', () => {
      // Arrange
      props = { ...initialProps };
      props.viewGridData = mockedViewGridDataWithString;
      const dsl =
        '!manual()\r\\n!layout(1, 1, "title", "headers")\r\ntable ttt\r\nkey [source]\r\n[f1]\r\noverride\r\n[f1],[source]\r\n123,"revenue"\r\n24,"cost"\r\n11,"profit"\r\n';
      const hookRender = hookTestSetup(useFindTableKeys, props);
      const hook = hookRender.result;
      rerender = hookRender.rerender;
      rerender({ dsl });
      let result: string | number = '';
      const table = SheetReader.parseSheet(dsl).tables[0];

      // Act
      act(() => {
        result = hook.current.findTableKeys(table, 2, 4);
      });

      // Assert
      expect(result).toEqual('"cost"');
    });

    it('should find keys in vertical table without field headers', () => {
      // Arrange
      props = { ...initialProps };
      props.viewGridData = mockedViewGridData;
      const dsl =
        '!layout(1, 1, "title")\r\ntable T2\r\nkey dim [source] = RANGE(5)\r\nkey [f1] = [source] + 1\r\n';
      const hookRender = hookTestSetup(useFindTableKeys, props);
      const hook = hookRender.result;
      rerender = hookRender.rerender;
      rerender({ dsl });
      let result: string | number = '';
      const table = SheetReader.parseSheet(dsl).tables[0];

      // Act
      act(() => {
        result = hook.current.findTableKeys(table, 3, 5);
      });

      // Assert
      expect(result).toEqual('4,5');
    });

    it('should find keys in vertical table without field and table headers', () => {
      // Arrange
      props = { ...initialProps };
      props.viewGridData = mockedViewGridData;
      const dsl =
        '!layout(1, 1)\r\ntable T2\r\nkey dim [source] = RANGE(5)\r\nkey [f1] = [source] + 1\r\n';
      const hookRender = hookTestSetup(useFindTableKeys, props);
      const hook = hookRender.result;
      rerender = hookRender.rerender;
      rerender({ dsl });
      let result: string | number = '';
      const table = SheetReader.parseSheet(dsl).tables[0];

      // Act
      act(() => {
        result = hook.current.findTableKeys(table, 3, 2);
      });

      // Assert
      expect(result).toEqual('2,3');
    });

    it('should find keys in vertical table with totals', () => {
      // Arrange
      props = { ...initialProps };
      props.viewGridData = mockedViewGridData;
      const dsl =
        '!layout(1, 1, "title", "headers")\r\ntable T2\r\nkey dim [source] = RANGE(5)\r\nkey [f1] = [source] + 1\r\ntotal\r\n[f1] = COUNT(T2[f1])\r\n';
      const hookRender = hookTestSetup(useFindTableKeys, props);
      const hook = hookRender.result;
      rerender = hookRender.rerender;
      rerender({ dsl });
      let result: string | number = '';
      const table = SheetReader.parseSheet(dsl).tables[0];

      // Act
      act(() => {
        result = hook.current.findTableKeys(table, 3, 7);
      });

      // Assert
      expect(result).toEqual('4,5');
    });

    it('should find keys in horizontal table', () => {
      // Arrange
      props = { ...initialProps };
      props.viewGridData = mockedViewGridData;
      const dsl =
        '!layout(1, 1, "horizontal", "title", "headers")\r\ntable T2\r\nkey dim [source] = RANGE(5)\r\nkey [f1] = [source] + 1\r\n';
      const hookRender = hookTestSetup(useFindTableKeys, props);
      const hook = hookRender.result;
      rerender = hookRender.rerender;
      rerender({ dsl });
      let result: string | number = '';
      const table = SheetReader.parseSheet(dsl).tables[0];

      // Act
      act(() => {
        result = hook.current.findTableKeys(table, 3, 4);
      });

      // Assert
      expect(result).toEqual('2,3');
    });

    it('should find keys in horizontal table without field headers', () => {
      // Arrange
      props = { ...initialProps };
      props.viewGridData = mockedViewGridData;
      const dsl =
        '!layout(1, 1, "horizontal", "title")\r\ntable T2\r\nkey dim [source] = RANGE(5)\r\nkey [f1] = [source] + 1\r\n';
      const hookRender = hookTestSetup(useFindTableKeys, props);
      const hook = hookRender.result;
      rerender = hookRender.rerender;
      rerender({ dsl });
      let result: string | number = '';
      const table = SheetReader.parseSheet(dsl).tables[0];

      // Act
      act(() => {
        result = hook.current.findTableKeys(table, 1, 4);
      });

      // Assert
      expect(result).toEqual('1,2');
    });

    it('should find keys in horizontal table without field and table headers', () => {
      // Arrange
      props = { ...initialProps };
      props.viewGridData = mockedViewGridData;
      const dsl =
        '!layout(1, 1, "horizontal")\r\ntable T2\r\nkey dim [source] = RANGE(5)\r\nkey [f1] = [source] + 1\r\n';
      const hookRender = hookTestSetup(useFindTableKeys, props);
      const hook = hookRender.result;
      rerender = hookRender.rerender;
      rerender({ dsl });
      let result: string | number = '';
      const table = SheetReader.parseSheet(dsl).tables[0];

      // Act
      act(() => {
        result = hook.current.findTableKeys(table, 2, 3);
      });

      // Assert
      expect(result).toEqual('2,3');
    });

    it('should find keys in horizontal table with totals', () => {
      // Arrange
      props = { ...initialProps };
      props.viewGridData = mockedViewGridData;
      const dsl =
        '!layout(1, 1, "horizontal", "title", "headers")\r\ntable T2\r\nkey dim [source] = RANGE(5)\r\nkey [f1] = [source] + 1\r\ntotal\r\n[f1] = COUNT(T2[f1])\r\n';
      const hookRender = hookTestSetup(useFindTableKeys, props);
      const hook = hookRender.result;
      rerender = hookRender.rerender;
      rerender({ dsl });

      let result: string | number = '';
      const table = SheetReader.parseSheet(dsl).tables[0];

      // Act
      act(() => {
        result = hook.current.findTableKeys(table, 4, 4);
      });

      // Assert
      expect(result).toEqual('2,3');
    });
  });
});
