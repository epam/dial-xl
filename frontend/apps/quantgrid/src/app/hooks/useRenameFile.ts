import { useCallback } from 'react';

import {
  appMessages,
  csvFileExtension,
  dialProjectFileExtension,
  schemaFileExtension,
} from '@frontend/common';

import { FileReference } from '../common';
import {
  renameChartKeysProject,
  renameProjectHistory,
  renameRecentProject,
} from '../services';
import { displayToast } from '../utils';
import { useApiRequests } from './useApiRequests';

export function useRenameFile() {
  const { renameFile: renameFileRequest, renameProject: renameProjectRequest } =
    useApiRequests();

  const renameFile = useCallback(
    async ({
      name,
      bucket,
      path,
      newName,
    }: FileReference & { newName: string }) => {
      const initialFileName = name.substring(0, name.lastIndexOf('.'));
      const fileExtension = name.substring(name.lastIndexOf('.'));
      const isProject = fileExtension === dialProjectFileExtension;
      const newFullFileName = newName + fileExtension;
      const res = isProject
        ? await renameProjectRequest({
            fileName: name,
            newFileName: newFullFileName,
            parentPath: path,
            bucket,
          })
        : await renameFileRequest({
            fileName: name,
            newFileName: newFullFileName,
            parentPath: path,
            bucket,
          });

      if (!res) return;

      displayToast(
        'success',
        isProject
          ? appMessages.renameProjectSuccess
          : appMessages.renameFileSuccess
      );

      const isCsvFile = name.endsWith(csvFileExtension);

      if (isCsvFile) {
        const schemaName =
          '.' + name.replaceAll(csvFileExtension, schemaFileExtension);
        const newSchemaName =
          '.' +
          newFullFileName.replaceAll(csvFileExtension, schemaFileExtension);

        await renameFileRequest({
          fileName: schemaName,
          newFileName: newSchemaName,
          parentPath: path,
          bucket,
        });
      }

      if (isProject) {
        renameProjectHistory(initialFileName, newName, bucket, path);
        renameChartKeysProject(initialFileName, newName, bucket, path);
        renameRecentProject(initialFileName, newName, bucket, path);
      }

      return {};
    },
    [renameFileRequest, renameProjectRequest]
  );

  return {
    renameFile,
  };
}
