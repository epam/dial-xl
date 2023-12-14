import { SheetReader } from '@frontend/parser';
import { act, renderHook } from '@testing-library/react';

import { createWrapper } from '../../testUtils';
import { useDSLUtils } from '../useDSLUtils';

const props = {
  appendFn: jest.fn(),
  updateSheetContent: jest.fn(),
  manuallyUpdateSheetContent: jest.fn(),
  projectName: 'project1',
  sheetName: 'sheet1',
};

export function getWrapper(dsl: string, props: any) {
  return createWrapper({
    ...props,
    sheetContent: dsl,
    parsedSheet: SheetReader.parseSheet(dsl),
  });
}

export function getRenderedHook(dsl: string, props: any) {
  const { result } = renderHook(() => useDSLUtils(), {
    wrapper: getWrapper(dsl, props),
  });

  return result.current;
}

describe('useDSLUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('findTable', () => {
    it('should find table by table name', () => {
      // Arrange
      const dsl = 'table t1 key [f1]=1 [f2]=2 table t2 [f1]=1';
      const hook = getRenderedHook(dsl, props);
      let result;

      // Act
      act(() => {
        result = hook.findTable('t1');
      });

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          tableName: 't1',
        })
      );
    });

    it('should find table by table name in quotes', () => {
      // Arrange
      const dsl = `table t1 key [f1]=1 [f2]=2 table 'some table' [f1]=1`;
      const hook = getRenderedHook(dsl, props);
      let result;

      // Act
      act(() => {
        result = hook.findTable(`some table`);
      });

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          tableName: `some table`,
        })
      );
    });

    it('should return undefined if table not found', () => {
      // Arrange
      const dsl = 'table t1 key [f1]=1 [f2]=2 table t2 [f1]=1';
      const hook = getRenderedHook(dsl, props);
      let result;

      // Act
      act(() => {
        result = hook.findTable('t111');
      });

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('findLastTableField', () => {
    it('should find last field in table', () => {
      // Arrange
      const dsl = 'table t1 key [f1]=1 [f2]=2 [f3]=3 [f4]=4 table t2 [f1]=1';
      const hook = getRenderedHook(dsl, props);
      let result;

      // Act
      act(() => {
        result = hook.findLastTableField('t1');
      });

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          key: {
            fieldName: 'f4',
            fullFieldName: '[f4]',
            tableName: 't1',
          },
        })
      );
    });

    it('should return null if table not found', () => {
      // Arrange
      const dsl = 'table t1 key [f1]=1 [f2]=2 [f3]=3 [f4]=4 table t2 [f1]=1';
      const hook = getRenderedHook(dsl, props);
      let result;

      // Act
      act(() => {
        result = hook.findLastTableField('t33');
      });

      // Assert
      expect(result).toBeNull();
    });

    it('should return null if no fields in table', () => {
      // Arrange
      const dsl = 'table t1 key [f1]=1 [f2]=2 [f3]=3 [f4]=4 table t2';
      const hook = getRenderedHook(dsl, props);
      let result;

      // Act
      act(() => {
        result = hook.findLastTableField('t2');
      });

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findTableField', () => {
    it('should find field in table', () => {
      // Arrange
      const dsl = 'table t1 key [f1]=1 [f2]=2 table t2 [f1]=1';
      const hook = getRenderedHook(dsl, props);
      let result;

      // Act
      act(() => {
        result = hook.findTableField('t1', 'f2');
      });

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          key: {
            fieldName: 'f2',
            fullFieldName: '[f2]',
            tableName: 't1',
          },
        })
      );
    });

    it('should return null in no table found', () => {
      // Arrange
      const dsl = 'table t1 key [f1]=1 [f2]=2 table t2 [f1]=1';
      const hook = getRenderedHook(dsl, props);
      let result;

      // Act
      act(() => {
        result = hook.findTableField('t111', 'f2');
      });

      // Assert
      expect(result).toBeNull();
    });

    it('should return null in no field found', () => {
      // Arrange
      const dsl = 'table t1 key [f1]=1 [f2]=2 table t2 [f3]=3';
      const hook = getRenderedHook(dsl, props);
      let result;

      // Act
      act(() => {
        result = hook.findTableField('t1', 'f3');
      });

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('updateDSL', () => {
    it('should update sheet', () => {
      // Arrange
      const dsl = 'table t1 key [f1]=1 [f2]=2';
      const hook = getRenderedHook(dsl, props);

      // Act
      act(() => hook.updateDSL(dsl));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith(
        props.sheetName,
        dsl
      );
    });
  });
});
