import { histogramChartSeriesSelector } from '@frontend/common';

import { organizeHistogramChartData } from '../histogramChart';
import { makeChartsData, makeGridChart, makeHistogramSection } from './utils';

function pickHistogram(result: any) {
  return {
    xAxisData: result?.xAxisData,
    series: Array.isArray(result?.series)
      ? result.series.map((s: any) => ({
          name: s?.name,
          type: s?.type,
          data: s?.data,
        }))
      : [],
  };
}

describe('organizeHistogramChartData', () => {
  it('builds xAxisData from LowerBound/UpperBound display values and series from RowCount', () => {
    // Arrange
    const dataTable = 'hist_table';

    const chartData = {
      ...makeChartsData(dataTable, {
        BucketNumber: {
          rawValues: ['1', '2', '3'],
          displayValues: ['1', '2', '3'],
        },
        LowerBound: {
          rawValues: ['0', '10', '20'],
          displayValues: ['0', '10', '20'],
        },
        UpperBound: {
          rawValues: ['10', '20', '30'],
          displayValues: ['10', '20', '30'],
        },
        RowCount: {
          rawValues: ['5', '2', '7'],
          displayValues: ['5', '2', '7'],
        },
      }),
    };

    const gridChart = makeGridChart({
      tableName: 'unused_here',
      selectedKeys: {
        [histogramChartSeriesSelector]: 'MySeries',
      },
      customSeriesColors: {
        MySeries: '#123456',
      },
      chartSections: [
        makeHistogramSection({
          histogramDataTableName: dataTable,
          histogramBucketsCount: 3,
        }),
      ],
    });

    // Act
    const result = organizeHistogramChartData(chartData, gridChart);

    // Assert
    expect(result).toBeTruthy();

    const out = pickHistogram(result);

    expect(out.xAxisData).toEqual(['0 -\n 10', '10 -\n 20', '20 -\n 30']);
    expect(out.series).toEqual([
      {
        name: 'MySeries',
        type: 'bar',
        data: ['5', '2', '7'],
      },
    ]);
  });

  it('returns undefined if selectedSeries is missing', () => {
    // Arrange
    const gridChart = makeGridChart({
      tableName: 't1',
      selectedKeys: {},
      chartSections: [
        makeHistogramSection({
          histogramDataTableName: 'hist_table',
          histogramBucketsCount: 3,
        }),
      ],
    });

    const chartData = makeChartsData('hist_table', {
      BucketNumber: { rawValues: ['1'], displayValues: ['1'] },
      LowerBound: { rawValues: ['0'], displayValues: ['0'] },
      UpperBound: { rawValues: ['10'], displayValues: ['10'] },
      RowCount: { rawValues: ['5'], displayValues: ['5'] },
    });

    // Act
    const result = organizeHistogramChartData(chartData, gridChart);

    // Assert
    expect(result).toBeUndefined();
  });

  it('returns undefined if required histogram table columns are missing', () => {
    // Arrange
    const dataTable = 'hist_table';

    const chartData = makeChartsData(dataTable, {
      BucketNumber: { rawValues: ['1', '2'], displayValues: ['1', '2'] },
      LowerBound: { rawValues: ['0', '10'], displayValues: ['0', '10'] },
    });

    const gridChart = makeGridChart({
      tableName: 't1',
      selectedKeys: { [histogramChartSeriesSelector]: 'Series' },
      chartSections: [
        makeHistogramSection({
          histogramDataTableName: dataTable,
          histogramBucketsCount: 2,
        }),
      ],
    });

    // Act
    const result = organizeHistogramChartData(chartData, gridChart);

    // Assert
    expect(result).toBeUndefined();
  });
});
