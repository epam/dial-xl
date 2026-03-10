import { organizeScatterPlotChartData } from '../scatterPlotChart';
import { makeChartsData, makeGridChart, makeGridChartSection } from './utils';

function pickScatter(result: any) {
  return {
    legendData: result?.legendData,
    xAxisData: result?.xAxisData,
    isNumericXAxis: result?.isNumericXAxis,
    series: Array.isArray(result?.series)
      ? result.series.map((s: any) => ({
          name: s?.name,
          type: s?.type,
          data: s?.data,
        }))
      : [],
  };
}

describe('organizeScatterPlotChartData', () => {
  it('categorical X (custom): builds xAxisData and maps x to category indices', () => {
    // Arrange
    const tableName = 't1';

    const chartData = makeChartsData(tableName, {
      x: {
        rawValues: ['C1', 'C2', 'C1', 'C3'],
        displayValues: ['C1', 'C2', 'C1', 'C3'],
      },
      Y: {
        rawValues: ['1', '2', '3', '4'],
        displayValues: ['1', '2', '3', '4'],
      },
    });

    const gridChart = makeGridChart({
      tableName,
      chartSections: [
        makeGridChartSection({ xAxisFieldName: 'x', valueFieldNames: ['Y'] }),
      ],
    });

    // Act
    const result = organizeScatterPlotChartData(chartData, gridChart);

    // Assert
    expect(result).toBeTruthy();

    const out = pickScatter(result);

    expect(out.isNumericXAxis).toBe(false);
    expect(out.xAxisData).toEqual(['C1', 'C2', 'C3']);
    expect(out.legendData).toEqual(['Y']);
    expect(out.series[0].type).toBe('scatter');
    expect(out.series[0].name).toBe('Y');

    const points = out.series[0].data;

    expect(points.map((p: any) => p.value)).toEqual([
      [0, 1],
      [1, 2],
      [0, 3],
      [2, 4],
    ]);

    expect(points.map((p: any) => p.displayValue)).toEqual([
      ['C1', '1'],
      ['C2', '2'],
      ['C1', '3'],
      ['C3', '4'],
    ]);
  });

  it('numeric X (custom): does not return xAxisData and uses numeric x directly', () => {
    // Arrange
    const tableName = 't1';

    const chartData = makeChartsData(tableName, {
      x: { rawValues: ['10', '20', '30'], displayValues: ['10', '20', '30'] },
      Y: { rawValues: ['1', '2', '3'], displayValues: ['1', '2', '3'] },
    });

    const gridChart = makeGridChart({
      tableName,
      chartSections: [
        makeGridChartSection({ xAxisFieldName: 'x', valueFieldNames: ['Y'] }),
      ],
    });

    // Act
    const result = organizeScatterPlotChartData(chartData, gridChart);

    // Assert
    expect(result).toBeTruthy();

    const out = pickScatter(result);

    expect(out.isNumericXAxis).toBe(true);
    expect(out.xAxisData).toBeUndefined();

    expect(out.legendData).toEqual(['Y']);
    expect(out.series[0].data.map((p: any) => p.value)).toEqual([
      [10, 1],
      [20, 2],
      [30, 3],
    ]);
  });

  it('index X (no custom axis): uses 1..N as x values; categorical unless all numeric', () => {
    // Arrange
    const tableName = 't1';

    const chartData = makeChartsData(tableName, {
      Y: { rawValues: ['5', '6'], displayValues: ['5', '6'] },
    });

    const gridChart = makeGridChart({
      tableName,
      chartSections: [makeGridChartSection({ valueFieldNames: ['Y'] })],
    });

    // Act
    const result = organizeScatterPlotChartData(chartData, gridChart);

    // Assert
    expect(result).toBeTruthy();

    const out = pickScatter(result);
    expect(out.isNumericXAxis).toBe(true);
    expect(out.xAxisData).toBeUndefined();
    expect(out.legendData).toEqual(['Y']);
    expect(out.series[0].data.map((p: any) => p.value)).toEqual([
      [1, 5],
      [2, 6],
    ]);
  });

  it('multiple sections: legendData includes all valueFieldNames', () => {
    // Arrange
    const tableName = 't1';

    const chartData = makeChartsData(tableName, {
      x1: { rawValues: ['B', 'A'], displayValues: ['B', 'A'] },
      x2: { rawValues: ['C'], displayValues: ['C'] },

      Y1: { rawValues: ['1', '2'], displayValues: ['1', '2'] },
      Y2: { rawValues: ['3'], displayValues: ['3'] },
    });

    const gridChart = makeGridChart({
      tableName,
      chartSections: [
        makeGridChartSection({ xAxisFieldName: 'x1', valueFieldNames: ['Y1'] }),
        makeGridChartSection({ xAxisFieldName: 'x2', valueFieldNames: ['Y2'] }),
      ],
    });

    // Act
    const result = organizeScatterPlotChartData(chartData, gridChart);

    // Assert
    expect(result).toBeTruthy();

    const out = pickScatter(result);

    expect(out.isNumericXAxis).toBe(false);
    expect(out.xAxisData).toEqual(['B', 'A', 'C']);
    expect(out.legendData).toEqual(['Y1', 'Y2']);
    expect(out.series.map((s: any) => s.name)).toEqual(['Y1', 'Y2']);
    expect(out.series[0].data.map((p: any) => p.value)).toEqual([
      [0, 1],
      [1, 2],
    ]);
    expect(out.series[1].data.map((p: any) => p.value)).toEqual([[2, 3]]);
  });
});
