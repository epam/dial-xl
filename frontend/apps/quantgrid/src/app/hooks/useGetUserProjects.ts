import { useCallback } from 'react';

import { ResourceMetadata } from '@frontend/common';

import { cleanUpRecentProjects } from '../services';
import { useApiRequests } from './useApiRequests';

export function useGetUserProjects() {
  const { getFlatUserProjects } = useApiRequests();

  const getAllUserProjects = useCallback(async (): Promise<
    ResourceMetadata[]
  > => {
    const projects = await getFlatUserProjects();

    if (!projects) return [];

    cleanUpRecentProjects(projects);

    return projects;
  }, [getFlatUserProjects]);

  return {
    getAllUserProjects,
  };
}
