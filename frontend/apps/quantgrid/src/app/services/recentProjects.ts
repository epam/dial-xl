const storageKey = 'recentProjects';

export type RecentProjects = {
  [projectName: string]: {
    sheetName: string;
    timestamp: number;
  };
};

export type RecentProject = {
  projectName: string;
  sheetName: string;
  timestamp: number;
};

export const cleanUpRecentProjects = (projectList: string[]) => {
  const recentProjects = getRecentProjectsData();

  Object.keys(recentProjects).forEach((projectName) => {
    if (!projectList.includes(projectName)) {
      delete recentProjects[projectName];
    }
  });

  saveRecentProjects(recentProjects);
};

export const renameRecentProject = (
  oldProjectName: string,
  newProjectName: string
) => {
  const recentProjects = getRecentProjectsData();

  if (recentProjects[oldProjectName]) {
    recentProjects[newProjectName] = recentProjects[oldProjectName];
    recentProjects[newProjectName].timestamp = Date.now();
    delete recentProjects[oldProjectName];
  }

  saveRecentProjects(recentProjects);
};

export const addRecentProject = (projectName: string, sheetName: string) => {
  const recentProjects = getRecentProjectsData();
  recentProjects[projectName] = {
    sheetName,
    timestamp: Date.now(),
  };

  const sortedProjects = Object.keys(recentProjects).sort((a, b) => {
    return recentProjects[b].timestamp - recentProjects[a].timestamp;
  });

  sortedProjects.slice(5).forEach((projectName) => {
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
    .map((projectName) => {
      const item = recentProjects[projectName];

      return {
        projectName,
        sheetName: item.sheetName,
        timestamp: item.timestamp,
      };
    });
};

export const getRecentProjectsData = (): RecentProjects => {
  const recentProjects = localStorage.getItem(storageKey);

  return recentProjects ? JSON.parse(recentProjects) : {};
};

const saveRecentProjects = (recentProjects: RecentProjects) => {
  localStorage.setItem(storageKey, JSON.stringify(recentProjects));
};
