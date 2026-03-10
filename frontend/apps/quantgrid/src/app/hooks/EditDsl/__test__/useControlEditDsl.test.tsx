import { vi } from 'vitest';

import { act, RenderHookResult } from '@testing-library/react';

import { ViewGridData } from '../../../context';
import { useControlEditDsl } from '../useControlEditDsl';
import { createWrapper, initialProps } from './createWrapper';
import { hookTestSetup } from './hookTestSetup';
import { TestWrapperProps } from './types';

describe('useControlEditDsl', () => {
  let props: TestWrapperProps = { ...initialProps };
  let hook: RenderHookResult<
    ReturnType<typeof useControlEditDsl>,
    { dsl: string }
  >['result'];
  let setDsl: (dsl: string) => void;
  let Wrapper: React.FC<React.PropsWithChildren>;

  beforeAll(() => {
    Wrapper = createWrapper(props);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    const hookRender = hookTestSetup(useControlEditDsl, Wrapper);
    hook = hookRender.result;
    setDsl = hookRender.setDsl;
  });

  describe('updateSelectedControlValue', () => {
    it('should add string value to the dropdown control', () => {
      // Arrange
      const dsl = 'table t1 [f1] = DROPDOWN(Data, Data[value], )';
      const expectedDsl =
        'table t1 [f1] = DROPDOWN(Data, Data[value], "APPLE")\r\n';
      props = { ...initialProps };
      props.viewGridData = {
        getTableData: (tableName: string) => {
          return {
            types: {
              f1: 'STRING',
            },
          } as any;
        },
      } as ViewGridData;
      Wrapper = createWrapper(props);
      const hookRender = hookTestSetup(useControlEditDsl, Wrapper);
      const hook = hookRender.result;
      setDsl = hookRender.setDsl;
      setDsl(dsl);

      // Act
      act(() => hook.current.updateSelectedControlValue('t1', 'f1', ['APPLE']));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add number values to the checkbox control', () => {
      // Arrange
      const dsl = 'table t1 [f1] = CHECKBOX(Data, Data[value], )';
      const expectedDsl =
        'table t1 [f1] = CHECKBOX(Data, Data[value], {1, 10})\r\n';
      props = { ...initialProps };
      props.viewGridData = {
        getTableData: (tableName: string) => {
          return {
            types: {
              f1: 'DOUBLE',
            },
          } as any;
        },
      } as ViewGridData;
      Wrapper = createWrapper(props);
      const hookRender = hookTestSetup(useControlEditDsl, Wrapper);
      const hook = hookRender.result;
      setDsl = hookRender.setDsl;
      setDsl(dsl);

      // Act
      act(() =>
        hook.current.updateSelectedControlValue('t1', 'f1', ['1', '10']),
      );

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add string values to the checkbox control', () => {
      // Arrange
      const dsl = 'table t1 [f1] = CHECKBOX(Data, Data[value], )';
      const expectedDsl =
        'table t1 [f1] = CHECKBOX(Data, Data[value], {"APPLE", "IBM"})\r\n';
      props = { ...initialProps };
      props.viewGridData = {
        getTableData: (tableName: string) => {
          return {
            types: {
              f1: 'STRING',
            },
          } as any;
        },
      } as ViewGridData;
      Wrapper = createWrapper(props);
      const hookRender = hookTestSetup(useControlEditDsl, Wrapper);
      const hook = hookRender.result;
      setDsl = hookRender.setDsl;
      setDsl(dsl);

      // Act
      act(() =>
        hook.current.updateSelectedControlValue('t1', 'f1', ['APPLE', 'IBM']),
      );

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should clear checkbox control value', () => {
      // Arrange
      const dsl =
        'table t1 [f1] = CHECKBOX(Data, Data[value], {"APPLE", "IBM"})';
      const expectedDsl = 'table t1 [f1] = CHECKBOX(Data, Data[value], )\r\n';
      props = { ...initialProps };
      props.viewGridData = {
        getTableData: (tableName: string) => {
          return {
            types: {
              f1: 'STRING',
            },
          } as any;
        },
      } as ViewGridData;
      Wrapper = createWrapper(props);
      const hookRender = hookTestSetup(useControlEditDsl, Wrapper);
      const hook = hookRender.result;
      setDsl = hookRender.setDsl;
      setDsl(dsl);

      // Act
      act(() => hook.current.updateSelectedControlValue('t1', 'f1', []));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should clear dropdown control value', () => {
      // Arrange
      const dsl = 'table t1 [f1] = DROPDOWN(Data, Data[value], "APPLE")';
      const expectedDsl = 'table t1 [f1] = DROPDOWN(Data, Data[value], )\r\n';
      props = { ...initialProps };
      props.viewGridData = {
        getTableData: (tableName: string) => {
          return {
            types: {
              f1: 'STRING',
            },
          } as any;
        },
      } as ViewGridData;
      Wrapper = createWrapper(props);
      const hookRender = hookTestSetup(useControlEditDsl, Wrapper);
      const hook = hookRender.result;
      setDsl = hookRender.setDsl;
      setDsl(dsl);

      // Act
      act(() => hook.current.updateSelectedControlValue('t1', 'f1', []));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should add string value to the dropdown control with data from the manual list', () => {
      // Arrange
      const dsl = 'table t1 [f1] = DROPDOWN(, {"APPLE","IBM"},)';
      const expectedDsl =
        'table t1 [f1] = DROPDOWN(, {"APPLE","IBM"},"APPLE")\r\n';
      props = { ...initialProps };
      props.viewGridData = {
        getTableData: (tableName: string) => {
          return {
            types: {
              f1: 'STRING',
            },
          } as any;
        },
      } as ViewGridData;
      Wrapper = createWrapper(props);
      const hookRender = hookTestSetup(useControlEditDsl, Wrapper);
      const hook = hookRender.result;
      setDsl = hookRender.setDsl;
      setDsl(dsl);

      // Act
      act(() => hook.current.updateSelectedControlValue('t1', 'f1', ['APPLE']));

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('createControl', () => {
    it('should add table with two controls', () => {
      // Arrange
      const dsl = '';
      const expectedDsl =
        '!layout(1, 1, "headers")\n!control()\ntable t1\n  [f1] = DROPDOWN(, Data[value], )\n  [f2] = CHECKBOX(Data, Data[value], )\r\n';
      setDsl(dsl);

      // Act
      act(() =>
        hook.current.createControl('t1', 1, 1, [
          {
            type: 'dropdown',
            valueTable: 'Data',
            valueField: 'value',
            name: 'f1',
          },
          {
            type: 'checkbox',
            valueTable: 'Data',
            valueField: 'value',
            name: 'f2',
            dependency: 'Data',
          },
        ]),
      );

      // Assert
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });
});
