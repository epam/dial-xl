import {
  conversationsEndpointType,
  dialProjectFileExtension,
  MetadataNodeType,
  MetadataResourceType,
  ResourceMetadata,
} from '@frontend/common';

export const notAllowedSymbols = ':;,=/{}%&"';

export const notAllowedSymbolsRegexStr = `[${notAllowedSymbols}]|(\r\n|\n|\r|\t)|[\x00-\x1F]`;

export const doesHaveDotsInTheEnd = (name: string) => name.trim().endsWith('.');

export const isEntityNameInvalid = (
  name: string,
  skipDotInTheEndCheck = false
) => {
  const regexp = new RegExp(notAllowedSymbolsRegexStr, 'gm');

  return skipDotInTheEndCheck
    ? regexp.test(name)
    : doesHaveDotsInTheEnd(name) || regexp.test(name);
};

export const hasInvalidNameInPath = (path: string) =>
  path.split('/').some((part) => isEntityNameInvalid(part));

export const safeEncodeURIComponent = (urlComponent: string) =>
  // eslint-disable-next-line no-misleading-character-class
  urlComponent.replace(/[^\uD800-\uDBFF\uDC00-\uDFFF]+/gm, (match) =>
    encodeURIComponent(match)
  );

export const encodeApiUrl = (path: string): string =>
  path
    .split('/')
    .map((part) => safeEncodeURIComponent(part))
    .join('/');

export const decodeApiUrl = (path: string): string =>
  path
    .split('/')
    .map((part) => decodeURIComponent(part))
    .join('/');

export const constructPath = (elements: (string | null | undefined)[]) => {
  return elements.filter(Boolean).join('/');
};

export const convertUrlToMetadata = (
  url: string
):
  | Pick<
      ResourceMetadata,
      'bucket' | 'name' | 'resourceType' | 'nodeType' | 'parentPath' | 'url'
    >
  | undefined => {
  const [resourceType, bucket, ...pathWithName] = decodeApiUrl(url)
    .split('/')
    .filter(Boolean);
  const path = pathWithName.slice(0, -1).join('/');
  const name = pathWithName[pathWithName.length - 1];

  if (!name || !bucket || !resourceType) return;

  const resultingType: ResourceMetadata['resourceType'] =
    resourceType === conversationsEndpointType
      ? MetadataResourceType.CONVERSATION
      : MetadataResourceType.FILE;

  return {
    name,
    resourceType: resultingType,
    bucket,
    parentPath: path,
    url,
    nodeType: url.endsWith('/')
      ? MetadataNodeType.FOLDER
      : MetadataNodeType.ITEM,
  };
};

export const isProjectMetadata = (
  meta: Pick<ResourceMetadata, 'resourceType' | 'nodeType' | 'name'>
) => {
  return (
    meta.resourceType === MetadataResourceType.FILE &&
    meta.nodeType === MetadataNodeType.ITEM &&
    meta.name.endsWith(dialProjectFileExtension)
  );
};
