import { chartRowNumberSelector } from '@frontend/common';

import { organizePieChartData } from '../pieChart';
import {
  makeChartsData,
  makeField,
  makeGridChart,
  makeGridChartSection,
  pickCommonOrganized,
} from './utils';

export function pickPie(result: any) {
  const s0 = result?.series?.[0];

  return {
    legendData: result?.legendData,
    seriesType: s0?.type,
    seriesData: s0?.data,
  };
}

describe('organizePieChartData', () => {
  it('vertical: uses selected row index and builds slices from valueFieldNames', () => {
    // Arrange
    const tableName = 't1';
    const chartData = makeChartsData(tableName, {
      A: makeField([1, 10], ['1', '10']),
      B: makeField([2, 20], ['2', '20']),
    });

    const gridChart = makeGridChart({
      tableName,
      chartOrientation: 'vertical',
      chartSections: [makeGridChartSection({ valueFieldNames: ['A', 'B'] })],
      selectedKeys: { [chartRowNumberSelector]: '2' },
    });

    // Act
    const result = organizePieChartData(chartData, gridChart);

    // Assert
    expect(result).toBeTruthy();

    const out = pickCommonOrganized(result);
    expect(out.legendData).toEqual(['A', 'B']);
    expect(out.series[0].type).toBe('pie');
    expect(out.series[0].data).toEqual([
      { name: 'A', value: 10, displayValue: '10' },
      { name: 'B', value: 20, displayValue: '20' },
    ]);
  });

  it('horizontal: uses custom xAxisFieldName labels + dotColorFieldName html colors', () => {
    // Arrange
    const tableName = 't1';
    const chartData = makeChartsData(tableName, {
      x: makeField(['C1', 'C2', 'C3'], ['C1 D', 'C2 D', 'C3 D']),
      Sales: makeField([1, 2, 3], ['1', '2', '3']),
      colors: makeField(['#ff0000', '#00ff00', '#0000ff']),
    });

    const gridChart = makeGridChart({
      tableName,
      chartOrientation: 'horizontal',
      selectedKeys: { [chartRowNumberSelector]: '2' },
      chartSections: [
        makeGridChartSection({
          valueFieldNames: ['Sales'],
          xAxisFieldName: 'x',
          dotColorFieldName: 'colors',
        }),
      ],
    });

    // Act
    const result = organizePieChartData(chartData, gridChart);

    // Assert
    expect(result).toBeTruthy();

    const out = pickCommonOrganized(result);
    expect(out.legendData).toEqual(['C1 D', 'C2 D', 'C3 D']);

    expect(out.series[0].data).toEqual([
      {
        name: 'C1 D',
        displayName: 'C1 D',
        rawName: 'C1',
        value: 1,
        itemStyle: { color: '#ff0000' },
        displayValue: '1',
      },
      {
        name: 'C2 D',
        displayName: 'C2 D',
        rawName: 'C2',
        value: 2,
        itemStyle: { color: '#00ff00' },
        displayValue: '2',
      },
      {
        name: 'C3 D',
        displayName: 'C3 D',
        rawName: 'C3',
        value: 3,
        itemStyle: { color: '#0000ff' },
        displayValue: '3',
      },
    ]);
  });

  it('horizontal: without xAxisFieldName uses index labels "1..N" and customSeriesColors by raw label', () => {
    // Arrange
    const tableName = 't1';
    const chartData = makeChartsData(tableName, {
      Profit: makeField([10, 20, 30], ['10', '20', '30']),
    });

    const gridChart = makeGridChart({
      tableName,
      chartOrientation: 'horizontal',
      selectedKeys: { [chartRowNumberSelector]: '2' },
      customSeriesColors: {
        '1': '#111111',
        '2': '#222222',
        '3': '#333333',
      },
      chartSections: [makeGridChartSection({ valueFieldNames: ['Profit'] })],
    });

    // Act
    const result = organizePieChartData(chartData, gridChart);

    // Assert
    expect(result).toBeTruthy();

    const out = pickCommonOrganized(result);
    expect(out.legendData).toEqual(['1', '2', '3']);
    expect(out.series[0].data).toEqual([
      {
        name: '1',
        displayName: '1',
        rawName: '1',
        value: 10,
        itemStyle: { color: '#111111' },
        displayValue: '10',
      },
      {
        name: '2',
        displayName: '2',
        rawName: '2',
        value: 20,
        itemStyle: { color: '#222222' },
        displayValue: '20',
      },
      {
        name: '3',
        displayName: '3',
        rawName: '3',
        value: 30,
        itemStyle: { color: '#333333' },
        displayValue: '30',
      },
    ]);
  });

  it('horizontal: skips non-numeric values (NaN) in columnValues', () => {
    // Arrange
    const tableName = 't1';
    const chartData = makeChartsData(tableName, {
      x: makeField(['A', 'B', 'C'], ['A', 'B', 'C']),
      Sales: makeField(['1', 'oops', '3'], ['1', 'oops', '3']),
      colors: makeField(['#ff0000', '#00ff00', '#0000ff']),
    });

    const gridChart = makeGridChart({
      tableName,
      chartOrientation: 'horizontal',
      selectedKeys: { [chartRowNumberSelector]: '2' },
      chartSections: [
        makeGridChartSection({
          valueFieldNames: ['Sales'],
          xAxisFieldName: 'x',
          dotColorFieldName: 'colors',
        }),
      ],
    });

    // Act
    const result = organizePieChartData(chartData, gridChart);

    // Assert
    expect(result).toBeTruthy();

    const out = pickCommonOrganized(result);
    expect(out.legendData).toEqual(['A', 'C']);
    expect(out.series[0].data).toEqual([
      {
        name: 'A',
        displayName: 'A',
        rawName: 'A',
        value: 1,
        itemStyle: { color: '#ff0000' },
        displayValue: '1',
      },
      {
        name: 'C',
        displayName: 'C',
        rawName: 'C',
        value: 3,
        itemStyle: { color: '#0000ff' },
        displayValue: '3',
      },
    ]);
  });

  it('horizontal: keeps duplicate X labels in table order by making slice names unique', () => {
    // Arrange
    const tableName = 't1';

    const chartData = makeChartsData(tableName, {
      x: {
        rawValues: ['C1', 'C2', 'C1', 'C3'],
        displayValues: ['C1', 'C2', 'C1', 'C3'],
      },
      Sales: {
        rawValues: ['1', '2', '3', '4'],
        displayValues: ['1', '2', '3', '4'],
      },
    });

    const gridChart = makeGridChart({
      tableName,
      chartOrientation: 'horizontal',
      selectedKeys: { [chartRowNumberSelector]: '1' },
      chartSections: [
        makeGridChartSection({
          valueFieldNames: ['Sales'],
          xAxisFieldName: 'x',
        }),
      ],
    });

    // Act
    const result = organizePieChartData(chartData, gridChart);

    // Assert
    expect(result).toBeTruthy();

    const out = pickPie(result);

    expect(out.legendData).toEqual(['C1', 'C2', `C1\u200B`, 'C3']);
    expect(out.seriesType).toBe('pie');
    expect(out.seriesData).toHaveLength(4);
    expect(out.seriesData.map((d: any) => d.name)).toEqual([
      'C1',
      'C2',
      `C1\u200B`,
      'C3',
    ]);
    expect(out.seriesData.map((d: any) => d.value)).toEqual([1, 2, 3, 4]);
    expect(out.seriesData.map((d: any) => d.rawName)).toEqual([
      'C1',
      'C2',
      'C1',
      'C3',
    ]);
  });
});
