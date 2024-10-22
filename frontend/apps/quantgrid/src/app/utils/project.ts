import {
  csvFileExtension,
  ProjectState,
  QGDialProject,
  WorksheetState,
} from '@frontend/common';
import { SheetReader } from '@frontend/parser';

import { routeParams, routes } from '../../AppRoutes';
import { encodeApiUrl, safeEncodeURIComponent } from './name';

export const mapQGDialProjectToProject = (
  dialProject: QGDialProject,
  projectName: string,
  bucket: string,
  path: string | null | undefined,
  version: string
): ProjectState => {
  const entries = Object.entries(dialProject);
  const settings = entries
    .filter((entry) => entry[0].startsWith('/'))
    .reduce((acc, [key, value]) => {
      acc[key.slice(1)] = value;

      return acc;
    }, <Record<string, any>>{});

  const sheets = entries
    .filter((entry) => !entry[0].startsWith('/'))
    .map(
      ([sheetName, sheetContent]): WorksheetState => ({
        sheetName,
        content: sheetContent,
        projectName: projectName,
      })
    );

  return {
    projectName,
    bucket,
    path,
    sheets,
    version,
    settings,
  };
};
export const mapProjectToQGDialProject = (
  project: ProjectState
): QGDialProject => {
  let dataObj = project.sheets.reduce((acc, curr) => {
    acc[curr.sheetName] = curr.content;

    return acc;
  }, {} as Record<string, string>);
  dataObj = Object.entries(project.settings).reduce((acc, curr) => {
    dataObj['/' + curr[0]] = curr[1];

    return dataObj;
  }, dataObj);

  return dataObj;
};

export const updateSheetInProject = (
  oldProjectState: ProjectState,
  oldSheetName: string,
  newSheetState: Partial<WorksheetState>
): ProjectState => {
  const newSheetsState = oldProjectState.sheets.map((sheet) => {
    if (oldSheetName === sheet.sheetName) {
      return { ...sheet, ...newSheetState };
    }

    return sheet;
  });

  return {
    ...oldProjectState,
    sheets: newSheetsState,
  };
};

export const getProjectNavigateUrl = ({
  projectName,
  projectBucket,
  projectSheetName,
  projectPath,
}: {
  projectName: string;
  projectBucket: string;
  projectSheetName?: string | null;
  projectPath?: string | null;
}) => {
  return `${routes.project}/${projectName}${
    projectSheetName ? '/' + projectSheetName : ''
  }?${routeParams.projectBucket}=${projectBucket}${
    projectPath ? `&${routeParams.projectPath}=${projectPath}` : ''
  }`;
};

export const getProjectShareUrl = ({
  projectName,
  projectBucket,
  projectPath,
  invitationId,
}: {
  projectName: string;
  projectBucket: string;
  projectPath?: string | null;
  invitationId: string;
}) => {
  return `${window?.location.origin}${routes.share}/${invitationId}?${
    routeParams.projectBucket
  }=${projectBucket}&${routeParams.projectName}=${safeEncodeURIComponent(
    projectName
  )}${
    projectPath
      ? `&${routeParams.projectPath}=${safeEncodeURIComponent(projectPath)}`
      : ''
  }`;
};

export const getFilesShareUrl = ({
  invitationId,
}: {
  invitationId: string;
}) => {
  return `${window?.location.origin}${routes.share}/${invitationId}`;
};

export const collectFilesFromProject = (
  sheetContents: string[]
): string[] | undefined => {
  try {
    return (
      sheetContents
        .map((content) => {
          const parsedSheet = SheetReader.parseSheet(content);

          const res = parsedSheet.tables
            .map((table) =>
              table.fields.map((field) => field.expressionMetadata?.text)
            )
            .flat(2)
            .map((expression) => {
              if (!expression) return undefined;

              const myRegexp = /INPUT\("([^)]*)"\)/g;
              const matches = [...expression.matchAll(myRegexp)].map(
                (match) => match[1]
              );

              return matches;
            })
            .filter(Boolean)
            .flat()
            .filter(Boolean) as string[];

          return res;
        })
        .flat()
        // Need to share schema file also with normal files
        .map((file) => {
          const lastPathSegmentStart = file.lastIndexOf('/') + 1;
          const lastPathSegment = file.substring(lastPathSegmentStart);
          const lastPathSegmentExtensionIndex =
            lastPathSegment.indexOf(csvFileExtension);
          const lastPathSegmentWithoutExtension = lastPathSegment.substring(
            0,
            lastPathSegmentExtensionIndex
          );

          const schemaFile =
            file.substring(0, lastPathSegmentStart) +
            '.' +
            lastPathSegmentWithoutExtension +
            '.schema';

          return [file, schemaFile];
        })
        .flat()
    );
  } catch {
    return undefined;
  }
};

export const updateFilesPathInputsInProject = (
  sheets: WorksheetState[],
  oldProjectFolderPath: string,
  newProjectFolderPath: string
): WorksheetState[] => {
  return sheets.map((sheet) => {
    const newContent = sheet.content.replaceAll(
      /INPUT\("([^)]*)"\)/g,
      (_, url) => {
        const oldEncodedPath = oldProjectFolderPath
          ? encodeApiUrl(oldProjectFolderPath)
          : null;
        const newEncodedPath = newProjectFolderPath
          ? encodeApiUrl(newProjectFolderPath)
          : null;
        const updatedFileUrl = oldEncodedPath
          ? url.replaceAll(oldEncodedPath, newEncodedPath)
          : url;

        return `INPUT("${updatedFileUrl}")`;
      }
    );

    return {
      ...sheet,
      content: newContent,
    };
  });
};
