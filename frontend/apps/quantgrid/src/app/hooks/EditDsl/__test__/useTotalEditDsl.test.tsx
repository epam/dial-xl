import { act, RenderHookResult } from '@testing-library/react';

import { ViewGridData } from '../../../context';
import { useTotalEditDsl } from '../useTotalEditDsl';
import { createWrapper, initialProps } from './createWrapper';
import { hookTestSetup } from './hookTestSetup';
import { RenderProps, TestWrapperProps } from './types';

describe('useTotalEditDsl', () => {
  let props: TestWrapperProps = { ...initialProps };
  let hook: RenderHookResult<
    ReturnType<typeof useTotalEditDsl>,
    { dsl: string }
  >['result'];
  let setDsl: (dsl: string) => void;
  let Wrapper: React.FC<React.PropsWithChildren>;

  beforeAll(() => {
    Wrapper = createWrapper(props);
  });

  beforeEach(() => {
    jest.clearAllMocks();

    const hookRender = hookTestSetup(useTotalEditDsl, Wrapper);
    hook = hookRender.result;
    setDsl = hookRender.setDsl;
  });

  describe('removeTotalByIndex', () => {
    it('should remove particular field total', () => {
      // Arrange
      const dsl =
        'table t1 [f1]=1 [f2]=2\ntotal\n[f1] = SUM(t1[f1])\n[f2] = AVERAGE(t1[f2])\ntotal\n[f1] = SUM(t1[f1])\n[f2] = MAX(t1[f2])';
      const expectedDsl =
        'table t1 [f1]=1 [f2]=2\ntotal\n[f1] = SUM(t1[f1])\n[f2] = AVERAGE(t1[f2])\ntotal\n[f2] = MAX(t1[f2])\r\n';
      setDsl(dsl);

      // Act
      act(() => hook.current.removeTotalByIndex('t1', 'f1', 2));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should remove entire total if remove last field total', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\ntotal\n[f1] = SUM(t1[f1])';
      const expectedDsl = 'table t1 [f1]=1\r\n';
      setDsl(dsl);

      // Act
      act(() => hook.current.removeTotalByIndex('t1', 'f1', 1));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('addTotalExpression', () => {
    it('should add field total in the given row', () => {
      // Arrange
      const dsl =
        'table t1 [f1]=1\n[f2]=2\ntotal\n[f1] = SUM(t1[f1])\n[f2] = AVERAGE(t1[f2])\ntotal\n[f1] = MODE(t1[f1])';
      const expectedDsl =
        'table t1 [f1]=1\n[f2]=2\ntotal\n[f1] = SUM(t1[f1])\n[f2] = AVERAGE(t1[f2])\ntotal\n[f1] = MODE(t1[f1])\r\n  [f2] = SUM(t1[f2])\r\n';
      setDsl(dsl);

      // Act
      act(() => hook.current.addTotalExpression('t1', 'f2', 2, 'SUM(t1[f2])'));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('editTotalExpression', () => {
    it('should edit field total in the given row', () => {
      // Arrange
      const dsl =
        'table t1 [f1]=1\n[f2]=2\ntotal\n[f1] = SUM(t1[f1])\n[f2] = AVERAGE(t1[f2])\ntotal\n[f1] = MODE(t1[f1])\n[f2] = SUM(t1[f2])';
      const expectedDsl =
        'table t1 [f1]=1\n[f2]=2\ntotal\n[f1] = SUM(t1[f1])\n[f2] = AVERAGE(t1[f2])\ntotal\n[f1] = MODE(t1[f1])\n[f2] = MAX(t1[f2])\r\n';
      setDsl(dsl);

      // Act
      act(() => hook.current.editTotalExpression('t1', 'f2', 2, 'MAX(t1[f2])'));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('toggleTotalByType', () => {
    it('should add new field total', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1';
      const expectedDsl = 'table t1 [f1]=1\r\ntotal\n  [f1] = SUM(t1[f1])\r\n';
      setDsl(dsl);

      // Act
      act(() => hook.current.toggleTotalByType('t1', 'f1', 'sum'));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add new field total to the existing total row', () => {
      // Arrange
      const dsl =
        'table t1 [f1]=1\n[f2]=2\ntotal\n[f1] = SUM(t1[f1])\n[f2] = AVERAGE(t1[f2])\ntotal\n[f2] = MAX(t1[f2])';
      const expectedDsl =
        'table t1 [f1]=1\n[f2]=2\ntotal\n[f1] = SUM(t1[f1])\n[f2] = AVERAGE(t1[f2])\ntotal\n[f2] = MAX(t1[f2])\r\n  [f1] = MODE(t1[f1])\r\n';
      setDsl(dsl);

      // Act
      act(() => hook.current.toggleTotalByType('t1', 'f1', 'mode'));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add new total row with a new total', () => {
      // Arrange
      const dsl =
        'table t1 [f1]=1\n[f2]=2\ntotal\n[f1] = SUM(t1[f1])\n[f2] = AVERAGE(t1[f2])\ntotal\n[f2] = MAX(t1[f2])\n[f1] = MODE(t1[f1])';
      const expectedDsl =
        'table t1 [f1]=1\n[f2]=2\ntotal\n[f1] = SUM(t1[f1])\n[f2] = AVERAGE(t1[f2])\ntotal\n[f2] = MAX(t1[f2])\n[f1] = MODE(t1[f1])\r\ntotal\n  [f2] = MIN(t1[f2])\r\n';
      setDsl(dsl);

      // Act
      act(() => hook.current.toggleTotalByType('t1', 'f2', 'min'));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add another custom total', () => {
      // Arrange
      const dsl =
        'table t1 [f1]=1\n[f2]=2\ntotal\n[f1] = SUM(t1[f1])\n[f2] = SUM(t1[f2]) + 1\ntotal\n[f2] = MAX(t1[f2])\n[f1] = MODE(t1[f1])';
      const expectedDsl =
        'table t1 [f1]=1\n[f2]=2\ntotal\n[f1] = SUM(t1[f1])\n[f2] = SUM(t1[f2]) + 1\ntotal\n[f2] = MAX(t1[f2])\n[f1] = MODE(t1[f1])\r\ntotal\n  [f2] = NA\r\n';
      setDsl(dsl);

      // Act
      act(() => hook.current.toggleTotalByType('t1', 'f2', 'custom'));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('removeTotalByType', () => {
    it('should remove single field total of particular type', () => {
      // Arrange
      const dsl =
        'table t1 [f1]=1 [f2]=2\ntotal\n[f1] = SUM(t1[f1])\n[f2] = AVERAGE(t1[f2])\ntotal\n[f1] = MODE(t1[f1])\n[f2] = MAX(t1[f2])';
      const expectedDsl =
        'table t1 [f1]=1 [f2]=2\ntotal\n[f2] = AVERAGE(t1[f2])\ntotal\n[f1] = MODE(t1[f1])\n[f2] = MAX(t1[f2])\r\n';
      setDsl(dsl);

      // Act
      act(() => hook.current.removeTotalByType('t1', 'f1', 'sum'));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should remove all field totals of particular type', () => {
      // Arrange
      const dsl =
        'table t1 [f1]=1 [f2]=2\ntotal\n[f1] = SUM(t1[f1])\n[f2] = AVERAGE(t1[f2])\ntotal\n[f1] = SUM(t1[f1])\n[f2] = MAX(t1[f2])';
      const expectedDsl =
        'table t1 [f1]=1 [f2]=2\ntotal\n[f2] = AVERAGE(t1[f2])\ntotal\n[f2] = MAX(t1[f2])\r\n';
      setDsl(dsl);

      // Act
      act(() => hook.current.removeTotalByType('t1', 'f1', 'sum'));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should remove entire total section when remove last total', () => {
      // Arrange
      const dsl = 'table t1 [f1]=1\ntotal\n[f1] = SUM(t1[f1])';
      const expectedDsl = 'table t1 [f1]=1\r\n';
      setDsl(dsl);

      // Act
      act(() => hook.current.removeTotalByType('t1', 'f1', 'sum'));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('addAllFieldTotals', () => {
    it('should add all field totals for text field', () => {
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
      const hookRender = hookTestSetup(useTotalEditDsl, Wrapper);
      hook = hookRender.result;
      setDsl = hookRender.setDsl;

      // Arrange
      const dsl = '!layout(1,1)\ntable t1\n[f1]="text"';
      const expectedDsl = `!layout(1,1)\ntable t1\n[f1]="text"\r\ntotal\n  [f1] = COUNT(t1[f1])\ntotal\n  [f1] = MIN(t1[f1])\ntotal\n  [f1] = MAX(t1[f1])\r\n`;
      setDsl(dsl);

      // Act
      act(() => hook.current.addAllFieldTotals('t1', 'f1'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add all totals to t1[f1]`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );

      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add rest of totals to a field if some totals already exists', () => {
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
      const hookRender = hookTestSetup(useTotalEditDsl, Wrapper);
      hook = hookRender.result;
      setDsl = hookRender.setDsl;

      // Arrange
      const dsl =
        '!layout(1,1)\ntable t1\n[f1]="text"\ntotal\n[f1] = MIN(t1[f1])';
      const expectedDsl = `!layout(1,1)\ntable t1\n[f1]="text"\ntotal\n[f1] = MIN(t1[f1])\r\ntotal\n  [f1] = COUNT(t1[f1])\ntotal\n  [f1] = MAX(t1[f1])\r\n`;
      setDsl(dsl);

      // Act
      act(() => hook.current.addAllFieldTotals('t1', 'f1'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add all totals to t1[f1]`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );

      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add all field totals for numeric field', () => {
      props = { ...initialProps };
      props.viewGridData = {
        getTableData: (tableName: string) => {
          return {
            types: {
              f1: 'DOUBLE',
            },
            nestedColumnNames: new Set(),
          } as any;
        },
      } as ViewGridData;
      Wrapper = createWrapper(props);
      const hookRender = hookTestSetup(useTotalEditDsl, Wrapper);
      hook = hookRender.result;
      setDsl = hookRender.setDsl;

      // Arrange
      const dsl = '!layout(1,1)\ntable t1\n[f1]=1';
      const expectedDsl = `!layout(1,1)\ntable t1\n[f1]=1\r\ntotal\n  [f1] = COUNT(t1[f1])\ntotal\n  [f1] = MIN(t1[f1])\ntotal\n  [f1] = MAX(t1[f1])\ntotal\n  [f1] = AVERAGE(t1[f1])\ntotal\n  [f1] = STDEVS(t1[f1])\r\n`;
      setDsl(dsl);

      // Act
      act(() => hook.current.addAllFieldTotals('t1', 'f1'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add all totals to t1[f1]`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );

      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add all totals to a table field', () => {
      props = { ...initialProps };
      props.viewGridData = {
        getTableData: (tableName: string) => {
          return {
            types: {
              f1: 'TABLE_REFERENCE',
            },
            nestedColumnNames: new Set(),
          } as any;
        },
      } as ViewGridData;
      Wrapper = createWrapper(props);
      const hookRender = hookTestSetup(useTotalEditDsl, Wrapper);
      hook = hookRender.result;
      setDsl = hookRender.setDsl;

      // Arrange
      const dsl = '!layout(1,1)\ntable t1\n[f1]=RANGE(10)';
      const expectedDsl = `!layout(1,1)\ntable t1\n[f1]=RANGE(10)\r\ntotal\n  [f1] = COUNT(t1[f1])\r\n`;
      setDsl(dsl);

      // Act
      act(() => hook.current.addAllFieldTotals('t1', 'f1'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add all totals to t1[f1]`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );

      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });
});
