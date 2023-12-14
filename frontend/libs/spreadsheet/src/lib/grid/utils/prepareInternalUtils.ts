import {
  DEFAULT_HEADER_ROW_HEIGHT,
  DEFAULT_ROW_HEIGHT,
  DEFAULT_ROW_HEIGHT_BY_LEVEL,
  GridItOptions,
  GridItOptionsInternal,
} from '@deltix/grid-it-core';

const applyDefaults = <T>({
  stubs = true,
  resize = true,
  reorder = true,
  autoClose = true,
  columnMenu = true,
  dataRowHeight = DEFAULT_ROW_HEIGHT,
  headerRowHeight = DEFAULT_HEADER_ROW_HEIGHT,
  headerRowHeightByLevel = DEFAULT_ROW_HEIGHT_BY_LEVEL,
  ...options
}: GridItOptions<T>): GridItOptions<T> => ({
  ...options,
  stubs,
  resize,
  reorder,
  autoClose,
  columnMenu,
  dataRowHeight,
  headerRowHeight,
  headerRowHeightByLevel,
});

export const prepareInternalOptions = <T>(
  options: GridItOptions<T>,
  rootElement: HTMLElement
): GridItOptionsInternal<T> => ({
  ...applyDefaults(options),
  getRoot: () => rootElement,
});
