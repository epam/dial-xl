export const apiMessages = {
  generalError:
    'Something happened during request. Please refresh the page and try again.',
  getFilesServer: 'Server error happened during getting files',
  getFilesClient: 'Client error happened during getting files',
  downloadFileServer: 'Server error happened during downloading file',
  downloadFileClient: 'Client error happened during downloading file',
  downloadTableServer: 'Server error happened during downloading table data',
  downloadTableClient: 'Client error happened during downloading table data',
  getSharedByMeFilesServer:
    'Server error happened during getting shared by you files',
  getSharedByMeFilesClient:
    'Client error happened during getting shared by you files',
  getSharedWithMeFilesServer:
    'Server error happened during getting shared with you files',
  getSharedWithMeFilesClient:
    'Client error happened during getting shared with you files',
  getSharedWithMeConversationsServer:
    'Server error happened during getting shared with you conversations',
  getSharedWithMeConversationsClient:
    'Client error happened during getting shared with you conversations',
  getBucketServer: 'Server error happened during receiving bucket.',
  getBucketClient: 'Client error happened during receiving bucket.',
  getProjectServer: 'Server error happened during getting project information.',
  getProjectClient: 'Client error happened during getting project information.',
  getControlValuesServer:
    'Server error happened during getting control values.',
  getControlValuesClient:
    'Client error happened during getting control values.',
  getConversationServer:
    'Server error happened during getting conversation information.',
  getConversationClient:
    'Client error happened during getting conversation information.',
  updateConversationServer:
    'Server error happened during updating conversation information.',
  updateConversationClient:
    'Client error happened during updating conversation information.',
  getAIHintsServer: 'Server error happened during getting ai hints.',
  getAIHintsClient: 'Client error happened during getting ai hints.',
  putProjectServer:
    'Server error happened during updating project information.',
  putProjectClient:
    'Client error happened during updating project information.',
  putConversationServer: 'Server error happened during updating conversation.',
  putConversationClient: 'Client error happened during updating conversation.',
  putProjectVersion: 'Version of project on server is ahead of yours.',
  putProjectForbidden: 'You are not allowed to edit this project.',
  putAIHintsServer: 'Server error happened during updating ai hints.',
  putAIHintsClient: 'Client error happened during updating ai hints.',
  putAIHintsVersion: 'Version of ai hints on server is ahead of yours.',
  putAIHintsForbidden: 'You are not allowed to edit ai hints.',
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
  acceptShareProjectNotFoundServer:
    'The share link has expired or does not exist.',
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
  compileClient: 'Client error happened during compile request.',
  compileForbidden: 'Unauthorized compile request.',
  computationPower:
    'There is no computation power at the moment. Please try again later.',
  computationClient: 'Client error happened during computation request.',
  computationForbidden: 'Unauthorized computation request.',
  cloneFileServer: 'Server error happened during cloning files',
  cloneFileClient: 'Client error happened during cloning files',
  getConversationsServer: 'Server error happened during getting conversations',
  cloneConversationsServer:
    'Server error happened during cloning conversations',
  cloneConversationsClient:
    'Client error happened during cloning conversations',
  deleteConversationServer:
    'Server error happened during deleting conversation',
  deleteConversationClient:
    'Client error happened during deleting conversation',
  moveConversationServer: 'Server error happened during moving conversation',
  moveConversationClient: 'Client error happened during moving conversation',
  cloneProjectServer: 'Server error happened during cloning project',
  cloneProjectClient: 'Client error happened during cloning project',
  renameFileServer: 'Server error happened during file rename',
  renameFileClient: 'Client error happened during file rename',
  moveToFolderServer: 'Server error happened during moving files',
  moveToFolderClient: 'Client error happened during moving files',
  createFolderServer: 'Server error happened during creating folder',
  createFolderClient: 'Client error happened during creating folder',
  projectCancelServer:
    'Server error happened during cancelling project long computation',
  projectCancelClient:
    'Client error happened during cancelling project long computation',
  projectCalculateServer:
    'Server error happened during starting project long computation',
  projectCalculateClient:
    'Client error happened during starting project long computation',
  importDefinitionsListServer:
    'Server error happened during listing import definitions',
  importDefinitionsListClient:
    'Client error happened during listing import definitions',
  importDefinitionGetServer:
    'Server error happened during getting import definition',
  importDefinitionGetClient:
    'Client error happened during getting import definition',
  importSourceListServer: 'Server error happened during listing import sources',
  importSourceListClient: 'Client error happened during listing import sources',
  importSourceGetServer: 'Server error happened during getting import source',
  importSourceGetClient: 'Client error happened during getting import source',
  importSourceCreateServer:
    'Server error happened during creating import source',
  importSourceCreateClient:
    'Client error happened during creating import source',
  importSourceUpdateServer:
    'Server error happened during updating import source',
  importSourceUpdateClient:
    'Client error happened during updating import source',
  importSourceDeleteServer:
    'Server error happened during deleting import source',
  importSourceDeleteClient:
    'Client error happened during deleting import source',
  importConnectionTestServer:
    'Server error happened during testing import connection',
  importConnectionTestClient:
    'Client error happened during testing import connection',
  importCatalogListServer:
    'Server error happened during listing import catalog',
  importCatalogListClient:
    'Client error happened during listing import catalog',
  importDatasetDiscoverServer:
    'Server error happened during discovering import dataset',
  importDatasetDiscoverClient:
    'Client error happened during discovering import dataset',
  importSyncListServer: 'Server error happened during listing import syncs',
  importSyncListClient: 'Client error happened during listing import syncs',
  importSyncGetServer: 'Server error happened during getting import sync',
  importSyncGetClient: 'Client error happened during getting import sync',
  importSyncStartServer: 'Server error happened during starting import sync',
  importSyncStartClient: 'Client error happened during starting import sync',
  importSyncCancelServer: 'Server error happened during canceling import sync',
  importSyncCancelClient: 'Client error happened during canceling import sync',
};
