import { organizeBarChartData } from '../barChart';
import {
  makeChartsData,
  makeGridChart,
  makeGridChartSection,
  pickCommonOrganized,
} from './utils';

describe('organizeBarChartData', () => {
  it('horizontal: index X axis (no xAxisFieldName)', () => {
    // Arrange
    const tableName = 't1';

    const chartData = makeChartsData(tableName, {
      A: { rawValues: ['1', 'oops', '3'], displayValues: ['1', 'oops', '3'] },
      B: { rawValues: ['4', '5', '6'], displayValues: ['4', '5', '6'] },
    });

    const gridChart = makeGridChart({
      tableName,
      chartOrientation: 'horizontal',
      chartSections: [makeGridChartSection({ valueFieldNames: ['A', 'B'] })],
    });

    // Act
    const result = organizeBarChartData(chartData, gridChart);

    // Assert
    expect(result).toBeTruthy();

    const out = pickCommonOrganized(result);

    expect(out.xAxisData).toEqual(['1', '2', '3']);
    expect(out.legendData).toEqual(['A', 'B']);
    expect(out.series).toEqual([
      {
        name: 'A',
        type: 'bar',
        data: [
          { value: 1, displayValue: '1' },
          null,
          { value: 3, displayValue: '3' },
        ],
      },
      {
        name: 'B',
        type: 'bar',
        data: [
          { value: 4, displayValue: '4' },
          { value: 5, displayValue: '5' },
          { value: 6, displayValue: '6' },
        ],
      },
    ]);
  });

  it('horizontal: custom xAxisFieldName uses displayValues for xAxisData', () => {
    // Arrange
    const tableName = 't1';

    const chartData = makeChartsData(tableName, {
      x: { rawValues: ['r1', 'r2'], displayValues: ['Row1', 'Row2'] },
      Sales: { rawValues: ['10', '20'], displayValues: ['10', '20'] },
    });

    const gridChart = makeGridChart({
      tableName,
      chartOrientation: 'horizontal',
      chartSections: [
        makeGridChartSection({
          xAxisFieldName: 'x',
          valueFieldNames: ['Sales'],
        }),
      ],
    });

    // Act
    const result = organizeBarChartData(chartData, gridChart);

    // Assert
    expect(result).toBeTruthy();

    const out = pickCommonOrganized(result);
    expect(out.xAxisData).toEqual(['Row1', 'Row2']);
    expect(out.legendData).toEqual(['Sales']);
    expect(out.series).toEqual([
      {
        name: 'Sales',
        type: 'bar',
        data: [
          { value: 10, displayValue: '10' },
          { value: 20, displayValue: '20' },
        ],
      },
    ]);
  });

  it('vertical: xAxisData comes from valueFieldNames, legendData comes from row labels', () => {
    // Arrange
    const tableName = 't1';

    const chartData = makeChartsData(tableName, {
      x: { rawValues: ['r1', 'r2'], displayValues: ['Row1', 'Row2'] },
      A: { rawValues: ['1', '10'], displayValues: ['1', '10'] },
      B: { rawValues: ['2', '20'], displayValues: ['2', '20'] },
    });

    const gridChart = makeGridChart({
      tableName,
      chartOrientation: 'vertical',
      chartSections: [
        makeGridChartSection({
          xAxisFieldName: 'x',
          valueFieldNames: ['A', 'B'],
        }),
      ],
    });

    // Act
    const result = organizeBarChartData(chartData, gridChart);

    // Assert
    expect(result).toBeTruthy();

    const out = pickCommonOrganized(result);

    expect(out.xAxisData).toEqual(['A', 'B']);
    expect(out.legendData).toEqual(['r1', 'r2']);
    expect(out.series).toEqual([
      {
        name: 'r1',
        type: 'bar',
        data: [
          { value: 1, displayValue: '1' },
          { value: 2, displayValue: '2' },
        ],
      },
      {
        name: 'r2',
        type: 'bar',
        data: [
          { value: 10, displayValue: '10' },
          { value: 20, displayValue: '20' },
        ],
      },
    ]);
  });

  it('multiple sections: xAxisData is deduped union and legendData is unique', () => {
    // Arrange
    const tableName = 't1';

    const chartData = makeChartsData(tableName, {
      x: { rawValues: ['r1', 'r2'], displayValues: ['Row1', 'Row2'] },
      A: { rawValues: ['1', '10'], displayValues: ['1', '10'] },
      B: { rawValues: ['2', '20'], displayValues: ['2', '20'] },
      C: { rawValues: ['3', '30'], displayValues: ['3', '30'] },
    });

    const gridChart = makeGridChart({
      tableName,
      chartOrientation: 'vertical',
      chartSections: [
        makeGridChartSection({
          xAxisFieldName: 'x',
          valueFieldNames: ['A', 'B'],
        }),
        makeGridChartSection({
          xAxisFieldName: 'x',
          valueFieldNames: ['B', 'C'],
        }),
      ],
    });

    // Act
    const result = organizeBarChartData(chartData, gridChart);

    // Assert
    expect(result).toBeTruthy();

    const out = pickCommonOrganized(result);
    expect(out.xAxisData).toEqual(['A', 'B', 'C']);
    expect(out.legendData).toEqual(['r1', 'r2']);
    expect(out.series.map((s: any) => s.name)).toEqual([
      'r1',
      'r2',
      'r1',
      'r2',
    ]);
    expect(out.series.map((s: any) => s.type)).toEqual([
      'bar',
      'bar',
      'bar',
      'bar',
    ]);

    expect(out.series[0].data).toEqual([
      { value: 1, displayValue: '1' },
      { value: 2, displayValue: '2' },
    ]);
    expect(out.series[1].data).toEqual([
      { value: 10, displayValue: '10' },
      { value: 20, displayValue: '20' },
    ]);
    expect(out.series[2].data).toEqual([
      { value: 2, displayValue: '2' },
      { value: 3, displayValue: '3' },
    ]);
    expect(out.series[3].data).toEqual([
      { value: 20, displayValue: '20' },
      { value: 30, displayValue: '30' },
    ]);
  });

  it('horizontal: keeps duplicate X labels in table order by making xAxis labels unique', () => {
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
      chartSections: [
        makeGridChartSection({
          xAxisFieldName: 'x',
          valueFieldNames: ['Sales'],
        }),
      ],
    });

    // Act
    const result = organizeBarChartData(chartData, gridChart);

    // Assert
    expect(result).toBeTruthy();

    const out = pickCommonOrganized(result);

    expect(out.xAxisData).toEqual(['C1', 'C2', `C1\u200B`, 'C3']);
    expect(out.series).toEqual([
      {
        name: 'Sales',
        type: 'bar',
        data: [
          { value: 1, displayValue: '1' },
          { value: 2, displayValue: '2' },
          { value: 3, displayValue: '3' },
          { value: 4, displayValue: '4' },
        ],
      },
    ]);
  });
});
