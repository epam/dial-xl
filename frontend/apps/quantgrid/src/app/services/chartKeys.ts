import { FilesMetadata } from '@frontend/common';
import { ParsedSheets, ParsedTable } from '@frontend/parser';

const storageKey = 'chartKeys';

export type ChartKeys = {
  [projectName: string]: {
    [tableName: string]: {
      [fieldName: string]: string;
    };
  };
};

export const saveChartKey = (
  tableName: string,
  fieldName: string,
  key: string,
  projectName: string,
  bucket: string,
  path: string | null | undefined
) => {
  const fullItemPrePath = `${bucket}/${path ? path + '/' : ''}`;
  const chartKeys = getChartKeys();
  chartKeys[fullItemPrePath + projectName] =
    chartKeys[fullItemPrePath + projectName] || {};
  chartKeys[fullItemPrePath + projectName][tableName] =
    chartKeys[fullItemPrePath + projectName][tableName] || {};
  chartKeys[fullItemPrePath + projectName][tableName][fieldName] = key;
  saveChartKeys(chartKeys);
};

export const getChartKeysByProject = (
  projectName: string,
  bucket: string,
  path: string | null | undefined
) => {
  const chartKeys = getChartKeys();
  const fullItemPrePath = `${bucket}/${path ? path + '/' : ''}`;

  return chartKeys[fullItemPrePath + projectName] || {};
};

export const getChartKeys = (): ChartKeys => {
  const chartKeys = localStorage.getItem(storageKey);

  return chartKeys ? JSON.parse(chartKeys) : {};
};

export const cleanUpChartKeysByProjects = (projectList: FilesMetadata[]) => {
  const chartKeys = getChartKeys();

  Object.keys(chartKeys).forEach((fullProjectPath) => {
    if (
      !projectList.find((project) => {
        const fullItemPrePath = `${project.bucket}/${
          project.parentPath ? project.parentPath + '/' : ''
        }`;
        const projectFullPath = fullItemPrePath + project.name;

        return projectFullPath === fullProjectPath;
      })
    ) {
      delete chartKeys[fullProjectPath];
    }
  });

  saveChartKeys(chartKeys);
};

export const cleanUpProjectChartKeys = (
  parsedSheets: ParsedSheets,
  projectName: string,
  bucket: string,
  path: string | null | undefined
) => {
  const chartKeys = getChartKeys();
  const fullItemPrePath = `${bucket}/${path ? path + '/' : ''}`;
  const fullProjectPath = fullItemPrePath + projectName;

  if (!chartKeys[fullProjectPath]) {
    return;
  }

  Object.keys(chartKeys[fullProjectPath]).forEach((tableName) => {
    let table: ParsedTable | undefined;

    for (const sheet of Object.keys(parsedSheets)) {
      table = parsedSheets[sheet].tables.find((t) => t.tableName === tableName);

      if (table) break;
    }

    if (!table) {
      delete chartKeys[fullProjectPath][tableName];
    } else {
      Object.keys(chartKeys[fullProjectPath][tableName]).forEach(
        (fieldName) => {
          const field = table?.fields.find(
            (f) => f.key.fieldName === fieldName
          );

          if (!field) {
            delete chartKeys[fullProjectPath][tableName][fieldName];
          }
        }
      );
    }
  });

  saveChartKeys(chartKeys);
};

export const renameChartKeysProject = (
  oldProjectName: string,
  newProjectName: string,
  bucket: string,
  path?: string | null | undefined
) => {
  const chartKeys = getChartKeys();
  const fullItemPrePath = `${bucket}/${path ? path + '/' : ''}`;

  if (chartKeys[fullItemPrePath + oldProjectName]) {
    chartKeys[fullItemPrePath + newProjectName] =
      chartKeys[fullItemPrePath + oldProjectName];
    delete chartKeys[fullItemPrePath + oldProjectName];
  }

  saveChartKeys(chartKeys);
};

const saveChartKeys = (chartKeys: ChartKeys) => {
  localStorage.setItem(storageKey, JSON.stringify(chartKeys));
};
