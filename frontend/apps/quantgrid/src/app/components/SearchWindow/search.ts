import Fuse from 'fuse.js';

import {
  dialProjectFileExtension,
  ResourceMetadata,
  WorksheetState,
} from '@frontend/common';
import { ParsedSheets } from '@frontend/parser';

export type ISearchResult = {
  type: 'project' | 'sheet' | 'table' | 'field';
  name: string;
  path: {
    projectBucket: string;
    projectName: string;
    projectPath: string | null | undefined;
    sheetName?: string;
    tableName?: string;
    fieldName?: string;
  };
};

export const searchFilterTabs: Array<ISearchFilter | null> = [
  null,
  'projects',
  'sheets',
  'tables',
  'fields',
];

export type ISearchFilter = 'projects' | 'sheets' | 'tables' | 'fields';

const fuseOptions = {
  includeScore: true,
  shouldSort: true,
  includeMatches: true,
  threshold: 0.5,
  keys: ['name'],
};

function computeSearchResults(results: ISearchResult[], query: string) {
  if (!query.length)
    return results.map((result) => ({
      item: result,
      score: 0,
    })) as Fuse.FuseResult<ISearchResult>[];

  const fuse = new Fuse(results, fuseOptions);

  return fuse.search(query);
}

export function path2str(path: ISearchResult['path']) {
  if (!path.sheetName && !path.tableName) {
    if (path.projectPath) {
      return `${path.projectPath}`;
    }

    return null;
  }

  if (path.fieldName && path.tableName)
    return `${path.sheetName} / ${path.tableName} / [${path.fieldName}]`;

  if (path.tableName) return `${path.sheetName} / ${path.tableName}`;

  return null;
}

export function search(
  projects: ResourceMetadata[],
  sheets: WorksheetState[] | null,
  parsedSheets: ParsedSheets | null,
  query: string,
  filter: ISearchFilter | null,
  currentProjectBucket: string,
  currentProjectPath: string | null | undefined
) {
  const allResults: ISearchResult[] = [];

  if (!filter || filter === 'projects') {
    for (const project of projects) {
      const projectName = project.name.replaceAll(dialProjectFileExtension, '');

      allResults.push({
        type: 'project',
        name: projectName,
        path: {
          projectName,
          projectBucket: project.bucket,
          projectPath: project.parentPath,
        },
      });
    }
  }

  for (const sheet of sheets || []) {
    const { sheetName, projectName } = sheet;

    if (!filter || filter === 'sheets')
      allResults.push({
        type: 'sheet',
        name: sheetName,
        path: {
          projectName,
          sheetName,
          projectBucket: currentProjectBucket,
          projectPath: currentProjectPath,
        },
      });

    const parsedSheet =
      parsedSheets &&
      Object.prototype.hasOwnProperty.call(parsedSheets, sheetName)
        ? parsedSheets[sheetName]
        : null;

    if (!parsedSheet) continue;

    for (const table of parsedSheet.tables) {
      const { tableName } = table;

      if (!filter || filter === 'tables')
        allResults.push({
          type: 'table',
          name: tableName,
          path: {
            projectName,
            projectBucket: currentProjectBucket,
            projectPath: currentProjectPath,
            sheetName,
            tableName,
          },
        });

      for (const field of table.fields) {
        const { fieldName } = field.key;

        if (!filter || filter === 'fields')
          allResults.push({
            type: 'field',
            name: fieldName,
            path: {
              projectName,
              projectBucket: currentProjectBucket,
              projectPath: currentProjectPath,
              sheetName,
              tableName,
              fieldName,
            },
          });
      }
    }
  }

  return computeSearchResults(allResults, query);
}
