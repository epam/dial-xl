import { constructPath } from '../utils';

const storageKey = 'selectedConversations';

interface SelectedConversations {
  [projectFullPath: string]: string[];
}

const getAllProjectsSelectedConversations = (): SelectedConversations => {
  try {
    const data = localStorage.getItem(storageKey);

    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

export const getProjectSelectedConversations = (
  projectName: string,
  projectBucket: string,
  projectPath: string | null | undefined
): string[] => {
  const fullProjectPath = constructPath([
    projectBucket,
    projectPath,
    projectName,
  ]);
  const allProjectsSelectedConversations =
    getAllProjectsSelectedConversations();

  return allProjectsSelectedConversations[fullProjectPath] ?? [];
};

export const setSelectedConversations = (
  selectedConversations: string[],
  projectName: string,
  projectBucket: string,
  projectPath: string | null | undefined
) => {
  try {
    const currentData = getAllProjectsSelectedConversations();
    const fullProjectPath = constructPath([
      projectBucket,
      projectPath,
      projectName,
    ]);

    currentData[fullProjectPath] = selectedConversations;

    localStorage.setItem(storageKey, JSON.stringify(currentData));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
  }
};
