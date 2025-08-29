import {
  bindConversationsRootFolder,
  bindConversationsSharedRootFolder,
} from '@frontend/common';

import { constructPath } from './name';

export const getExportConversationFileName = () => {
  return `DIALXL-conversation-${new Date().toISOString()}.json`;
};

export const getLocalConversationsPath = ({
  userBucket,
  bucket,
  path,
  projectName,
}: {
  userBucket: string | undefined;
  bucket: string | null;
  path: string | null | undefined;
  projectName: string | null;
}) => {
  return constructPath([
    userBucket,
    bindConversationsSharedRootFolder,
    bucket,
    path,
    projectName,
  ]);
};

export const getConversationPath = ({
  bucket,
  path,
  projectName,
}: {
  bucket: string | null;
  path: string | null | undefined;
  projectName: string | null;
}) => {
  return constructPath([
    bucket,
    bindConversationsRootFolder,
    path,
    projectName,
  ]);
};
