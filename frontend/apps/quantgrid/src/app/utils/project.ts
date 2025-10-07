import { Message } from '@epam/ai-dial-overlay';
import {
  csvFileExtension,
  DslSheetChange,
  ProjectAIResponseId,
  ProjectMetadataSetting,
  projectMetadataSettingsKey,
  ProjectSettings,
  ProjectState,
  QGDialProject,
  WorksheetState,
} from '@frontend/common';
import { SheetReader } from '@frontend/parser';

import { routeParams, routes } from '../types';
import { encodeApiUrl, safeEncodeURIComponent } from './name';

const maxResponseIds = 1000;

export const mapQGDialProjectToProject = (
  dialProject: QGDialProject,
  projectName: string,
  bucket: string,
  path: string | null | undefined,
  version: string
): ProjectState => {
  const entries = Object.entries(dialProject);
  const settings = entries
    .filter(([entry]) => entry.startsWith('/'))
    .reduce<ProjectSettings>((acc, [key, value]) => {
      const stripped = key.slice(1) as keyof ProjectSettings;
      acc[stripped] = parseSetting(stripped, value);

      return acc;
    }, {} as ProjectSettings);

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
  const sheetEntries: QGDialProject = project.sheets.reduce<QGDialProject>(
    (acc, { sheetName, content }) => {
      acc[sheetName] = content;

      return acc;
    },
    {}
  );

  const settingEntries: QGDialProject = Object.entries(
    project.settings
  ).reduce<QGDialProject>((acc, [rawKey, rawValue]) => {
    const key = rawKey as keyof ProjectSettings;
    acc[`/${key}`] = serialiseSetting(
      key,
      rawValue as ProjectSettings[typeof key]
    );

    return acc;
  }, {});

  return { ...sheetEntries, ...settingEntries };
};

export function updateAIResponseIds(
  projectStateRef: Pick<ProjectState, 'settings'>,
  updatedResponseIds: ProjectAIResponseId[] | null | undefined
): ProjectSettings {
  if (!updatedResponseIds) return projectStateRef.settings ?? {};

  const settings: ProjectSettings = (projectStateRef.settings ??= {});

  settings[projectMetadataSettingsKey] ??= {} as ProjectMetadataSetting;

  const keys = Object.keys(updatedResponseIds);
  const excess = keys.length - maxResponseIds;
  if (excess > 0) {
    updatedResponseIds = updatedResponseIds.slice(excess);
  }

  settings.projectMetadata.assistantResponseIds = updatedResponseIds;

  return settings;
}

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
  return `${routes.project}/${safeEncodeURIComponent(projectName)}${
    projectSheetName ? '/' + safeEncodeURIComponent(projectSheetName) : ''
  }?${routeParams.projectBucket}=${safeEncodeURIComponent(projectBucket)}${
    projectPath
      ? `&${routeParams.projectPath}=${safeEncodeURIComponent(projectPath)}`
      : ''
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
    const collectedFiles = sheetContents
      .map((content) => {
        const parsedSheet = SheetReader.parseSheet(content);

        const files = parsedSheet.tables
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

        return files;
      })
      .flat();

    const uniqueFiles = Array.from(new Set(collectedFiles));

    return (
      uniqueFiles
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

export const updateFilesPathInputs = (
  sheet: string,
  newProjectFolderPath: string
): string => {
  const encodedNewPath = encodeApiUrl(newProjectFolderPath);

  return sheet.replace(/INPUT\("([^"]+)"\)/g, (_, url: string) => {
    if (!url.startsWith('files/')) return `INPUT("${url}")`;

    const lastSlash = url.lastIndexOf('/');
    const fileName = url.slice(lastSlash + 1);
    const updatedUrl = `files/${encodedNewPath}/${fileName}`;

    return `INPUT("${updatedUrl}")`;
  });
};

export const updateFilesPathInputsInProject = (
  sheets: WorksheetState[],
  newProjectFolderPath: string
): WorksheetState[] => {
  return sheets.map((sheet) => {
    const content = updateFilesPathInputs(sheet.content, newProjectFolderPath);

    return { ...sheet, content };
  });
};

export const updateMessagesProjectFoldersPath = (
  messages: Message[],
  projectFolderTargetPath: string
) => {
  const replacedMessages = messages.map(
    (msg): Message => ({
      ...msg,
      content: updateFilesPathInputs(msg.content, projectFolderTargetPath),
      custom_content: {
        ...msg.custom_content,
        stages: msg.custom_content?.stages?.map((stage) => ({
          ...stage,
          content: stage.content
            ? updateFilesPathInputs(stage.content, projectFolderTargetPath)
            : undefined,
          attachments: stage.attachments?.map((attachment) => ({
            ...attachment,
            data: attachment.data
              ? updateFilesPathInputs(attachment.data, projectFolderTargetPath)
              : undefined,
          })),
        })),
        attachments: msg.custom_content?.attachments?.map((attachment) => ({
          ...attachment,
          data: attachment.data
            ? updateFilesPathInputs(attachment.data, projectFolderTargetPath)
            : undefined,
        })),
      },
    })
  );

  return replacedMessages;
};

export const getProjectSheetsRecord = (
  sheets: WorksheetState[]
): Record<string, string> => {
  return sheets.reduce((acc, sheet) => {
    acc[sheet.sheetName] = sheet.content;

    return acc;
  }, {} as Record<string, string>);
};

const parseSetting = <K extends keyof ProjectSettings>(
  key: K,
  value: unknown
): ProjectSettings[K] => {
  if (key === projectMetadataSettingsKey && typeof value === 'string') {
    return JSON.parse(value) as ProjectSettings[K];
  }

  return value as ProjectSettings[K];
};

export const serialiseSetting = <K extends keyof ProjectSettings>(
  key: K,
  value: ProjectSettings[K]
): string => {
  if (key === projectMetadataSettingsKey) {
    return JSON.stringify(value);
  }

  return typeof value === 'string' ? value : JSON.stringify(value);
};

export function updateProjectSheets(
  changedSheets: DslSheetChange[],
  currentSheets: WorksheetState[],
  projectName: string
) {
  const changedSheetsCopy = changedSheets.slice();
  const sheets = currentSheets
    .map((sheet) => {
      const changedSheetIndex = changedSheetsCopy.findIndex(
        (changedSheet) => sheet.sheetName === changedSheet.sheetName
      );

      if (changedSheetIndex !== -1) {
        const data = changedSheetsCopy[changedSheetIndex];
        changedSheetsCopy.splice(changedSheetIndex, 1);

        return { ...sheet, ...data };
      }

      return sheet;
    })
    .filter((sheet) => sheet.content != null)
    .concat(
      changedSheetsCopy
        .filter((sheet) => sheet.content != null)
        .map((sheet) => ({
          ...sheet,
          content: sheet.content,
          projectName: projectName!,
        }))
    ) as WorksheetState[];

  return sheets;
}

export const getDSLChangesFromSheets = (
  sheets: Record<string, string>
): DslSheetChange[] => {
  return Object.entries(sheets).map(([sheetName, content]) => ({
    sheetName,
    content,
  }));
};
