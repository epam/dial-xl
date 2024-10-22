import { FilesMetadata } from '@frontend/common';

const maxHistoryDepth = 100;
const storageKey = 'projectHistory';

export const initialHistoryTitle = 'Local history starts here';

export type UndoRedoHistory = {
  [projectName: string]: UndoRedoHistoryState[];
};

export type UndoRedoHistoryState = {
  title: string;
  sheetName: string;
  time: number;
  dsl: string;
};

export function clearProjectHistory(
  sheetName: string,
  projectName: string,
  bucket: string,
  path: string | null | undefined,
  dsl?: string
) {
  const history = getHistory();
  const fullItemPrePath = `${bucket}/${path ? path + '/' : ''}`;

  if (fullItemPrePath + projectName in history) {
    if (!dsl) {
      delete history[fullItemPrePath + projectName];
    } else {
      history[fullItemPrePath + projectName] = [
        {
          title: initialHistoryTitle,
          time: Date.now(),
          dsl,
          sheetName,
        },
      ];
    }

    localStorage.setItem(storageKey, JSON.stringify(history));
  }

  return;
}

export function getHistory() {
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
  const fullItemPrePath = `${bucket}/${path ? path + '/' : ''}`;
  const history = getHistory();
  delete history[fullItemPrePath + projectName];
  localStorage.setItem(storageKey, JSON.stringify(history));
}

export function renameSheetHistory(
  oldSheetName: string,
  newSheetName: string,
  projectName: string,
  bucket: string,
  path: string | null | undefined
) {
  const history = getProjectHistory(projectName, bucket, path);

  history.forEach((historyItem) => {
    if (historyItem.sheetName === oldSheetName) {
      historyItem.sheetName = newSheetName;
    }
  });

  saveProjectHistory(history, projectName, bucket, path);
}

export function deleteSheetHistory(
  sheetName: string,
  projectName: string,
  bucket: string,
  path: string | null | undefined
) {
  let history = getProjectHistory(projectName, bucket, path);

  history = history.filter(
    (historyItem) => historyItem.sheetName !== sheetName
  );

  saveProjectHistory(history, projectName, bucket, path);

  return;
}

export function saveProjectHistory(
  history: UndoRedoHistoryState[],
  projectName: string,
  bucket: string,
  path: string | undefined | null
) {
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

  localStorage.setItem(storageKey, JSON.stringify(historyObj));

  return;
}

export function cleanUpProjectHistory(projectList: FilesMetadata[]) {
  const history = getHistory();
  const currentDate = new Date();
  const oneMonthAgo = currentDate.setMonth(currentDate.getMonth() - 1);

  Object.keys(history).forEach((fullProjectPath) => {
    if (
      !projectList.find((project) => {
        const fullItemPrePath = `${project.bucket}/${
          project.parentPath ? project.parentPath + '/' : ''
        }`;
        const projectFullPath = fullItemPrePath + project.name;

        return projectFullPath === fullProjectPath;
      })
    ) {
      delete history[fullProjectPath];
    } else {
      const latestItem = history[fullProjectPath].at(-1);

      if (latestItem && latestItem.time < oneMonthAgo) {
        delete history[fullProjectPath];
      }
    }
  });

  localStorage.setItem(storageKey, JSON.stringify(history));
}

export function appendInitialStateToProjectHistory(
  sheetName: string,
  dsl: string,
  projectName: string,
  bucket: string,
  path: string | null | undefined
) {
  const history = getProjectHistory(projectName, bucket, path);

  const lastHistoryItem = history[history.length - 1];

  if (lastHistoryItem?.sheetName === sheetName) return;

  history.push({
    title: `Change worksheet to ${sheetName}`,
    time: Date.now(),
    dsl,
    sheetName,
  });

  saveProjectHistory(history, projectName, bucket, path);
}

export function appendToProjectHistory(
  sheetName: string,
  title: string,
  dsl: string,
  projectName: string,
  bucket: string,
  path: string | undefined | null,
  isUpdate = false
) {
  let history = getProjectHistory(projectName, bucket, path);

  if (isUpdate) {
    history[history.length - 1] = { title, time: Date.now(), dsl, sheetName };

    saveProjectHistory(history, projectName, bucket, path);

    return;
  }

  history.push({ title, time: Date.now(), dsl, sheetName });

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
  const history = getProjectHistory(projectName, bucket, path);

  history.pop();

  saveProjectHistory(history, projectName, bucket, path);

  return history.length && history[history.length - 1];
}

export function getLastProjectHistoryDsl(
  projectName: string,
  bucket: string,
  path: string | undefined
) {
  const history = getProjectHistory(projectName, bucket, path);

  return history.length && history[history.length - 1].dsl;
}
