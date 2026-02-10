import { newLine } from '@frontend/parser';
import { act, RenderHookResult } from '@testing-library/react';

import { useDSLUtils } from '../useDSLUtils';
import { createWrapper, initialProps } from './createWrapper';
import { hookTestSetup } from './hookTestSetup';
import { RenderProps, TestWrapperProps } from './types';

describe('useDSLUtils', () => {
  const props: TestWrapperProps = { ...initialProps };
  let hook: RenderHookResult<
    ReturnType<typeof useDSLUtils>,
    { dsl: string }
  >['result'];
  let setDsl: (dsl: string) => void;
  let Wrapper: React.FC<React.PropsWithChildren>;

  beforeAll(() => {
    Wrapper = createWrapper(props);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const hookRender = hookTestSetup(useDSLUtils, Wrapper);
    hook = hookRender.result;
    setDsl = hookRender.setDsl;
  });

  describe('findTable', () => {
    it('should find table by table name', () => {
      // Arrange
      const dsl = 'table t1 key [f1]=1\n [f2]=2\n table t2 [f1]=1';
      setDsl(dsl);
      let result;

      // Act
      act(() => {
        result = hook.current.findTable('t1');
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
      const dsl = `table t1 key [f1]=1\n [f2]=2\n table 'some table' [f1]=1`;
      setDsl(dsl);
      let result;

      // Act
      act(() => {
        result = hook.current.findTable(`'some table'`);
      });

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          tableName: `'some table'`,
        })
      );
    });

    it('should return undefined if table not found', () => {
      // Arrange
      const dsl = 'table t1 key [f1]=1\n [f2]=2\n table t2 [f1]=1';
      setDsl(dsl);
      let result;

      // Act
      act(() => {
        result = hook.current.findTable('t111');
      });

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('findLastTableField', () => {
    it('should find last field in table', () => {
      // Arrange
      const dsl = 'table t1 key [f1]=1\n [f2]=2\n table t2 [f1]=1';
      setDsl(dsl);
      let result;

      // Act
      act(() => {
        result = hook.current.findLastTableField('t1');
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

    it('should return null if table not found', () => {
      // Arrange
      const dsl = 'table t1 key [f1]=1\n [f2]=2\n table t2 [f1]=1';
      setDsl(dsl);
      let result;

      // Act
      act(() => {
        result = hook.current.findLastTableField('t33');
      });

      // Assert
      expect(result).toBeNull();
    });

    it('should return null if no fields in table', () => {
      // Arrange
      const dsl = 'table t1 key [f1]=1\n [f2]=2\n table t2';
      setDsl(dsl);
      let result;

      // Act
      act(() => {
        result = hook.current.findLastTableField('t2');
      });

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findTableField', () => {
    it('should find field in table', () => {
      // Arrange
      const dsl = 'table t1 key [f1]=1\n [f2]=2\n table t2 [f1]=1';
      setDsl(dsl);
      let result;

      // Act
      act(() => {
        result = hook.current.findTableField('t1', 'f2');
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
      const dsl = 'table t1 key [f1]=1\n [f2]=2\n table t2 [f1]=1';
      setDsl(dsl);
      let result;

      // Act
      act(() => {
        result = hook.current.findTableField('t111', 'f2');
      });

      // Assert
      expect(result).toBeNull();
    });

    it('should return null in no field found', () => {
      // Arrange
      const dsl = 'table t1 key [f1]=1\n [f2]=2\n table t2 [f1]=1';
      setDsl(dsl);
      let result;

      // Act
      act(() => {
        result = hook.current.findTableField('t1', 'f3');
      });

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('updateDSL', () => {
    it('should update sheet', async () => {
      // Arrange
      const dsl = 'table t1 key [f1]=1\n [f2]=2\n table t2 [f1]=1';
      setDsl(dsl);

      // Act
      await act(() =>
        hook.current.updateDSL({ updatedSheetContent: dsl, historyTitle: '' })
      );

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        {
          sheetName: props.sheetName,
          content: dsl + newLine,
        },
      ]);
    });

    it('should add item to the history', async () => {
      // Arrange
      const dsl = 'table t1 key [f1]=1\n [f2]=2\n table t2 [f1]=1';
      const historyTitle = 'DSL change';
      setDsl(dsl);

      // Act
      await act(() =>
        hook.current.updateDSL({ updatedSheetContent: dsl, historyTitle })
      );

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        {
          sheetName: props.sheetName,
          content: dsl + newLine,
        },
      ]);
      expect(props.appendToFn).toHaveBeenCalledWith(historyTitle, [
        { sheetName: props.sheetName, content: dsl + newLine },
      ]);
    });

    it('should add different dsl changes for different sheets under same history item when having same title', async () => {
      // Arrange
      const dsl = 'table t1 key [f1]=1\n [f2]=2\n table t2 [f1]=1';
      const sheetName1 = 'Sheet1';
      const sheetName2 = 'Sheet2';
      const historyTitle = 'DSL change';
      setDsl(dsl);

      // Act
      await act(() =>
        hook.current.updateDSL([
          {
            updatedSheetContent: dsl,
            historyTitle,
            sheetNameToChange: sheetName1,
          },
          {
            updatedSheetContent: dsl,
            historyTitle,
            sheetNameToChange: sheetName2,
          },
        ])
      );

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        {
          sheetName: sheetName1,
          content: dsl + newLine,
        },
        {
          sheetName: sheetName2,
          content: dsl + newLine,
        },
      ]);
      expect(props.appendToFn).toHaveBeenCalledWith(historyTitle, [
        { sheetName: sheetName1, content: dsl + newLine },
        { sheetName: sheetName2, content: dsl + newLine },
      ]);
    });

    it('should add different dsl changes for different sheets under different history item when having different title', async () => {
      // Arrange
      const dsl = 'table t1 key [f1]=1\n [f2]=2\n table t2 [f1]=1';
      const sheetName1 = 'Sheet1';
      const sheetName2 = 'Sheet2';
      const historyTitle1 = 'DSL change1';
      const historyTitle2 = 'DSL change2';
      setDsl(dsl);

      // Act
      await act(() =>
        hook.current.updateDSL([
          {
            updatedSheetContent: dsl,
            historyTitle: historyTitle1,
            sheetNameToChange: sheetName1,
          },
          {
            updatedSheetContent: dsl,
            historyTitle: historyTitle2,
            sheetNameToChange: sheetName2,
          },
        ])
      );

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        {
          sheetName: sheetName1,
          content: dsl + newLine,
        },
        {
          sheetName: sheetName2,
          content: dsl + newLine,
        },
      ]);
      expect(props.appendToFn).toHaveBeenNthCalledWith(1, historyTitle1, [
        { sheetName: sheetName1, content: dsl + newLine },
      ]);
      expect(props.appendToFn).toHaveBeenNthCalledWith(2, historyTitle2, [
        { sheetName: sheetName2, content: dsl + newLine },
      ]);
    });
  });
});
