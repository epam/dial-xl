import { dialProjectFileExtension, FilesMetadata } from '@frontend/common';

const storageKey = 'recentProjectsItems';

export type RecentProjects = {
  [projectFullPath: string]: {
    projectName: string;
    projectBucket: string;
    projectPath: string | null | undefined;
    sheetName: string;
    timestamp: number;
  };
};

export type RecentProject = {
  projectName: string;
  projectBucket: string;
  projectPath: string | null | undefined;
  sheetName: string;
  timestamp: number;
};

export const cleanUpRecentProjects = (projectList: FilesMetadata[]) => {
  const recentProjects = getRecentProjectsData();

  Object.keys(recentProjects).forEach((fullProjectPath) => {
    const recentProjectInStorage = projectList.find((project) => {
      const fullItemPrePath = `${project.bucket}/${
        project.parentPath ? project.parentPath + '/' : ''
      }`;
      const projectFullPath = fullItemPrePath + project.name;

      return projectFullPath === fullProjectPath + dialProjectFileExtension;
    });

    if (!recentProjectInStorage) {
      delete recentProjects[fullProjectPath];
    }
  });

  saveRecentProjects(recentProjects);
};

export const deleteRecentProjectFromRecentProjects = (
  projectName: string,
  projectBucket: string,
  projectPath: string | null | undefined
) => {
  const recentProjects = getRecentProjectsData();
  const fullItemPrePath = `${projectBucket}/${
    projectPath ? projectPath + '/' : ''
  }`;

  if (recentProjects[fullItemPrePath + projectName]) {
    delete recentProjects[fullItemPrePath + projectName];
  }

  saveRecentProjects(recentProjects);
};

export const renameRecentProject = (
  oldProjectName: string,
  newProjectName: string,
  bucket: string,
  path?: string | null
) => {
  const recentProjects = getRecentProjectsData();
  const fullItemPrePath = `${bucket}/${path ? path + '/' : ''}`;

  if (recentProjects[fullItemPrePath + oldProjectName]) {
    recentProjects[fullItemPrePath + newProjectName] =
      recentProjects[fullItemPrePath + oldProjectName];
    recentProjects[fullItemPrePath + newProjectName].timestamp = Date.now();
    delete recentProjects[fullItemPrePath + oldProjectName];
  }

  saveRecentProjects(recentProjects);
};

export const addRecentProject = (
  sheetName: string,
  projectName: string,
  projectBucket: string,
  projectPath: string | null | undefined
) => {
  const recentProjects = getRecentProjectsData();
  const fullItemPrePath = `${projectBucket}/${
    projectPath ? projectPath + '/' : ''
  }`;
  recentProjects[fullItemPrePath + projectName] = {
    sheetName,
    timestamp: Date.now(),
    projectName,
    projectBucket,
    projectPath,
  };

  const sortedProjects = Object.keys(recentProjects).sort((a, b) => {
    return recentProjects[b].timestamp - recentProjects[a].timestamp;
  });

  sortedProjects.slice(10).forEach((projectName) => {
    delete recentProjects[projectName];
  });

  saveRecentProjects(recentProjects);
};

export const getRecentProjects = (): RecentProject[] => {
  const recentProjects = getRecentProjectsData();

  return Object.keys(recentProjects)
    .sort((a, b) => {
      return recentProjects[b].timestamp - recentProjects[a].timestamp;
    })
    .map((projectFullPath) => {
      const item = recentProjects[projectFullPath];

      return {
        projectName: item.projectName,
        projectBucket: item.projectBucket,
        projectPath: item.projectPath,
        sheetName: item.sheetName,
        timestamp: item.timestamp,
      };
    });
};

export const getRecentProjectsData = (): RecentProjects => {
  try {
    const recentProjects = localStorage.getItem(storageKey);

    return recentProjects ? JSON.parse(recentProjects) : {};
  } catch {
    return {};
  }
};

const saveRecentProjects = (recentProjects: RecentProjects) => {
  localStorage.setItem(storageKey, JSON.stringify(recentProjects));
};
