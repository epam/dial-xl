import { FilesMetadata } from '@frontend/common';

export type DashboardItem = Pick<
  FilesMetadata,
  'name' | 'nodeType' | 'parentPath' | 'bucket' | 'updatedAt'
> & {
  contentLength?: number;
  isSharedByMe?: boolean;
};
