import { organizeLineChartData } from '../lineChart';
import {
  makeChartsData,
  makeField,
  makeGridChart,
  makeGridChartSection,
  pickCommonOrganized,
} from './utils';

describe('organizeLineChartData', () => {
  it('custom X axis: keeps table order and supports duplicates (single section)', () => {
    // Arrange
    const tableName = 't1';
    const chartData = makeChartsData(tableName, {
      x: makeField(['x1', 'x2', 'x1', 'x4']),
      Sales: makeField(['1', '2', '3', '4']),
    });

    const gridChart = makeGridChart({
      tableName,
      chartSections: [
        makeGridChartSection({
          xAxisFieldName: 'x',
          valueFieldNames: ['Sales'],
        }),
      ],
    });

    // Act
    const result = organizeLineChartData(chartData, gridChart);

    // Assert
    expect(result).toBeTruthy();

    const out = pickCommonOrganized(result);
    expect(out.xAxisData).toEqual(['x1', 'x2', 'x1', 'x4']);
    expect(out.legendData).toEqual(['Sales']);
    expect(out.series).toEqual([
      {
        name: 'Sales',
        type: 'line',
        data: [
          { value: 1, displayValue: '1' },
          { value: 2, displayValue: '2' },
          { value: 3, displayValue: '3' },
          { value: 4, displayValue: '4' },
        ],
      },
    ]);
  });

  it('index X axis: uses 1..N when no custom xAxisFieldName (single section)', () => {
    // Arrange
    const tableName = 't1';
    const chartData = makeChartsData(tableName, {
      Sales: makeField([10, 20, 30]),
    });

    const gridChart = makeGridChart({
      tableName,
      chartSections: [makeGridChartSection({ valueFieldNames: ['Sales'] })],
    });

    // Act
    const result = organizeLineChartData(chartData, gridChart);

    // Assert
    expect(result).toBeTruthy();

    const out = pickCommonOrganized(result);
    expect(out.xAxisData).toEqual(['1', '2', '3']);
    expect(out.legendData).toEqual(['Sales']);
    expect(out.series).toEqual([
      {
        name: 'Sales',
        type: 'line',
        data: [
          { value: 10, displayValue: '10' },
          { value: 20, displayValue: '20' },
          { value: 30, displayValue: '30' },
        ],
      },
    ]);
  });

  it('multiple sections: expands axis if another section has extra duplicate occurrences', () => {
    // Arrange
    const tableName = 't1';
    const chartData = makeChartsData(tableName, {
      x1: makeField(['A', 'B']),
      x2: makeField(['A', 'B', 'A']),
      S1: makeField([1, 2]),
      S2: makeField([10, 20, 30]),
    });

    const gridChart = makeGridChart({
      tableName,
      chartSections: [
        makeGridChartSection({ xAxisFieldName: 'x1', valueFieldNames: ['S1'] }),
        makeGridChartSection({ xAxisFieldName: 'x2', valueFieldNames: ['S2'] }),
      ],
    });

    // Act
    const result = organizeLineChartData(chartData, gridChart);

    // Assert
    expect(result).toBeTruthy();

    const out = pickCommonOrganized(result);
    expect(out.xAxisData).toEqual(['A', 'B', 'A']);
    expect(out.legendData).toEqual(['S1', 'S2']);
    expect(out.series).toEqual([
      {
        name: 'S1',
        type: 'line',
        data: [
          { value: 1, displayValue: '1' },
          { value: 2, displayValue: '2' },
          null,
        ],
      },
      {
        name: 'S2',
        type: 'line',
        data: [
          { value: 10, displayValue: '10' },
          { value: 20, displayValue: '20' },
          { value: 30, displayValue: '30' },
        ],
      },
    ]);
  });

  it('mixed axes: base axis is custom, index-based section appends missing index slots', () => {
    // Arrange
    const tableName = 't1';
    const chartData = makeChartsData(tableName, {
      x: makeField(['X', 'Y']),
      Sales: makeField([5, 6]),
      Profit: makeField([1, 2, 3]),
    });

    const gridChart = makeGridChart({
      tableName,
      chartSections: [
        makeGridChartSection({
          xAxisFieldName: 'x',
          valueFieldNames: ['Sales'],
        }),
        makeGridChartSection({ valueFieldNames: ['Profit'] }),
      ],
    });

    // Act
    const result = organizeLineChartData(chartData, gridChart);

    // Assert
    expect(result).toBeTruthy();

    const out = pickCommonOrganized(result);
    expect(out.xAxisData).toEqual(['X', 'Y', '1', '2', '3']);
    expect(out.legendData).toEqual(['Sales', 'Profit']);
    expect(out.series).toEqual([
      {
        name: 'Sales',
        type: 'line',
        data: [
          { value: 5, displayValue: '5' },
          { value: 6, displayValue: '6' },
          null,
          null,
          null,
        ],
      },
      {
        name: 'Profit',
        type: 'line',
        data: [
          null,
          null,
          { value: 1, displayValue: '1' },
          { value: 2, displayValue: '2' },
          { value: 3, displayValue: '3' },
        ],
      },
    ]);
  });
});
