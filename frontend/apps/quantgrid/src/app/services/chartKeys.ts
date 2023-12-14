import { ParsedSheets } from '@frontend/common';
import { ParsedTable } from '@frontend/parser';

const storageKey = 'chartKeys';

export type ChartKeys = {
  [projectName: string]: {
    [tableName: string]: {
      [fieldName: string]: string;
    };
  };
};

export const saveChartKey = (
  projectName: string,
  tableName: string,
  fieldName: string,
  key: string
) => {
  const chartKeys = getChartKeys();
  chartKeys[projectName] = chartKeys[projectName] || {};
  chartKeys[projectName][tableName] = chartKeys[projectName][tableName] || {};
  chartKeys[projectName][tableName][fieldName] = key;
  saveChartKeys(chartKeys);
};

export const getChartKeysByProject = (projectName: string) => {
  const chartKeys = getChartKeys();

  return chartKeys[projectName] || {};
};

export const getChartKeys = (): ChartKeys => {
  const chartKeys = localStorage.getItem(storageKey);

  return chartKeys ? JSON.parse(chartKeys) : {};
};

export const cleanUpChartKeysByProjects = (projectList: string[]) => {
  const chartKeys = getChartKeys();

  Object.keys(chartKeys).forEach((projectName) => {
    if (!projectList.includes(projectName)) {
      delete chartKeys[projectName];
    }
  });

  saveChartKeys(chartKeys);
};

export const cleanUpProjectChartKeys = (
  projectName: string,
  parsedSheets: ParsedSheets
) => {
  const chartKeys = getChartKeys();

  if (!chartKeys[projectName]) {
    return;
  }

  Object.keys(chartKeys[projectName]).forEach((tableName) => {
    let table: ParsedTable | undefined;

    for (const sheet of Object.keys(parsedSheets)) {
      table = parsedSheets[sheet].tables.find((t) => t.tableName === tableName);

      if (table) break;
    }

    if (!table) {
      delete chartKeys[projectName][tableName];
    } else {
      Object.keys(chartKeys[projectName][tableName]).forEach((fieldName) => {
        const field = table?.fields.find((f) => f.key.fieldName === fieldName);

        if (!field) {
          delete chartKeys[projectName][tableName][fieldName];
        }
      });
    }
  });

  saveChartKeys(chartKeys);
};

export const renameChartKeysProject = (
  oldProjectName: string,
  newProjectName: string
) => {
  const chartKeys = getChartKeys();

  if (chartKeys[oldProjectName]) {
    chartKeys[newProjectName] = chartKeys[oldProjectName];
    delete chartKeys[oldProjectName];
  }

  saveChartKeys(chartKeys);
};

const saveChartKeys = (chartKeys: ChartKeys) => {
  localStorage.setItem(storageKey, JSON.stringify(chartKeys));
};
