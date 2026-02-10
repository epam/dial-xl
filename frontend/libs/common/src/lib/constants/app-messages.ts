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
    'Error happened during gathering info about resources to create share links.',
  shareNotAllowedError:
    'Some of the resources you are trying to share is not allowed to be shared. You can clone the project and share it instead',
  revokeAccessSuccess: 'Access to resource successfully revoked',
  discardAccessSuccess: 'Access to resource successfully discarded',
  renameFileSuccess: 'File successfully renamed',
  renameProjectSuccess: 'Project successfully renamed',
  projectMoveSuccess: 'Project successfully moved',
  fileMoveSuccess: 'File(s) successfully moved',
  fileCloneSuccess: 'File(s) successfully cloned',
  resetProjectError: 'Error happened during resetting project',
  resetProjectSuccess: 'Project successfully reset to the base project',
  projectCloneSuccess: (projectToClone: string, newClonedProject: string) =>
    `Project "${projectToClone}" successfully cloned to new project "${newClonedProject}"`,
  fileUploadSchemaError: (fileName: string, errorMessage: string) =>
    `Getting error for ${fileName}: "${errorMessage}".`,
};
