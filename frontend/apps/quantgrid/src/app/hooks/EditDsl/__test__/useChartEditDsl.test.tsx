import { ChartType } from '@frontend/common';
import { act, RenderHookResult } from '@testing-library/react';

import { useChartEditDsl } from '../useChartEditDsl';
import { hookTestSetup } from './hookTestSetup';
import { RenderProps, TestWrapperProps } from './types';

const initialProps: TestWrapperProps = {
  appendToFn: jest.fn(),
  manuallyUpdateSheetContent: jest.fn(() => Promise.resolve(true)),
  projectName: 'project1',
  sheetName: 'sheet1',
};

describe('useChartEditDsl', () => {
  let props: TestWrapperProps;
  let hook: RenderHookResult<
    ReturnType<typeof useChartEditDsl>,
    { dsl: string }
  >['result'];
  let rerender: (props?: RenderProps) => void;

  beforeEach(() => {
    props = { ...initialProps };
    jest.clearAllMocks();

    const hookRender = hookTestSetup(useChartEditDsl, props);

    hook = hookRender.result;
    rerender = hookRender.rerender;
  });

  describe('chartResize', () => {
    it('should resize chart', () => {
      // Arrange
      const dsl = '!visualization("line-chart")\n!size(7, 7)\ntable t1 [f1]=1';
      const expectedDsl =
        '!visualization("line-chart")\n!size(20, 15)\ntable t1 [f1]=1\r\n';
      rerender({ dsl });

      // Act
      act(() => hook.current.chartResize('t1', 15, 20));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Resize chart "t1" to (20, 15)`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should create size decorator if missing', async () => {
      // Arrange
      const dsl = '!visualization("line-chart")\ntable t1 [f1]=1';
      const expectedDsl =
        '!visualization("line-chart")\n!size(20, 10)\ntable t1 [f1]=1\r\n';
      rerender({ dsl });

      // Act
      act(() => hook.current.chartResize('t1', 10, 20));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Resize chart "t1" to (20, 10)`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('updateSelectorValue', () => {
    it('should update only the current field selector value when hasNoData = false', () => {
      // Arrange
      const dsl = `!layout(1,1)\ntable t1\n!selector(10)\n[f1]=1\n!layout(2,1)\ntable t2\n!selector(20)\n[f2]=2`;
      const expectedDsl = `!layout(1,1)\ntable t1\n!selector(99)\n[f1]=1\n!layout(2,1)\ntable t2\n!selector(20)\n[f2]=2\r\n`;
      rerender({ dsl });

      // Act
      act(() => hook.current.updateSelectorValue('t1', 'f1', 99, false));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Update selector for the chart t1[f1]`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should clear all selectors and update the current field selector value when hasNoData = true', () => {
      // Arrange
      const dsl = `!layout(1,1)\ntable t1\n!selector(10)\n[f1]=1\n!selector(20)\n[f2]=2\n!selector(30)\n[f3]=3\n!layout(2,1)\ntable t2\n!selector(20)\n[f2]=2`;
      const expectedDsl = `!layout(1,1)\ntable t1\n!selector(33)\n[f1]=1\n!selector()\n[f2]=2\n!selector()\n[f3]=3\n!layout(2,1)\ntable t2\n!selector(20)\n[f2]=2\r\n`;
      rerender({ dsl });

      // Act
      act(() => hook.current.updateSelectorValue('t1', 'f1', 33, true));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Update selector for the chart t1[f1]`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('addChart', () => {
    it('should create chart based on table', () => {
      // Arrange
      const dsl =
        '!layout(17,4,"title","headers")\ntable t1\ndim [stat]=RANGE(10)\n[f1]=[stat] ^ 2';
      const expectedDsl =
        '!layout(17,4,"title","headers")\ntable t1\ndim [stat]=RANGE(10)\n[f1]=[stat] ^ 2\r\n\n' +
        `!layout(17, 7, "title", "headers")\n!visualization("line-chart")\ntable 't1_line-chart'\n  dim [source] = t1\n  [stat] = [source][stat]\n  [f1] = [source][f1]\r\n`;
      rerender({ dsl });

      // Act
      act(() => hook.current.addChart('t1', ChartType.LINE));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Add chart "t1_line-chart"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('updateChartSections', () => {
    it('should update chart sections according changes', () => {
      // Arrange
      const dsl =
        'table t1\n  [a] = 1\n  [b] = 2\n  !separator()\n  [c] = 3\n  [d] = 4';
      const expectedDsl = `table t1\n  [c] = 3\n  [a] = 1\n  [b] = 2\n  !separator()\n  [d] = 4\r\n`;
      const updatedSections = {
        group1: ['c', 'a', 'b'],
        group2: ['d'],
      };
      rerender({ dsl });

      // Act
      act(() => hook.current.updateChartSections('t1', updatedSections));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Update chart sections for t1`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should update chart sections when move field to the start of the section', () => {
      // Arrange
      const dsl =
        'table t1\n  [c] = 3\n  [a] = 1\n  [b] = 2\n  !separator()\n  [d] = 4';
      const expectedDsl = `table t1\n  [a] = 1\n  [b] = 2\n  !separator()\n  [c] = 3\n  [d] = 4\r\n`;
      const updatedSections = {
        group1: ['a', 'b'],
        group2: ['c', 'd'],
      };
      rerender({ dsl });

      // Act
      act(() => hook.current.updateChartSections('t1', updatedSections));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Update chart sections for t1`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('selectTableForChart', () => {
    it('should copy source table fields to chart table', () => {
      // Arrange
      const dsl =
        'table t1\n  [a]=1\n  [b]=2\n  [c]=3\n\n  !visualization("line-chart")\ntable t2\n';
      const expectedDsl = `table t1\n  [a]=1\n  [b]=2\n  [c]=3\n\n  !visualization("line-chart")\ntable t2\n  dim [source] = t1\n  [a] = [source][a]\n  [b] = [source][b]\n  [c] = [source][c]\r\n`;

      rerender({ dsl });

      // Act
      act(() => hook.current.selectTableForChart('t1', 't2'));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Select table "t1" for chart "t2"`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );
      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });

  describe('setChartType', () => {
    it('should convert chart table to chart', () => {
      // Arrange
      const dsl = '!layout(1, 2, "title", "headers")\ntable t1 [f1]=1';
      const expectedDsl =
        '!layout(1, 2, "title", "headers")\n!visualization("line-chart")\ntable t1 [f1]=1\r\n';
      rerender({ dsl });

      // Act
      act(() => hook.current.setChartType('t1', ChartType.LINE));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Convert table t1 to chart`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );

      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });

    it('should change chart type', () => {
      // Arrange
      const dsl =
        '!layout(1, 2, "title", "headers")\n!visualization("line-chart")\ntable t1 [f1]=1';
      const expectedDsl =
        '!layout(1, 2, "title", "headers")\n!visualization("scatter-plot")\ntable t1 [f1]=1\r\n';
      rerender({ dsl });

      // Act
      act(() => hook.current.setChartType('t1', ChartType.SCATTER_PLOT));

      // Assert
      expect(props.appendToFn).toHaveBeenCalledWith(
        `Change chart t1 type to scatter-plot`,
        [{ sheetName: props.sheetName, content: expectedDsl }]
      );

      expect(props.manuallyUpdateSheetContent).toHaveBeenCalledWith([
        { sheetName: props.sheetName, content: expectedDsl },
      ]);
    });
  });
});
