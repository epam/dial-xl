export interface Bucket {
  bucket: string;
}

export type ResourcePermission = 'READ' | 'WRITE';

export interface FilesMetadata {
  name: string;
  parentPath: string | null | undefined;
  bucket: string;
  url: string;
  nodeType: 'FOLDER' | 'ITEM';
  permissions?: ResourcePermission[];
  nextToken?: string;
  resourceType: string;
  contentLength?: number;
  contentType?: string;
  updatedAt?: number;
  items?: FilesMetadata[];
}

export type QGDialProject = Record<string, string>;
