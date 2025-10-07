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

export interface CommonMetadata {
  name: string;
  parentPath: string | null | undefined;
  bucket: string;
  url: string;
  nodeType: MetadataNodeType;
  resourceType: MetadataResourceType;
  permissions?: ResourcePermission[];
  items: CommonMetadata[] | undefined | null;
}

export type ResourceMetadata = CommonMetadata & {
  nextToken?: string;
  contentLength: number;
  contentType: string;
  updatedAt: number;
  items: ResourceMetadata[] | undefined | null;
};

// types optional, because old shared didn't have this information
export type SharedWithMeMetadata = CommonMetadata & {
  author?: string;
  sharedBy?: {
    permissions: ResourcePermission[];
    user: string;
    acceptedAt?: number;
  }[];
  items: SharedWithMeMetadata[] | undefined | null;
};

export type SharedByMeMetadata = CommonMetadata & {
  sharedWith: {
    permissions: ResourcePermission[];
    user: string;
  }[];
  items: SharedByMeMetadata[] | undefined | null;
};

export type QGDialProject = Record<string, string>;
