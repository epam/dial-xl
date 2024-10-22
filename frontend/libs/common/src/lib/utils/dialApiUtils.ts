import { FilesMetadata } from '../services';

export function getFileParentPath(fileMetadata: FilesMetadata): string {
  return `files/${fileMetadata.bucket}/${
    fileMetadata.parentPath ? fileMetadata.parentPath + '/' : ''
  }`;
}
export function getBaseFilesURL(fileMetadata: FilesMetadata): string {
  return `files/${fileMetadata.bucket}/`;
}
export function getFileFoldersPath(fileMetadata: FilesMetadata): string {
  return `${fileMetadata.parentPath ? fileMetadata.parentPath + '/' : ''}${
    fileMetadata.name
  }`;
}
