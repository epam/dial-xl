import { ParsedDecorator } from '../ParsedDecorator';
import { getLayoutDecorator } from '../parser';

export interface LayoutDecoratorParams {
  row: number;
  col: number;
  isHorizontal: boolean;
  showFieldHeaders: boolean;
  showTableHeader: boolean;
  includeDecoratorName?: boolean;
}

const LayoutGenericParamsKeys = {
  horizontal: 'horizontal',
  title: 'title',
  headers: 'headers',
};

export const getLayoutParams = (
  decorator: ParsedDecorator
): LayoutDecoratorParams => {
  const [row, col, ...layoutArgs] = decorator.params[0] as [
    number,
    number,
    ...string[]
  ];

  let isHorizontal = false;
  let showTableHeader = false;
  let showFieldHeaders = false;

  layoutArgs.forEach((arg) => {
    switch (arg) {
      case LayoutGenericParamsKeys.horizontal:
        isHorizontal = true;
        break;
      case LayoutGenericParamsKeys.title:
        showTableHeader = true;
        break;
      case LayoutGenericParamsKeys.headers:
        showFieldHeaders = true;
        break;
      default:
        break;
    }
  });

  return {
    col,
    row,
    isHorizontal,
    showTableHeader,
    showFieldHeaders,
  };
};

export const updateLayoutDecorator = (
  decorator: ParsedDecorator | undefined,
  params: Partial<LayoutDecoratorParams>
): string => {
  const layoutParams = decorator && getLayoutParams(decorator);

  const isHorizontal =
    params.isHorizontal ?? layoutParams?.isHorizontal
      ? LayoutGenericParamsKeys.horizontal
      : undefined;
  const showTableHeader =
    params.showTableHeader ?? layoutParams?.showTableHeader
      ? LayoutGenericParamsKeys.title
      : undefined;
  const showFieldHeaders =
    params.showFieldHeaders ?? layoutParams?.showFieldHeaders
      ? LayoutGenericParamsKeys.headers
      : undefined;
  const col = params.col ?? layoutParams?.col ?? 1;
  const row = params.row ?? layoutParams?.row ?? 1;
  const includeDecoratorName = params.includeDecoratorName !== false;

  return getLayoutDecorator(
    col,
    row,
    includeDecoratorName,
    [isHorizontal, showTableHeader, showFieldHeaders].filter(
      Boolean
    ) as string[]
  );
};
