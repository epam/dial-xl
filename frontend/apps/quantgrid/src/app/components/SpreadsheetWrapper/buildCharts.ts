import { ParsedTable } from '@frontend/parser';
import {
  defaultChartCols,
  defaultChartRows,
  GridChart,
} from '@frontend/spreadsheet';

import { getChartKeysByProject } from '../../services';

export function buildCharts(
  tables: ParsedTable[] | undefined,
  projectName: string
): GridChart[] {
  const charts: GridChart[] = [];

  if (!tables || tables.length === 0) return charts;

  for (const table of tables) {
    const { tableName } = table;

    if (!table.isLineChart()) continue;

    const [startRow, startCol] = table.getPlacement();

    const chartSize = table.getChartSize();
    const chartRows = chartSize[0] || defaultChartRows;
    const chartCols = chartSize[1] || defaultChartCols;

    const endCol = startCol + chartCols;
    const endRow = startRow + 1 + chartRows;

    const keys = table.fields
      .filter((f) => f.isKey)
      .map((f) => f.key.fieldName);

    const selectedKeys: Record<string, string> = {};

    const projectKeys = getChartKeysByProject(projectName);

    for (const key of keys) {
      if (projectKeys[tableName] && projectKeys[tableName][key]) {
        selectedKeys[key] = projectKeys[tableName][key];
      }
    }

    const chart: GridChart = {
      tableName,
      chartType: 'line',
      startCol,
      startRow: startRow + 1,
      endCol,
      endRow,
      keys,
      selectedKeys,
    };

    charts.push(chart);
  }

  return charts;
}
