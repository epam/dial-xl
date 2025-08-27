import { FilesMetadata } from '@frontend/common';

export const maxHistoryDepth = 50;

const storageKey = 'projectHistoryItems';

export const initialHistoryTitle = 'Local history starts here';

export type UndoRedoHistory = {
  [projectName: string]: UndoRedoHistoryState[];
};

export type UndoRedoHistoryState = {
  title: string;
  time: number;
  sheetsState: Record<string, string>;
};

// We migrated to another key with another structure, so we need to clear old key
function cleanOldProjectHistory() {
  const oldStorageKey = 'projectHistory';

  localStorage.removeItem(oldStorageKey);
}

export function clearProjectHistory(
  projectName: string,
  bucket: string,
  path: string | null | undefined,
  newSheetsState?: Record<string, string>
) {
  cleanOldProjectHistory();

  const history = getHistory();
  const fullItemPrePath = `${bucket}/${path ? path + '/' : ''}`;

  if (fullItemPrePath + projectName in history) {
    if (!newSheetsState) {
      delete history[fullItemPrePath + projectName];
    } else {
      history[fullItemPrePath + projectName] = [
        {
          title: initialHistoryTitle,
          time: Date.now(),
          sheetsState: newSheetsState,
        },
      ];
    }

    localStorage.setItem(storageKey, JSON.stringify(history));
  }

  return;
}

export function getHistory() {
  cleanOldProjectHistory();

  const historyStr = localStorage.getItem(storageKey);

  if (!historyStr) {
    localStorage.setItem(storageKey, '{}');

    return {};
  }

  const history: UndoRedoHistory = JSON.parse(historyStr);

  return history;
}

export function getProjectHistory(
  projectName: string,
  bucket: string,
  path: string | undefined | null
): UndoRedoHistoryState[] {
  cleanOldProjectHistory();

  const history: UndoRedoHistory = getHistory();
  const fullItemPrePath = `${bucket}/${path ? path + '/' : ''}`;

  if (!(fullItemPrePath + projectName in history)) {
    history[fullItemPrePath + projectName] = [];

    localStorage.setItem(storageKey, JSON.stringify(history));

    return [];
  }

  return history[fullItemPrePath + projectName];
}

export function renameProjectHistory(
  oldProjectName: string,
  newProjectName: string,
  bucket: string,
  path: string | null | undefined
) {
  cleanOldProjectHistory();

  const history = getHistory();
  const fullItemPrePath = `${bucket}/${path ? path + '/' : ''}`;

  history[fullItemPrePath + newProjectName] =
    history[fullItemPrePath + oldProjectName];
  delete history[fullItemPrePath + oldProjectName];
  localStorage.setItem(storageKey, JSON.stringify(history));
}

export function deleteProjectHistory(
  projectName: string,
  bucket: string,
  path: string | null | undefined
) {
  cleanOldProjectHistory();

  const fullItemPrePath = `${bucket}/${path ? path + '/' : ''}`;
  const history = getHistory();
  delete history[fullItemPrePath + projectName];
  localStorage.setItem(storageKey, JSON.stringify(history));
}

export function saveProjectHistory(
  history: UndoRedoHistoryState[],
  projectName: string,
  bucket: string,
  path: string | undefined | null
) {
  cleanOldProjectHistory();
  const historyStr = localStorage.getItem(storageKey);
  const fullItemPrePath = `${bucket}/${path ? path + '/' : ''}`;

  if (!historyStr) {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        [fullItemPrePath + projectName]: history,
      })
    );

    return;
  }

  const historyObj: UndoRedoHistory = JSON.parse(historyStr);

  historyObj[fullItemPrePath + projectName] = history;

  try {
    localStorage.setItem(storageKey, JSON.stringify(historyObj));
  } catch (error) {
    if (isQuotaExceededError(error)) {
      let attempts = 0;
      const maxAttempts = 10;
      let success = false;

      while (attempts < maxAttempts) {
        removeOldestHistoryItems(historyObj);

        try {
          localStorage.setItem(storageKey, JSON.stringify(historyObj));
          success = true;
          break;
        } catch (anotherAttemptError) {
          if (!isQuotaExceededError(anotherAttemptError)) {
            break;
          }
        }
        attempts++;
      }

      if (!success) {
        // eslint-disable-next-line
        console.error(`Could not save history after ${attempts} attempts.`);
      }
    } else {
      // eslint-disable-next-line
      console.error(error);
    }
  }

  return;
}

