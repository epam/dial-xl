import { useCallback } from 'react';
import { toast } from 'react-toastify';

import {
  appMessages,
  csvFileExtension,
  dialProjectFileExtension,
  schemaFileExtension,
} from '@frontend/common';

import { FileReference } from '../common';
import { renameProjectHistory, renameRecentProject } from '../services';
import { displayToast } from '../utils';
import { useApiRequests } from './useApiRequests';

export function useRenameFile() {
  const {
    renameFile: renameFileRequest,
    renameProject: renameProjectRequest,
    deleteFile: deleteFileRequest,
  } = useApiRequests();

  const renameFile = useCallback(
    async ({
      name,
      bucket,
      parentPath,
      newName,
      newNameIsFull = false,
    }: FileReference & {
      newName: string;
      newNameIsFull?: boolean;
    }) => {
      toast.loading(`Renaming ${name}...`, { toastId: 'loading' });

      const initialFileName = name.substring(0, name.lastIndexOf('.'));
      const fileExtension = name.substring(name.lastIndexOf('.'));
      const isProject = fileExtension === dialProjectFileExtension;
      const newFullFileName = newNameIsFull ? newName : newName + fileExtension;
      const res = isProject
        ? await renameProjectRequest({
            fileName: name,
            newFileName: newFullFileName,
            parentPath,
            bucket,
          })
        : await renameFileRequest({
            fileName: name,
            newFileName: newFullFileName,
            parentPath,
            bucket,
          });

      if (!res) {
        toast.dismiss('loading');

        return;
      }

      const isCsvFile = name.endsWith(csvFileExtension);
      const isNewCsvFile = newFullFileName.endsWith(csvFileExtension);

      if (isCsvFile) {
        const schemaName =
          '.' + name.replaceAll(csvFileExtension, schemaFileExtension);
        const newSchemaName =
          '.' +
          newFullFileName.replaceAll(csvFileExtension, schemaFileExtension);

        if (isNewCsvFile) {
          await renameFileRequest({
            fileName: schemaName,
            newFileName: newSchemaName,
            parentPath,
            bucket,
          });
        } else {
          await deleteFileRequest({
            fileName: schemaName,
            parentPath,
            bucket,
          });
        }
      }

      if (isProject) {
        renameProjectHistory(initialFileName, newName, bucket, parentPath);
        renameRecentProject(initialFileName, newName, bucket, parentPath);
      }

      toast.dismiss('loading');
      displayToast(
        'success',
        isProject
          ? appMessages.renameProjectSuccess
          : appMessages.renameFileSuccess
      );

      return {};
    },
    [renameFileRequest, renameProjectRequest, deleteFileRequest]
  );

  return {
    renameFile,
  };
}
