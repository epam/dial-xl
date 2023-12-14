const maxHistoryDepth = 100;
const storageKey = 'projectHistory';

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
  projectName: string,
  sheetName: string,
  dsl?: string
) {
  const history = getHistory();

  if (projectName in history) {
    if (!dsl) {
      delete history[projectName];
    } else {
      history[projectName] = [
        { title: 'Initial', time: Date.now(), dsl, sheetName },
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

export function getProjectHistory(projectName: string): UndoRedoHistoryState[] {
  const history: UndoRedoHistory = getHistory();

  if (!(projectName in history)) {
    history[projectName] = [];

    localStorage.setItem(storageKey, JSON.stringify(history));

    return [];
  }

  return history[projectName];
}

export function renameProjectHistory(
  oldProjectName: string,
  newProjectName: string
) {
  const history = getHistory();
  history[newProjectName] = history[oldProjectName];
  delete history[oldProjectName];
  localStorage.setItem(storageKey, JSON.stringify(history));
}

export function deleteProjectHistory(projectName: string) {
  const history = getHistory();
  delete history[projectName];
  localStorage.setItem(storageKey, JSON.stringify(history));
}

export function renameSheetHistory(
  projectName: string,
  oldSheetName: string,
  newSheetName: string
) {
  const history = getProjectHistory(projectName);

  history.forEach((historyItem) => {
    if (historyItem.sheetName === oldSheetName) {
      historyItem.sheetName = newSheetName;
    }
  });

  saveProjectHistory(projectName, history);
}

export function deleteSheetHistory(projectName: string, sheetName: string) {
  let history = getProjectHistory(projectName);

  history = history.filter(
    (historyItem) => historyItem.sheetName !== sheetName
  );

  saveProjectHistory(projectName, history);

  return;
}

export function saveProjectHistory(
  projectName: string,
  history: UndoRedoHistoryState[]
) {
  const historyStr = localStorage.getItem(storageKey);

  if (!historyStr) {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        [projectName]: history,
      })
    );

    return;
  }

  const historyObj: UndoRedoHistory = JSON.parse(historyStr);

  historyObj[projectName] = history;

  localStorage.setItem(storageKey, JSON.stringify(historyObj));

  return;
}

export function appendToProjectHistory(
  projectName: string,
  sheetName: string,
  title: string,
  dsl: string,
  isUpdate = false
) {
  let history = getProjectHistory(projectName);

  if (isUpdate) {
    history[history.length - 1] = { title, time: Date.now(), dsl, sheetName };

    saveProjectHistory(projectName, history);

    return;
  }

  history.push({ title, time: Date.now(), dsl, sheetName });

  if (history.length > maxHistoryDepth) {
    history = history.slice(history.length - maxHistoryDepth);
  }

  saveProjectHistory(projectName, history);

  return;
}

export function removeLastProjectHistoryElement(projectName: string) {
  const history = getProjectHistory(projectName);

  history.pop();

  saveProjectHistory(projectName, history);

  return history.length && history[history.length - 1];
}

export function getLastProjectHistoryDsl(projectName: string) {
  const history = getProjectHistory(projectName);

  return history.length && history[history.length - 1].dsl;
}
