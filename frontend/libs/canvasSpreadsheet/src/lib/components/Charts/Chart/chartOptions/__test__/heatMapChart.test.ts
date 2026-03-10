import { organizeHeatMapChartData } from '../heatMapChart';
import { makeChartsData, makeGridChart, makeGridChartSection } from './utils';

function pickHeatmap(result: any) {
  return {
    xAxisData: result?.xAxisData,
    yAxisData: result?.yAxisData,
    seriesData: result?.seriesData,
    showVisualMap: result?.showVisualMap,
    visualMapMax: result?.visualMapMax,
  };
}

describe('organizeHeatMapChartData', () => {
  it('vertical: uses valueFieldNames as xAxisData and row labels as yAxisData', () => {
    // Arrange
    const tableName = 't1';

    const chartData = makeChartsData(tableName, {
      x: { rawValues: ['r1', 'r2'], displayValues: ['Row1', 'Row2'] },
      A: { rawValues: ['1', '2'], displayValues: ['1', '2'] },
      B: { rawValues: ['10', '20'], displayValues: ['10', '20'] },
    });

    const gridChart = makeGridChart({
      tableName,
      showVisualMap: true,
      chartOrientation: 'vertical',
      chartSections: [
        makeGridChartSection({
          xAxisFieldName: 'x',
          valueFieldNames: ['A', 'B'],
        }),
      ],
    });

    // Act
    const result = organizeHeatMapChartData(chartData, gridChart);

    // Assert
    expect(result).toBeTruthy();

    const out = pickHeatmap(result);

    expect(out.showVisualMap).toBe(true);
    expect(out.xAxisData).toEqual(['A', 'B']);
    expect(out.yAxisData).toEqual(['Row1', 'Row2']);

    expect(out.seriesData).toEqual([
      [0, 0, 1, '1'],
      [1, 0, 10, '10'],
      [0, 1, 2, '2'],
      [1, 1, 20, '20'],
    ]);
  });

  it('vertical: falls back to index row labels when xAxisFieldName is missing', () => {
    // Arrange
    const tableName = 't1';

    const chartData = makeChartsData(tableName, {
      A: { rawValues: ['1', '2', '3'], displayValues: ['1', '2', '3'] },
      B: { rawValues: ['4', '5', '6'], displayValues: ['4', '5', '6'] },
    });

    const gridChart = makeGridChart({
      tableName,
      showVisualMap: false,
      chartOrientation: 'vertical',
      chartSections: [makeGridChartSection({ valueFieldNames: ['A', 'B'] })],
    });

    // Act
    const result = organizeHeatMapChartData(chartData, gridChart);

    // Assert
    expect(result).toBeTruthy();
    const out = pickHeatmap(result);

    expect(out.xAxisData).toEqual(['A', 'B']);
    expect(out.yAxisData).toEqual(['1', '2', '3']);
  });

  it('horizontal: xAxisData uses SORTED row labels, yAxisData is valueFieldNames', () => {
    // Arrange
    const tableName = 't1';

    const chartData = makeChartsData(tableName, {
      x: { rawValues: ['B', 'A'], displayValues: ['B1', 'A1'] },
      A: { rawValues: ['1', '2'], displayValues: ['1', '2'] },
      B: { rawValues: ['10', '20'], displayValues: ['10', '20'] },
    });

    const gridChart = makeGridChart({
      tableName,
      showVisualMap: true,
      chartOrientation: 'horizontal',
      chartSections: [
        makeGridChartSection({
          xAxisFieldName: 'x',
          valueFieldNames: ['A', 'B'],
        }),
      ],
    });

    // Act
    const result = organizeHeatMapChartData(chartData, gridChart);

    // Assert
    expect(result).toBeTruthy();
    const out = pickHeatmap(result);

    expect(out.xAxisData).toEqual(['B1', 'A1']);
    expect(out.yAxisData).toEqual(['A', 'B']);
    expect(out.seriesData).toHaveLength(4);
    expect(out.seriesData).toEqual([
      [0, 0, 1, '1'],
      [0, 1, 10, '10'],
      [1, 0, 2, '2'],
      [1, 1, 20, '20'],
    ]);
  });
});