export function cleanUpProjectHistory(projectList?: FilesMetadata[]) {
  cleanOldProjectHistory();

  const history = getHistory();
  const currentDate = new Date();
  const days15 = 1296000000;
  const oneMonthAgo = currentDate.setMonth(currentDate.getMonth() - 1) + days15;

  Object.keys(history).forEach((fullProjectPath) => {
    if (projectList) {
      const isInProjectList = projectList.some((project) => {
        const fullItemPrePath = `${project.bucket}/${
          project.parentPath ? project.parentPath + '/' : ''
        }`;
        const projectFullPath = fullItemPrePath + project.name;

        return projectFullPath === fullProjectPath;
      });

      if (!isInProjectList) {
        delete history[fullProjectPath];

        return;
      }
    }

    const latestItem = history[fullProjectPath].at(-1);
    if (latestItem && latestItem.time < oneMonthAgo) {
      delete history[fullProjectPath];
    }
  });

  localStorage.setItem(storageKey, JSON.stringify(history));
}

export function appendToProjectHistory({
  title,
  sheetsState,
  projectName,
  bucket,
  path,
  isUpdate = false,
}: {
  title: string;
  sheetsState: Record<string, string>;
  projectName: string;
  bucket: string;
  path: string | undefined | null;
  isUpdate?: boolean;
  isTemporary?: boolean;
}) {
  cleanOldProjectHistory();

  let history = getProjectHistory(projectName, bucket, path);

  if (isUpdate) {
    history[history.length - 1] = {
      title,
      time: Date.now(),
      sheetsState,
    };

    saveProjectHistory(history, projectName, bucket, path);

    return;
  }

  history.push({ title, time: Date.now(), sheetsState });

  if (history.length > maxHistoryDepth) {
    history = history.slice(history.length - maxHistoryDepth);
  }

  saveProjectHistory(history, projectName, bucket, path);

  return;
}

export function removeLastProjectHistoryElement(
  projectName: string,
  bucket: string,
  path: string | undefined | null
) {
  cleanOldProjectHistory();

  const history = getProjectHistory(projectName, bucket, path);

  history.pop();

  saveProjectHistory(history, projectName, bucket, path);

  if (!history.length) return undefined;

  return history[history.length - 1];
}

export function removeOldestHistoryItems(
  historyObj: UndoRedoHistory,
  count = 5
) {
  const allEntries: Array<{ fullProjectPath: string; time: number }> = [];

  for (const fullProjectPath in historyObj) {
    const entries = historyObj[fullProjectPath];
    if (Array.isArray(entries)) {
      for (const entry of entries) {
        if (entry && entry.time !== undefined) {
          allEntries.push({ fullProjectPath, time: entry.time });
        }
      }
    }
  }

  allEntries.sort((a, b) => a.time - b.time);

  const toRemove = allEntries.slice(0, count);

  for (const item of toRemove) {
    const projectEntries = historyObj[item.fullProjectPath];
    if (!projectEntries) continue;

    const index = projectEntries.findIndex((e) => e.time === item.time);
    if (index !== -1) {
      projectEntries.splice(index, 1);

      if (projectEntries.length === 0) {
        delete historyObj[item.fullProjectPath];
      }
    }
  }
}

function isQuotaExceededError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return (
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    );
  }

  return false;
}
