export interface Bucket {
  bucket: string;
}

export type ResourcePermission = 'READ' | 'WRITE' | 'SHARE';

export enum MetadataNodeType {
  FOLDER = 'FOLDER',
  ITEM = 'ITEM',
}

export enum MetadataResourceType {
  FILE = 'FILE',
  CONVERSATION = 'CONVERSATION',
}

export type FilesMetadata = {
  name: string;
  parentPath: string | null | undefined;
  bucket: string;
  url: string;
  nodeType: MetadataNodeType;
  permissions?: ResourcePermission[];
  nextToken?: string;
  resourceType: MetadataResourceType;
  contentLength?: number;
  contentType?: string;
  updatedAt?: number;
  items?: FilesMetadata[];
};

export type QGDialProject = Record<string, string>;
