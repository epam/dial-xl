import { useCallback } from 'react';
import { toast } from 'react-toastify';

import {
  appMessages,
  csvFileExtension,
  dialProjectFileExtension,
  schemaFileExtension,
} from '@frontend/common';

import { FileReference } from '../common';
import { WithCustomProgressBar } from '../components';
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
      const initialFileName = name.substring(0, name.lastIndexOf('.'));
      const fileExtension = name.substring(name.lastIndexOf('.'));
      const isProject = fileExtension === dialProjectFileExtension;
      const newFullFileName = newNameIsFull ? newName : newName + fileExtension;

      const renamingToast = toast(WithCustomProgressBar, {
        customProgressBar: true,
        data: {
          message: isProject ? `Renaming project...` : `Renaming ${name}...`,
        },
        progress: 0,
      });

      const res = isProject
        ? await renameProjectRequest({
            fileName: name,
            newFileName: newFullFileName,
            parentPath,
            bucket,
            onProgress: (progress: number) => {
              toast.update(renamingToast, {
                progress: progress / 100,
              });
            },
          })
        : await renameFileRequest({
            fileName: name,
            newFileName: newFullFileName,
            parentPath,
            bucket,
          });

      if (!res.success) {
        toast.dismiss(renamingToast);

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

      toast.dismiss(renamingToast);
      displayToast(
        'success',
        isProject
          ? appMessages.renameProjectSuccess
          : appMessages.renameFileSuccess,
      );

      return {};
    },
    [renameFileRequest, renameProjectRequest, deleteFileRequest],
  );

  return {
    renameFile,
  };
}
