export const notAllowedSymbols = ':;,=/{}%&"';

export const notAllowedSymbolsRegexStr = `[${notAllowedSymbols}]|(\r\n|\n|\r|\t)|[\x00-\x1F]`;

export const doesHaveDotsInTheEnd = (name: string) => name.trim().endsWith('.');

export const isEntityNameInvalid = (name: string) => {
  const regexp = new RegExp(notAllowedSymbolsRegexStr, 'gm');

  return doesHaveDotsInTheEnd(name) || regexp.test(name);
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
