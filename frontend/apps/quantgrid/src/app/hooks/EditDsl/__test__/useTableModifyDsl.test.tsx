import { ColumnDataType } from '@frontend/common';
import { act, RenderHookResult } from '@testing-library/react';

import { ViewGridData } from '../../../context';
import { useTableModifyDsl } from '../useTableModifyDsl';
import { createWrapper, initialProps } from './createWrapper';
import { hookTestSetup } from './hookTestSetup';
import { TestWrapperProps } from './types';

describe('useTableModifyDsl', () => {
  let props: TestWrapperProps = { ...initialProps };
  let hook: RenderHookResult<
    ReturnType<typeof useTableModifyDsl>,
    { dsl: string }
  >['result'];
  let setDsl: (dsl: string) => void;
  let Wrapper: React.FC<React.PropsWithChildren>;

  beforeAll(() => {
    Wrapper = createWrapper(props);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const hookRender = hookTestSetup(useTableModifyDsl, Wrapper);
    hook = hookRender.result;
    setDsl = hookRender.setDsl;
  });

  describe('autoCleanUpTableDSL', () => {
    it('should not modify table if at least one field is dim', () => {
      // Arrange
      const dsl = 'table t1 dim [f1] = RANGE(5)  [f2] = [f1] ^ 2';
      setDsl(dsl);

      // Act
      act(() => hook.current.autoCleanUpTableDSL('t1'));

      // Assert
      expect(props.appendToFn).not.toHaveBeenCalled();
      expect(props.manuallyUpdateSheetContent).not.toHaveBeenCalled();
    });

    it('should not remove any field', () => {
      // Arrange
      const dsl = '!layout(1, 1, "title")\ntable t1\n[f1] = 1\n[f2] = 2\n';
      setDsl(dsl);

      // Act
      act(() => hook.current.autoCleanUpTableDSL('t1'));

      // Assert
      expect(props.appendToFn).not.toHaveBeenCalled();
      expect(props.manuallyUpdateSheetContent).not.toHaveBeenCalled();
    });

    it('should remove single rightmost empty field', () => {
      // Arrange
      const dsl = '!layout(1, 1, "title")\ntable t1\n[f1] = 1\n[f2]';
      const expectedDsl = '!layout(1, 1, "title")\ntable t1\n[f1] = 1\r\n';
      setDsl(dsl);

      // Act
      act(() => hook.current.autoCleanUpTableDSL('t1'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Clean up table "t1"`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should remove multiple rightmost empty fields', () => {
      // Arrange
      const dsl =
        '!layout(1, 1, "title")\ntable t1\n[f1] = 1\n[f2]\n[f3]\n[f4]';
      const expectedDsl = '!layout(1, 1, "title")\ntable t1\n[f1] = 1\r\n';
      setDsl(dsl);

      // Act
      act(() => hook.current.autoCleanUpTableDSL('t1'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Clean up table "t1"`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should remove single rightmost empty field and field override key from table with overrides', () => {
      // Arrange
      const dsl =
        '!layout(1, 1, "title")\ntable t1\n[f1] = 1\n[f2]\noverride\nrow,[f1],[f2]\n1,321,';
      const expectedDsl =
        '!layout(1, 1, "title")\ntable t1\n[f1] = 1\noverride\nrow,[f1]\n1,321\r\n';
      setDsl(dsl);

      // Act
      act(() => hook.current.autoCleanUpTableDSL('t1'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Clean up table "t1"`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should remove multiple rightmost empty fields and their override keys from table with overrides', () => {
      // Arrange
      const dsl =
        '!layout(1, 1, "title")\ntable t1\n[f1] = 1\n[f2]\n[f3]\n[f4]\noverride\nrow,[f1],[f2],[f3],[f4]\n1,321,,,';
      const expectedDsl =
        '!layout(1, 1, "title")\ntable t1\n[f1] = 1\noverride\nrow,[f1]\n1,321\r\n';
      setDsl(dsl);

      // Act
      act(() => hook.current.autoCleanUpTableDSL('t1'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Clean up table "t1"`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should remove single empty override row', () => {
      // Arrange
      const dsl =
        '!manual()\n!layout(1, 1)\ntable t1\n[f1]\n[f2]\noverride\n[f1],[f2]\n1,2\n3,4\n,';
      const expectedDsl =
        '!manual()\n!layout(1, 1)\ntable t1\n[f1]\n[f2]\noverride\n[f1],[f2]\n1,2\n3,4\r\n';
      setDsl(dsl);

      // Act
      act(() => hook.current.autoCleanUpTableDSL('t1'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Clean up table "t1"`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should remove multiple empty override rows', () => {
      // Arrange
      const dsl =
        '!manual()\n!layout(1, 1)\ntable t1\n[f1]\n[f2]\noverride\n[f1],[f2]\n1,2\n3,4\n,\n,\n,';
      const expectedDsl =
        '!manual()\n!layout(1, 1)\ntable t1\n[f1]\n[f2]\noverride\n[f1],[f2]\n1,2\n3,4\r\n';
      setDsl(dsl);

      // Act
      act(() => hook.current.autoCleanUpTableDSL('t1'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Clean up table "t1"`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should remove overrides section and convert last override row to field formulas', () => {
      // Arrange
      const dsl =
        '!layout(1, 1)\n!manual()\ntable t1\n[f1]\n[f2]\noverride\n[f1],[f2]\n1,2\n,\n,\n,';
      const expectedDsl = '!layout(1, 1)\ntable t1\n[f1] = 1\n[f2] = 2\r\n';
      setDsl(dsl);

      // Act
      act(() => hook.current.autoCleanUpTableDSL('t1'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Clean up table "t1"`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should remove overrides section and convert to regular table without changing field formulas', () => {
      // Arrange
      const dsl =
        '!layout(1, 1)\n!manual()\ntable t1\n[f1]=1\n[f2]=2\noverride\n[f1],[f2]\n,\n,\n,';
      const expectedDsl = '!layout(1, 1)\ntable t1\n[f1]=1\n[f2]=2\r\n';
      setDsl(dsl);

      // Act
      act(() => hook.current.autoCleanUpTableDSL('t1'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Clean up table "t1"`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should remove entire table if remove all fields after clean up', () => {
      // Arrange
      const dsl =
        '!manual()\n!layout(1, 1)\ntable t1\n[f1]\n[f2]\noverride\n[f1],[f2]\n,\n,\n,';
      const expectedDsl = '\r\n';
      setDsl(dsl);

      // Act
      act(() => hook.current.autoCleanUpTableDSL('t1'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(`Clean up table "t1"`, [
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should not modify table', () => {
      // Arrange
      const dsl =
        '!manual()\n!layout(1, 1)\ntable t1\n[f1]\n[f2]\noverride\n[f1],[f2]\n1,2\n3,4';
      setDsl(dsl);

      // Act
      act(() => hook.current.autoCleanUpTableDSL('t1'));

      // Assert
      expect(props.appendToFn).not.toHaveBeenCalled();
      expect(props.manuallyUpdateSheetContent).not.toHaveBeenCalled();
    });
  });

  describe('addTableRowWithConvertToManualTable', () => {
    it('should convert table with one field to manual and add table row', () => {
      // Arrange
      const dsl = 'table t1\n[f1] = 1\n';
      const expectedDsl = '!manual()\ntable t1\n[f1]\noverride\n[f1]\n1\n2\r\n';
      props = { ...initialProps };
      props.viewGridData = {
        getTableData: (tableName: string) => {
          return {
            types: {
              f1: 'STRING',
            },
            nestedColumnNames: new Set(),
          } as any;
        },
      } as ViewGridData;
      Wrapper = createWrapper(props);
      const hookRender = hookTestSetup(useTableModifyDsl, Wrapper);
      const hook = hookRender.result;
      setDsl = hookRender.setDsl;
      setDsl(dsl);

      // Act
      act(() =>
        hook.current.addTableRowWithConvertToManualTable('t1', 'f1', '2')
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Convert table "t1" to manual table and add row`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should convert table with multiple fields to manual and add table row', () => {
      // Arrange
      const dsl = 'table t1\n[f1] = 1\n[f2] = 2\n[f3] = 3\n';
      const expectedDsl =
        '!manual()\ntable t1\n[f1]\n[f2]\n[f3]\noverride\n[f1],[f2],[f3]\n1,2,3\n2,,\r\n';
      props = { ...initialProps };
      props.viewGridData = {
        getTableData: (tableName: string) => {
          return {
            types: {
              f1: 'STRING',
            },
            nestedColumnNames: new Set(),
          } as any;
        },
      } as ViewGridData;
      Wrapper = createWrapper(props);
      const hookRender = hookTestSetup(useTableModifyDsl, Wrapper);
      const hook = hookRender.result;
      setDsl = hookRender.setDsl;
      setDsl(dsl);

      // Act
      act(() =>
        hook.current.addTableRowWithConvertToManualTable('t1', 'f1', '2')
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Convert table "t1" to manual table and add row`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should preserve formula for complex type fields and still add row override', () => {
      // Arrange
      const dsl = 'table t1\n[f1] = T1\n';
      const expectedDsl = '!manual()\ntable t1\n[f1]\noverride\n[f1]\n2\r\n';
      props = { ...initialProps };
      props.viewGridData = {
        getTableData: (tableName: string) => {
          return {
            types: {
              f1: ColumnDataType.TABLE_REFERENCE,
            },
            nestedColumnNames: new Set(),
          } as any;
        },
      } as ViewGridData;
      Wrapper = createWrapper(props);
      const hookRender = hookTestSetup(useTableModifyDsl, Wrapper);
      const hook = hookRender.result;
      setDsl = hookRender.setDsl;
      setDsl(dsl);

      // Act
      act(() =>
        hook.current.addTableRowWithConvertToManualTable('t1', 'f1', '2')
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Convert table "t1" to manual table and add row`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should preserve existing override when present and add new row', () => {
      // Arrange
      const dsl = 'table t1\n[f1]\noverride\n[f1]\n"EXISTING"\n';
      const expectedDsl =
        '!manual()\ntable t1\n[f1]\noverride\n[f1]\n"EXISTING"\n2\r\n';
      props = { ...initialProps };
      props.viewGridData = {
        getTableData: (tableName: string) => {
          return {
            types: {
              f1: 'STRING',
            },
            nestedColumnNames: new Set(),
          } as any;
        },
      } as ViewGridData;
      Wrapper = createWrapper(props);
      const hookRender = hookTestSetup(useTableModifyDsl, Wrapper);
      const hook = hookRender.result;
      setDsl = hookRender.setDsl;
      setDsl(dsl);

      // Act
      act(() =>
        hook.current.addTableRowWithConvertToManualTable('t1', 'f1', '2')
      );

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Convert table "t1" to manual table and add row`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });
});
