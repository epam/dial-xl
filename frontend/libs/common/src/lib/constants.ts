export const formulaEditorId = 'formulaEditor';
export const formulaBarInput = 'formulaBarInput';
export const projectTreeId = 'projectTree';
export const overrideKeyFieldMessage =
  'Override of the key field is not supported.';
export const overrideComplexFieldMessage =
  'Override of the field with complex type is not supported.';
export const overrideFilteredOrSortedFieldMessage =
  'Changing sort/filter fields are not allowed for table without key. Please assign keys.';

export const firstRowNum = 1;
export const defaultFieldName = 'Field1';

export const formulaBarMenuClass = 'formula-bar-menu';

export const dialProjectFileExtension = '.qg';
export const csvFileExtension = '.csv';
export const schemaFileExtension = '.schema';
export const emptyFileName = '.file';

export const projectFoldersRootPrefix = 'appdata/xl';
export const csvTempFolder = '.temp';

export const bindConversationsRootFolder = 'xl';

export const publicAdminRole = 'admin';
export const publicBucket = 'public';
export const publicExamplesFolderRootPrefix = 'xl-examples';

export const defaultChartCols = 15;
export const defaultChartRows = 15;

export const apiMessages = {
  generalError:
    'Something happened during request. Please refresh the page and try again.',
  getFilesServer: 'Server error happened during getting files',
  getFilesClient: 'Client error happened during getting files',
  downloadFileServer: 'Server error happened during downloading file',
  downloadFileClient: 'Client error happened during downloading file',
  getSharedByMeFilesServer:
    'Server error happened during getting shared by you files',
  getSharedByMeFilesClient:
    'Client error happened during getting shared by you files',
  getSharedWithMeFilesServer:
    'Server error happened during getting shared with you files',
  getSharedWithMeFilesClient:
    'Client error happened during getting shared with you files',
  getBucketServer: 'Server error happened during receiving bucket.',
  getBucketClient: 'Client error happened during receiving bucket.',
  getProjectServer: 'Server error happened during getting project information.',
  getProjectClient: 'Client error happened during getting project information.',
  putProjectServer:
    'Server error happened during updating project information.',
  putProjectClient:
    'Client error happened during updating project information.',
  putProjectVersion: 'Version of project on server is ahead of yours.',
  putProjectForbidden: 'You are not allowed to edit this project.',
  deleteProjectForbidden: 'You are not allowed to delete this project.',
  deleteProjectServer:
    'Server error happened during deleting project information.',
  deleteProjectClient:
    'Client error happened during deleting project information.',
  deleteFileServer: 'Server error happened during deleting file.',
  deleteFileClient: 'Client error happened during deleting file.',
  deleteFileForbidden: 'You are not allowed to delete this file.',
  deleteFolderSomethingHappened: 'Something happened during deleting folder.',
  createFileServer: 'Server error happened during creating file.',
  createFileClient: 'Client error happened during creating file.',
  shareProjectServer: 'Server error happened during sharing project.',
  shareProjectClient: 'Client error happened during sharing project.',
  revokeResourceServer: 'Server error happened during revoke access.',
  revokeResourceClient: 'Client error happened during revoke access.',
  discardResourceServer:
    'Server error happened during discard shared resource.',
  discardResourceClient:
    'Client error happened during discard shared resource.',
  acceptShareProjectServer:
    'Server error happened during accepting share request project.',
  acceptShareProjectClient:
    'Client error happened during accepting share request project.',
  fileAlreadyExist: 'File already exist.',
  getDimSchemaServer: (formula: string) =>
    `Server error happened during getting dimensional schema information for "${formula}".`,
  getDimSchemaClient: (formula: string) =>
    `Client error happened during getting dimensional schema information for "${formula}".`,
  getFunctionsServer:
    'Server error happened during getting functions information.',
  getFunctionsClient:
    'Client error happened during getting functions information.',
  subscribeToProjectServer:
    'Server error happened during subscribing to project changes.',
  subscribeToProjectClient:
    'Client error happened during subscribing to project changes.',
  computationPower:
    'There is no computation power at the moment. Please try again later.',
  computationClient: 'Client error happened during computation request.',
  computationForbidden: 'Unauthorized computation request.',
  cloneFileServer: 'Server error happened during cloning files',
  cloneFileClient: 'Client error happened during cloning files',
  cloneProjectServer: 'Server error happened during cloning project',
  cloneProjectClient: 'Client error happened during cloning project',
  renameFileServer: 'Server error happened during file rename',
  renameFileClient: 'Client error happened during file rename',
  moveToFolderServer: 'Server error happened during moving files',
  moveToFolderClient: 'Client error happened during moving files',
  createFolderServer: 'Server error happened during creating folder',
  createFolderClient: 'Client error happened during creating folder',
};

export const appMessages = {
  subscribeError: 'Cannot subscribe to project changes.',
  acceptProjectShareRequest: 'Successfully accepted project share request',
  acceptFilesShareRequest: 'Successfully accepted files share request',
  currentProjectRemoved: 'Project you are worked in has been removed',
  versionMismatch:
    'Project version on server is different than yours. Please reload the page to continue working',
  connectionLost: 'Lost connection with server. Trying to reconnect.',
  calculateError:
    'Error happened during getting spreadsheet data. Please refresh the page',
  parseSheetError: 'There was an error while parsing the sheet.',
  shareLinkCreateError:
    'Error happened during gathering info about project to create share links.',
  revokeAccessSuccess: 'Access to resource successfully revoked',
  discardAccessSuccess: 'Access to resource successfully discarded',
  renameFileSuccess: 'File successfully renamed',
  renameProjectSuccess: 'Project successfully renamed',
  projectMoveSuccess: 'Project successfully moved',
  fileMoveSuccess: 'File successfully moved',
  fileCloneSuccess: 'File successfully cloned',
  projectCloneSuccess: (projectToClone: string, newClonedProject: string) =>
    `Project "${projectToClone}" successfully cloned to new project "${newClonedProject}"`,
};
